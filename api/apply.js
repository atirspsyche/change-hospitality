import path from 'node:path';
import { createClient } from '@sanity/client';
import Busboy from 'busboy';
import { MailConfigurationError, sendEmail, acceptedRecipient, confirmMailAcceptance, logMailFailure } from '../server/mail.js';
import { getSanityConfig } from '../server/sanity-config.js';
import { cleanString, createReference, isEmailAddress, validateTextLengths, RequestError, checkRequestSize, requestContentType } from '../server/form-utils.js';
import { renderEmailTemplate } from '../server/email-template.js';
import { MAX_RESUME_SIZE, RESUME_MIME_TYPES, detectedResumeExtension } from '../server/resume.js';

const MAX_REQUEST_SIZE = 4_400_000;
const ALLOWED_NATIONALITIES = new Set(['British', 'EU', 'Other']);

const sanityClient = createClient({ ...getSanityConfig(process.env), timeout: 10_000, maxRetries: 0 });

function safeFilename(filename) {
  return path.basename(filename || 'cv').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
}

function parseMultipartRequest(request) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({
        headers: request.headers,
        limits: {
          fieldNameSize: 100,
          fieldSize: 2_000,
          fields: 16,
          files: 1,
          // Busboy emits its limit event at equality; one extra byte makes 4 MiB inclusive.
          fileSize: MAX_RESUME_SIZE + 1,
          parts: 18,
        },
      });
    } catch {
      reject(new RequestError(400, 'The application form could not be read.'));
      return;
    }

    const fields = Object.create(null);
    let resume = null;
    let parseError = null;
    let settled = false;
    let receivedBytes = 0;
    const cleanup = () => {
      clearTimeout(deadline);
      request.unpipe?.(parser);
      request.removeListener?.('data', onData);
      request.removeListener?.('aborted', onAborted);
      request.removeListener?.('error', onRequestError);
      request.removeListener?.('close', onClose);
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        parser.destroy(error);
        request.resume?.();
        reject(error);
      } else resolve({ fields, resume });
    };
    const onData = (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_REQUEST_SIZE) finish(new RequestError(413, 'Submission is too large.'));
    };
    const onAborted = () => finish(new RequestError(400, 'The upload was interrupted. Please choose your CV again.'));
    const onRequestError = () => finish(new RequestError(400, 'The application upload could not be read.'));
    const onClose = () => {
      if (!request.readableEnded && !request.complete) onAborted();
    };
    const deadline = setTimeout(() => finish(new RequestError(408, 'The upload took too long. Please try again.')), 20_000);

    parser.on('field', (name, value, info) => {
      if (info.nameTruncated || info.valueTruncated) {
        parseError ||= new RequestError(413, 'One or more application fields are too large.');
        return;
      }
      if (Object.hasOwn(fields, name)) {
        parseError ||= new RequestError(422, 'Application fields must not be repeated.');
        return;
      }
      fields[name] = value;
    });

    parser.on('file', (name, stream, info) => {
      if (name !== 'resume') {
        parseError ||= new RequestError(422, 'Only one CV file may be uploaded.');
        stream.resume();
        return;
      }

      const chunks = [];
      let size = 0;
      let wasTruncated = false;

      stream.on('limit', () => {
        wasTruncated = true;
        parseError ||= new RequestError(413, 'Please upload a CV no larger than 4MB.');
      });
      stream.on('data', (chunk) => {
        if (wasTruncated) return;
        size += chunk.length;
        chunks.push(chunk);
      });
      stream.on('error', () => {
        finish(new RequestError(400, 'The uploaded CV could not be read.'));
      });
      stream.on('end', () => {
        if (wasTruncated) return;
        resume = {
          filename: safeFilename(info.filename),
          size,
          content: Buffer.concat(chunks, size),
        };
      });
    });

    parser.on('filesLimit', () => {
      parseError ||= new RequestError(422, 'Only one CV file may be uploaded.');
    });
    parser.on('fieldsLimit', () => {
      parseError ||= new RequestError(413, 'The application contains too many fields.');
    });
    parser.on('partsLimit', () => {
      parseError ||= new RequestError(413, 'The application contains too many parts.');
    });
    parser.on('error', () => {
      finish(new RequestError(400, 'The application form could not be read.'));
    });
    parser.on('close', () => {
      finish(parseError);
    });

    if (request.aborted || request.destroyed) return onAborted();
    if (Buffer.isBuffer(request.body)) {
      if (request.body.length > MAX_REQUEST_SIZE) finish(new RequestError(413, 'Submission is too large.'));
      else parser.end(request.body);
    } else if (typeof request.pipe === 'function') {
      request.on('data', onData);
      request.once('aborted', onAborted);
      request.once('error', onRequestError);
      request.once('close', onClose);
      request.pipe(parser);
    } else finish(new RequestError(400, 'The application form could not be read.'));
  });
}

