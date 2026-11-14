import { MailConfigurationError, sendEmail, confirmMailAcceptance, logMailFailure } from '../server/mail.js';
import { cleanString, cleanList, readJsonBody, createReference, isEmailAddress, validateTextLengths, RequestError, checkRequestSize, requestContentType } from '../server/form-utils.js';
import { renderEmailTemplate } from '../server/email-template.js';
import { staffingGroups } from '../src/data/formOptions.js';

const JOB_TYPES = new Set(staffingGroups.flatMap(({ options }) => options.map(({ value }) => value)));

const MAX_BODY_SIZE = 24_000;

export function validateRecruitmentBrief(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { data: null, errors: { form: 'Submit a valid recruitment brief.' } };
  }

  const data = {
    submitterName: cleanString(payload.submitterName),
    companyName: cleanString(payload.companyName),
    email: cleanString(payload.email, 254).toLowerCase(),
    phone: cleanString(payload.phone, 40),
    location: cleanString(payload.location, 180),
    jobTypes: cleanList(payload.jobTypes, JOB_TYPES),
    message: cleanString(payload.message, 2_000),
    consent: payload.consent === true,
    website: cleanString(payload.website, 200),
  };

  const errors = {};
  if (!data.submitterName) errors.submitterName = 'Enter your name.';
  if (!data.companyName) errors.companyName = 'Enter the company name.';
  if (!isEmailAddress(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.phone) errors.phone = 'Enter a contact number.';
  if (!data.location) errors.location = 'Enter the role location.';
  if (!data.jobTypes.length) errors.jobTypes = 'Choose at least one staffing type.';
  if (!data.consent) errors.consent = 'Confirm that we may contact you about this brief.';
  validateTextLengths(payload, {
    submitterName: 160, companyName: 160, email: 254, phone: 40,
    location: 180, message: 2_000, website: 200,
  }, errors);

  return { data, errors };
}

export function renderRecruitmentEmail(data, reference) {
  const rows = [
    ['Submitted by', data.submitterName],
    ['Company', data.companyName],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Location', data.location],
    ['Staffing types', data.jobTypes.join(', ')],
    ['Additional detail', data.message || 'None provided'],
  ];

  const text = [
    `Recruitment brief ${reference}`,
    `Submitted by: ${data.submitterName}`,
    `Company: ${data.companyName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Location: ${data.location}`,
    `Staffing types: ${data.jobTypes.join(', ')}`,
    `Additional detail: ${data.message || 'None provided'}`,
  ].join('\n');

  const html = renderEmailTemplate({
    eyebrow: `New client brief / ${reference}`,
    title: data.companyName,
    rows,
  });

  return { html, text };
}

export default async function handler(request, response, dependencies = {}) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  if (requestContentType(request) !== 'application/json') {
    return response.status(415).json({ ok: false, message: 'Content type must be application/json.' });
  }

  let payload;
  try {
    checkRequestSize(request, MAX_BODY_SIZE);
    payload = readJsonBody(request.body, MAX_BODY_SIZE);
  } catch (error) {
    if (!(error instanceof RequestError)) throw error;
    return response.status(error.status).json({ ok: false, message: error.message });
  }

  const { data, errors } = validateRecruitmentBrief(payload);

  if (!data || Object.keys(errors).length) {
    return response.status(422).json({
      ok: false,
      message: 'Please check the highlighted fields.',
      errors,
    });
  }

  const reference = createReference('HIRE');

  // Quietly accept bot submissions caught by the honeypot.
  if (data.website) {
    return response.status(202).json({ ok: true, reference, message: 'Your staffing brief has been received.' });
  }

  const inbox = (process.env.RECRUITMENT_INBOX || '').trim().toLowerCase();
  const email = renderRecruitmentEmail(data, reference);
  const mailer = dependencies.sendMail || sendEmail;

  let redirected = false;
  try {
    if (!isEmailAddress(inbox)) {
      throw new MailConfigurationError('RECRUITMENT_INBOX is missing or invalid.');
    }

    const result = await mailer({
      to: inbox,
      replyTo: data.email,
      subject: `New staffing brief: ${data.companyName}`,
      html: email.html,
      text: email.text,
      headers: { 'X-Change-Hospitality-Reference': reference },
    });
    confirmMailAcceptance(result, [inbox]);
    redirected = result.redirected === true;
  } catch (error) {
    logMailFailure('recruitment', reference, error);
    if (error instanceof MailConfigurationError) {
      return response.status(503).json({
        ok: false,
        message: 'Email delivery is temporarily unavailable. Please contact the recruitment team directly.',
      });
    }

    return response.status(502).json({
      ok: false,
      reference,
      message: 'We could not confirm receipt of your brief. Please contact the recruitment team with this reference before resubmitting.',
    });
  }

  return response.status(202).json({
    ok: true,
    reference,
    message: redirected
      ? 'Test submission accepted by the preview inbox. No email was sent to the recruitment team.'
      : 'Your staffing brief has been sent to our recruitment team.',
  });
}
