import { randomBytes } from 'node:crypto';
import { MailConfigurationError, sendEmail } from '../server/mail.js';

const ROLES = new Set(['Back of house', 'Front of house', 'Sales', 'Events', 'Admin']);
const MAX_BODY_SIZE = 16_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value, maxLength = 160) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanRoles(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((role) => ROLES.has(role)))];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  const rawBody = Buffer.isBuffer(request.body)
    ? request.body.toString('utf8')
    : String(request.body ?? '');
  if (!rawBody || rawBody.length > MAX_BODY_SIZE) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function createReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `CH-TEMP-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

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
    roles: cleanRoles(payload.roles),
    consent: payload.consent === true,
    website: cleanString(payload.website, 200),
  };
  const errors = {};

  if (!data.name) errors.name = 'Enter your first and last name.';
  if (!data.country) errors.country = 'Enter your country.';
  if (!data.city) errors.city = 'Enter your city.';
  if (!EMAIL_PATTERN.test(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.phone) errors.phone = 'Enter your phone number.';
  if (!data.roles.length) errors.roles = 'Choose at least one role.';
  if (!data.consent) errors.consent = 'Confirm that we may contact you about temporary work.';

  return { data, errors };
}

export function renderTemporaryApplicationEmail(data, reference) {
  const values = [
    ['Reference', reference],
    ['Candidate', data.name],
    ['Country', data.country],
    ['City', data.city],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Roles sought', data.roles.join(', ')],
  ];
  const text = values.map(([label, value]) => `${label}: ${value}`).join('\n');
  const rows = values
    .map(([label, value]) => `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #d9d3cd;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #d9d3cd">${escapeHtml(value)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ef;color:#1d1d1b;font-family:Arial,sans-serif"><div style="margin:0 auto;max-width:680px;padding:32px 20px"><div style="background:#cccf5a;padding:24px;border-radius:8px 8px 0 0"><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase">New temporary candidate / ${escapeHtml(reference)}</p><h1 style="margin:0;font-size:30px;line-height:1.1">${escapeHtml(data.name)}</h1></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border-collapse:collapse">${rows}</table></div></body></html>`;
  return { html, text };
}

export default async function handler(request, response, dependencies = {}) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    return response.status(415).json({ ok: false, message: 'Content type must be application/json.' });
  }

  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (contentLength > MAX_BODY_SIZE) {
    return response.status(413).json({ ok: false, message: 'Submission is too large.' });
  }

  const { data, errors } = validateTemporaryApplication(readBody(request));
  if (!data || Object.keys(errors).length) {
    return response.status(422).json({
      ok: false,
      message: 'Please check your application details.',
      errors,
    });
  }

  const reference = createReference();
  if (data.website) {
    return response.status(202).json({ ok: true, reference, message: 'Your details have been received.' });
  }

  const inbox = cleanString(
    process.env.TEMP_APPLICATIONS_INBOX || process.env.APPLICATIONS_INBOX,
    254,
  ).toLowerCase();
  const mailer = dependencies.sendMail || sendEmail;

  try {
    if (!EMAIL_PATTERN.test(inbox)) {
      throw new MailConfigurationError('TEMP_APPLICATIONS_INBOX or APPLICATIONS_INBOX is missing or invalid.');
    }

    const email = renderTemporaryApplicationEmail(data, reference);
    await mailer({
      to: inbox,
      replyTo: data.email,
      subject: `Temporary work application: ${data.name} - ${data.city}`,
      text: email.text,
      html: email.html,
      headers: { 'X-Change-Hospitality-Reference': reference },
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      console.error('Temporary application email configuration is incomplete:', error.message);
      return response.status(503).json({
        ok: false,
        message: 'Email delivery is temporarily unavailable. Please contact the recruitment team directly.',
      });
    }

    console.error('SMTP delivery failed for a temporary application:', error);
    return response.status(502).json({
      ok: false,
      message: 'We could not deliver your details. Please try again or contact the recruitment team directly.',
    });
  }

  return response.status(202).json({
    ok: true,
    reference,
    message: 'Your details are with our temporary recruitment team.',
  });
}