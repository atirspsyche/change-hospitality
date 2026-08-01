const JOB_TYPES = new Set([
  'FOH Casual',
  'FOH Permanent',
  'BOH Casual',
  'BOH Permanent',
]);

const DEPARTMENTS = new Set([
  'Sales',
  'Marketing',
  'Events',
  'HR',
  'Finance and Administration',
]);

const MAX_BODY_SIZE = 24_000;

function cleanString(value, maxLength = 160) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanList(value, allowedValues) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => allowedValues.has(item)))];
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

export function validateRecruitmentBrief(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { data: null, errors: { form: 'Submit a valid recruitment brief.' } };
  }

  const numberPositions = Number(payload.numberPositions);
  const data = {
    submitterName: cleanString(payload.submitterName),
    companyName: cleanString(payload.companyName),
    email: cleanString(payload.email, 254).toLowerCase(),
    phone: cleanString(payload.phone, 40),
    location: cleanString(payload.location, 180),
    numberPositions,
    jobTitle: cleanString(payload.jobTitle, 180),
    jobTypes: cleanList(payload.jobTypes, JOB_TYPES),
    departments: cleanList(payload.departments, DEPARTMENTS),
    message: cleanString(payload.message, 2_000),
    consent: payload.consent === true,
    website: cleanString(payload.website, 200),
  };

  const errors = {};
  if (!data.submitterName) errors.submitterName = 'Enter your name.';
  if (!data.companyName) errors.companyName = 'Enter the company name.';
  if (!/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.phone) errors.phone = 'Enter a contact number.';
  if (!data.location) errors.location = 'Enter the role location.';
  if (!Number.isInteger(numberPositions) || numberPositions < 1 || numberPositions > 999) {
    errors.numberPositions = 'Enter between 1 and 999 positions.';
  }
  if (!data.jobTitle) errors.jobTitle = 'Enter a job title.';
  if (!data.jobTypes.length) errors.jobTypes = 'Choose at least one staffing type.';
  if (!data.consent) errors.consent = 'Confirm that we may contact you about this brief.';

  return { data, errors };
}

function renderRows(data) {
  const rows = [
    ['Submitted by', data.submitterName],
    ['Company', data.companyName],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Location', data.location],
    ['Positions', String(data.numberPositions)],
    ['Job title', data.jobTitle],
    ['Staffing types', data.jobTypes.join(', ')],
    ['Specialist departments', data.departments.join(', ') || 'None selected'],
    ['Additional detail', data.message || 'None provided'],
  ];

  return rows
    .map(([label, value]) => `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #d9d3cd;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #d9d3cd">${escapeHtml(value)}</td></tr>`)
    .join('');
}

export function renderRecruitmentEmail(data, reference) {
  const text = [
    `Recruitment brief ${reference}`,
    `Submitted by: ${data.submitterName}`,
    `Company: ${data.companyName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Location: ${data.location}`,
    `Positions: ${data.numberPositions}`,
    `Job title: ${data.jobTitle}`,
    `Staffing types: ${data.jobTypes.join(', ')}`,
    `Specialist departments: ${data.departments.join(', ') || 'None selected'}`,
    `Additional detail: ${data.message || 'None provided'}`,
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ef;color:#1d1d1b;font-family:Arial,sans-serif"><div style="margin:0 auto;max-width:680px;padding:32px 20px"><div style="background:#cccf5a;padding:24px;border-radius:8px 8px 0 0"><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase">New client brief / ${escapeHtml(reference)}</p><h1 style="margin:0;font-size:30px;line-height:1.1">${escapeHtml(data.jobTitle)}</h1></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border-collapse:collapse">${renderRows(data)}</table></div></body></html>`;

  return { html, text };
}

export default async function handler(request, response) {
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

  const payload = readBody(request);
  const { data, errors } = validateRecruitmentBrief(payload);

  if (!data || Object.keys(errors).length) {
    return response.status(422).json({
      ok: false,
      message: 'Please check the highlighted fields.',
      errors,
    });
  }

  const reference = `CH-HIRE-${Date.now().toString().slice(-8)}`;

  // Quietly accept bot submissions caught by the honeypot.
  if (data.website) {
    return response.status(202).json({ ok: true, reference, message: 'Your staffing brief has been received.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.RECRUITMENT_INBOX;
  const from = process.env.RECRUITMENT_FROM_EMAIL;

  if (!apiKey || !inbox || !from) {
    console.error('Recruitment email configuration is incomplete.');
    return response.status(503).json({
      ok: false,
      message: 'Email delivery is temporarily unavailable. Please contact the recruitment team directly.',
    });
  }

  const email = renderRecruitmentEmail(data, reference);
  let resendResponse;

  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [inbox],
        reply_to: data.email,
        subject: `New staffing brief: ${data.jobTitle} - ${data.companyName}`,
        html: email.html,
        text: email.text,
      }),
    });
  } catch (error) {
    console.error('Resend request failed for a recruitment brief:', error);
    return response.status(502).json({
      ok: false,
      message: 'We could not deliver your brief. Please try again or contact the recruitment team directly.',
    });
  }

  if (!resendResponse.ok) {
    const providerMessage = await resendResponse.text();
    console.error('Resend rejected a recruitment brief:', resendResponse.status, providerMessage);
    return response.status(502).json({
      ok: false,
      message: 'We could not deliver your brief. Please try again or contact the recruitment team directly.',
    });
  }

  return response.status(202).json({
    ok: true,
    reference,
    message: 'Your staffing brief is with our recruitment team.',
  });
}