export async function validateApplication(fields, resume) {
  const data = {
    jobId: cleanString(fields.jobId, 80),
    jobSlug: cleanString(fields.jobSlug, 120),
    consultantId: cleanString(fields.consultantId, 120),
    name: cleanString(fields.name, 160),
    email: cleanString(fields.email, 254).toLowerCase(),
    phone: cleanString(fields.phone, 40),
    nationality: cleanString(fields.nationality, 20),
    visaStatus: cleanString(fields.visaStatus, 160),
    idealLocation: cleanString(fields.idealLocation, 180),
    consent: ['on', 'true', '1', 'yes'].includes(cleanString(fields.consent, 10).toLowerCase()),
    website: cleanString(fields.website, 200),
  };
  const errors = {};

  if (!data.jobId || !data.jobSlug || !data.consultantId) errors.job = 'This job could not be identified.';
  if (data.jobId.startsWith('TEST-') || data.jobSlug.startsWith('test-')) errors.job = 'Sample vacancies do not accept applications.';
  if (!data.name) errors.name = 'Enter your name.';
  if (!isEmailAddress(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.phone) errors.phone = 'Enter a contact number.';
  if (!ALLOWED_NATIONALITIES.has(data.nationality)) errors.nationality = 'Choose your nationality.';
  if (data.nationality === 'Other' && !data.visaStatus) errors.visaStatus = 'Enter your visa status.';
  if (!data.idealLocation) errors.idealLocation = 'Enter your ideal work location.';
  if (!data.consent) errors.consent = 'Confirm that we may review your application.';
  validateTextLengths(fields, {
    jobId: 80, jobSlug: 120, consultantId: 120, name: 160, email: 254,
    phone: 40, nationality: 20, visaStatus: 160, idealLocation: 180, website: 200,
  }, errors);

  if (!resume?.filename || !resume.content?.length) {
    errors.resume = 'Upload your CV.';
  } else {
    const extension = path.extname(resume.filename).slice(1).toLowerCase();
    const detectedExtension = await detectedResumeExtension(resume.content);
    if (!Object.hasOwn(RESUME_MIME_TYPES, extension) || detectedExtension !== extension) {
      errors.resume = 'Upload a valid PDF, DOC or DOCX file.';
    }
  }

  return { data, errors };
}

export async function resolveApplicationJob(data) {
  return sanityClient.fetch(
    `*[
      _type == "job" &&
      !(_id in path("drafts.**")) &&
      jobId == $jobId &&
      slug.current == $jobSlug &&
      consultant._ref == $consultantId
    ][0] {
      jobId,
      role,
      position,
      location,
      "consultant": consultant->{ _id, name, email }
    }`,
    {
      jobId: data.jobId,
      jobSlug: data.jobSlug,
      consultantId: data.consultantId,
    },
  );
}

function renderApplicationEmail(data, job, reference) {
  const values = [
    ['Reference', reference],
    ['Candidate', data.name],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Nationality', data.nationality],
    ['Visa status', data.visaStatus || 'Not applicable'],
    ['Ideal location', data.idealLocation],
    ['Job', `${job.role} (${job.jobId})`],
    ['Job location', job.location],
    ['Division', job.position],
    ['Consultant', job.consultant?.name || 'Recruitment team'],
  ];
  const text = values.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = renderEmailTemplate({
    eyebrow: `New job application / ${reference}`,
    title: job.role,
    rows: values,
    accent: 'mint',
  });

  return { html, text };
}

function applicationRecipients(job, environment) {
  const consultantEmail = cleanString(job.consultant?.email, 254).toLowerCase();
  const archiveInbox = cleanString(environment.APPLICATIONS_INBOX, 254).toLowerCase();
  const consultantIsValid = isEmailAddress(job.consultant?.email?.trim()) && isEmailAddress(consultantEmail);
  const archiveIsValid = isEmailAddress(environment.APPLICATIONS_INBOX?.trim()) && isEmailAddress(archiveInbox);
  if (environment.APPLICATIONS_INBOX && !archiveIsValid) {
    throw new MailConfigurationError('APPLICATIONS_INBOX is invalid.');
  }

  if (!consultantIsValid && !archiveIsValid) {
    throw new MailConfigurationError('No valid application recipient is configured.');
  }

  const to = consultantIsValid ? consultantEmail : archiveInbox;
  const bcc = archiveIsValid && archiveInbox !== to ? archiveInbox : undefined;
  return { to, bcc };
}

export default async function handler(request, response, dependencies = {}) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  if (requestContentType(request) !== 'multipart/form-data') {
    return response.status(415).json({ ok: false, message: 'Content type must be multipart/form-data.' });
  }

  let parsed;
  try {
    checkRequestSize(request, MAX_REQUEST_SIZE);
    parsed = await parseMultipartRequest(request);
  } catch (error) {
    if (!(error instanceof RequestError)) throw error;
    return response.status(error.status).json({ ok: false, message: error.message });
  }

  const reference = createReference('APP');
  if (cleanString(parsed.fields.website, 200)) {
    return response.status(202).json({ ok: true, reference, message: 'Your application has been received.' });
  }

  const { data, errors } = await validateApplication(parsed.fields, parsed.resume);
  if (Object.keys(errors).length) {
    return response.status(422).json({
      ok: false,
      message: 'Please check your application details and CV.',
      errors,
    });
  }

  const resolveJob = dependencies.resolveJob || resolveApplicationJob;
  let job;
  try {
    job = await resolveJob(data);
  } catch (error) {
    logMailFailure('application-job-lookup', reference, error);
    return response.status(502).json({
      ok: false,
      message: 'We could not confirm this role. Please try again shortly.',
    });
  }

  if (!job) {
    return response.status(422).json({
      ok: false,
      message: 'This role is no longer available for applications.',
    });
  }

  const mailer = dependencies.sendMail || sendEmail;
  let confirmation;
  try {
    const recipients = applicationRecipients(job, process.env);
    const email = renderApplicationEmail(data, job, reference);
    const result = await mailer({
      ...recipients,
      replyTo: data.email,
      subject: `Application: ${job.role} - ${data.name}`,
      text: email.text,
      html: email.html,
      attachments: [{
        filename: parsed.resume.filename,
        content: parsed.resume.content,
        contentType: RESUME_MIME_TYPES[path.extname(parsed.resume.filename).slice(1).toLowerCase()],
      }],
      headers: { 'X-Change-Hospitality-Reference': reference },
    });
    confirmMailAcceptance(result, [recipients.to, recipients.bcc].filter(Boolean));
    const consultantAccepted = acceptedRecipient(result, job.consultant?.email?.trim());
    if (!result.redirected && (!consultantAccepted || (recipients.bcc && !acceptedRecipient(result, recipients.bcc)))) {
      console.error('Application recipient requires follow-up.', {
        reference, consultantAccepted, archiveAccepted: acceptedRecipient(result, process.env.APPLICATIONS_INBOX?.trim()),
      });
    }
    confirmation = result.redirected
      ? 'Test submission accepted by the preview inbox. No email was sent to the recruitment team.'
      : consultantAccepted
        ? `Your application has been sent to ${job.consultant?.name || 'our recruitment team'}.`
        : 'Your application has been sent to our recruitment team.';
  } catch (error) {
    logMailFailure('application', reference, error);
    if (error instanceof MailConfigurationError) {
      return response.status(503).json({
        ok: false,
        message: 'Email delivery is temporarily unavailable. Please contact the recruitment team directly.',
      });
    }

    return response.status(502).json({
      ok: false,
      reference,
      message: 'We could not confirm receipt of your application. Please contact the recruitment team with this reference before resubmitting.',
    });
  }

  return response.status(202).json({
    ok: true,
    reference,
    message: confirmation,
  });
}