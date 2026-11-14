import { MailConfigurationError, sendEmail, confirmMailAcceptance, logMailFailure } from '../server/mail.js';
import { cleanString, cleanList, readJsonBody, createReference, isEmailAddress, validateTextLengths, RequestError, checkRequestSize, requestContentType } from '../server/form-utils.js';
import { renderEmailTemplate } from '../server/email-template.js';
import { temporaryRoles } from '../src/data/formOptions.js';

const ROLES = new Set(temporaryRoles);
const MAX_BODY_SIZE = 64_000;
const MAX_EXPERIENCE_LENGTH = 5_000;

export function validateTemporaryApplication(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { data: null, errors: { form: 'Submit a valid temporary work application.' } };
  }

  const data = {
    name: cleanString(payload.name),
    country: cleanString(payload.country, 100),
    city: cleanString(payload.city, 100),
    email: cleanString(payload.email, 254).toLowerCase(),
    phone: cleanString(payload.phone, 40),
    roles: cleanList(payload.roles, ROLES),
    experience: typeof payload.experience === 'string'
      ? payload.experience.replace(/\r\n?/g, '\n').trim()
      : '',
    consent: payload.consent === true,
    website: cleanString(payload.website, 200),
  };
  const errors = {};

  if (!data.name) errors.name = 'Enter your first and last name.';
  if (!data.country) errors.country = 'Enter the country you live in.';
  if (!data.city) errors.city = 'Enter your city.';
  if (!isEmailAddress(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.phone) errors.phone = 'Enter your phone number.';
  if (!data.roles.length) errors.roles = 'Choose at least one role.';
  if (!data.experience) errors.experience = 'Tell us about your hospitality experience.';
  else if (payload.experience.length > MAX_EXPERIENCE_LENGTH) {
    errors.experience = 'Keep your hospitality experience to 5,000 characters or fewer.';
  }
  if (!data.consent) errors.consent = 'Confirm that we may contact you about temporary work.';
  validateTextLengths(payload, {
    name: 160, country: 100, city: 100, email: 254, phone: 40, website: 200,
  }, errors);

  return { data, errors };
}

export function renderTemporaryApplicationEmail(data, reference) {
  const values = [
    ['Reference', reference],
    ['Candidate', data.name],
    ['Country of residence', data.country],
    ['City', data.city],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Roles sought', data.roles.join(', ')],
  ];
  const text = `${values.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nHospitality experience:\n${data.experience}`;
  const html = renderEmailTemplate({
    eyebrow: `New temporary candidate / ${reference}`,
    title: data.name,
    rows: values,
    detail: { label: 'Hospitality experience', text: data.experience },
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

  const { data, errors } = validateTemporaryApplication(payload);
  if (!data || Object.keys(errors).length) {
    return response.status(422).json({
      ok: false,
      message: 'Please check your application details.',
      errors,
    });
  }

  const reference = createReference('TEMP');
  if (data.website) {
    return response.status(202).json({ ok: true, reference, message: 'Your details have been received.' });
  }

  const inbox = (process.env.TEMP_APPLICATIONS_INBOX || process.env.APPLICATIONS_INBOX || '').trim().toLowerCase();
  const mailer = dependencies.sendMail || sendEmail;

  let redirected = false;
  try {
    if (!isEmailAddress(inbox)) {
      throw new MailConfigurationError('TEMP_APPLICATIONS_INBOX or APPLICATIONS_INBOX is missing or invalid.');
    }

    const email = renderTemporaryApplicationEmail(data, reference);
    const result = await mailer({
      to: inbox,
      replyTo: data.email,
      subject: `Temporary work application: ${data.name} - ${data.city}`,
      text: email.text,
      html: email.html,
      headers: { 'X-Change-Hospitality-Reference': reference },
    });
    confirmMailAcceptance(result, [inbox]);
    redirected = result.redirected === true;
  } catch (error) {
    logMailFailure('temporary-application', reference, error);
    if (error instanceof MailConfigurationError) {
      return response.status(503).json({
        ok: false,
        message: 'Email delivery is temporarily unavailable. Please contact the recruitment team directly.',
      });
    }

    return response.status(502).json({
      ok: false,
      reference,
      message: 'We could not confirm receipt of your details. Please contact the recruitment team with this reference before resubmitting.',
    });
  }

  return response.status(202).json({
    ok: true,
    reference,
    message: redirected
      ? 'Test submission accepted by the preview inbox. No email was sent to the recruitment team.'
      : 'Your details have been sent to our temporary recruitment team.',
  });
}