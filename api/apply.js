import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@sanity/client';
import Busboy from 'busboy';
import { MailConfigurationError, sendEmail } from '../server/mail.js';

const MAX_RESUME_SIZE = 4 * 1024 * 1024;
const MAX_REQUEST_SIZE = 4_400_000;
const ALLOWED_NATIONALITIES = new Set(['British', 'EU', 'Other']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanityClient = createClient({
  projectId: '3z2hqf8g',
  dataset: 'production',
  apiVersion: '2026-09-08',
  useCdn: false,
});

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

function cleanString(value, maxLength = 180) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `CH-APP-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function safeFilename(filename) {
  return path.basename(filename || 'cv').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
}

function detectedResumeExtension(content) {
  if (content.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';

  const compoundDocumentSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (content.subarray(0, 8).equals(compoundDocumentSignature)) return 'doc';

  const isZip = content[0] === 0x50 && content[1] === 0x4b && [0x03, 0x05, 0x07].includes(content[2]);
  if (isZip && content.includes(Buffer.from('word/'))) return 'docx';

  return '';
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
          fileSize: MAX_RESUME_SIZE,
          parts: 18,
        },
      });
    } catch {
      reject(new RequestError(400, 'The application form could not be read.'));
      return;
    }

    const fields = {};
    let resume = null;
    let parseError = null;

    parser.on('field', (name, value, info) => {
      if (info.nameTruncated || info.valueTruncated) {
        parseError ||= new RequestError(413, 'One or more application fields are too large.');
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
        parseError ||= new RequestError(400, 'The uploaded CV could not be read.');
      });
      stream.on('end', () => {
        if (wasTruncated) return;
        resume = {
          filename: safeFilename(info.filename),
          mimeType: info.mimeType,
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
      reject(new RequestError(400, 'The application form could not be read.'));
    });
    parser.on('close', () => {
      if (parseError) reject(parseError);
      else resolve({ fields, resume });
    });

    if (Buffer.isBuffer(request.body)) parser.end(request.body);
    else if (typeof request.pipe === 'function') request.pipe(parser);
    else reject(new RequestError(400, 'The application form could not be read.'));
  });
}

export function validateApplication(fields, resume) {
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
  if (!data.name) errors.name = 'Enter your name.';
  if (!EMAIL_PATTERN.test(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.phone) errors.phone = 'Enter a contact number.';
  if (!ALLOWED_NATIONALITIES.has(data.nationality)) errors.nationality = 'Choose your nationality.';
  if (data.nationality === 'Other' && !data.visaStatus) errors.visaStatus = 'Enter your visa status.';
  if (!data.idealLocation) errors.idealLocation = 'Enter your ideal work location.';
  if (!data.consent) errors.consent = 'Confirm that we may review your application.';

  if (!resume?.filename || !resume.content?.length) {
    errors.resume = 'Upload your CV.';
  } else {
    const extension = path.extname(resume.filename).slice(1).toLowerCase();
    const detectedExtension = detectedResumeExtension(resume.content);
    if (!['pdf', 'doc', 'docx'].includes(extension) || detectedExtension !== extension) {
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
  const rows = values
    .map(([label, value]) => `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #d9d3cd;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #d9d3cd">${escapeHtml(value)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ef;color:#1d1d1b;font-family:Arial,sans-serif"><div style="margin:0 auto;max-width:680px;padding:32px 20px"><div style="background:#c9dfd2;padding:24px;border-radius:8px 8px 0 0"><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase">New job application / ${escapeHtml(reference)}</p><h1 style="margin:0;font-size:30px;line-height:1.1">${escapeHtml(job.role)}</h1></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border-collapse:collapse">${rows}</table></div></body></html>`;

  return { html, text };
}

function applicationRecipients(job, environment) {
  const consultantEmail = cleanString(job.consultant?.email, 254).toLowerCase();
  const archiveInbox = cleanString(environment.APPLICATIONS_INBOX, 254).toLowerCase();
  const consultantIsValid = EMAIL_PATTERN.test(consultantEmail);
  const archiveIsValid = EMAIL_PATTERN.test(archiveInbox);

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

  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return response.status(415).json({ ok: false, message: 'Content type must be multipart/form-data.' });
  }

  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return response.status(413).json({ ok: false, message: 'Please upload a CV no larger than 4MB.' });
  }

  let parsed;
  try {
    parsed = await parseMultipartRequest(request);
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'The application form could not be read.';
    return response.status(status).json({ ok: false, message });
  }

  const reference = createReference();
  if (cleanString(parsed.fields.website, 200)) {
    return response.status(202).json({ ok: true, reference, message: 'Your application has been received.' });
  }

  const { data, errors } = validateApplication(parsed.fields, parsed.resume);
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
    console.error('Sanity lookup failed for a job application:', error);
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
  try {
    const recipients = applicationRecipients(job, process.env);
    const email = renderApplicationEmail(data, job, reference);
    await mailer({
      ...recipients,
      replyTo: data.email,
      subject: `Application: ${job.role} - ${data.name}`,
      text: email.text,
      html: email.html,
      attachments: [{
        filename: parsed.resume.filename,
        content: parsed.resume.content,
        contentType: parsed.resume.mimeType,
      }],
      headers: { 'X-Change-Hospitality-Reference': reference },
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      console.error('Application email configuration is incomplete:', error.message);
      return response.status(503).json({
        ok: false,
        message: 'Email delivery is temporarily unavailable. Please contact the recruitment team directly.',
      });
    }

    console.error('SMTP delivery failed for a job application:', error);
    return response.status(502).json({
      ok: false,
      message: 'We could not deliver your application. Please try again or contact the recruitment team directly.',
    });
  }

  return response.status(202).json({
    ok: true,
    reference,
    message: `Your application is with ${job.consultant?.name || 'our recruitment team'}.`,
  });
}