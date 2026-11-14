import { randomBytes } from 'node:crypto';

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

export function createReference(kind) {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `CH-${kind}-${date}-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export function isEmailAddress(value) {
  if (typeof value !== 'string' || value.length > 254) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && local.length <= 64 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) &&
    !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
    domain.includes('.') && domain.split('.').every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

export function validateTextLengths(payload, limits, errors) {
  for (const [field, limit] of Object.entries(limits)) {
    const value = payload[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors[field] = 'Enter a text value.';
    } else if (typeof value === 'string' && value.length > limit) {
      errors[field] = `Use ${limit.toLocaleString('en-GB')} characters or fewer.`;
    }
  }
}

export function requestContentType(request) {
  const value = request.headers?.['content-type'];
  return typeof value === 'string' ? value.split(';', 1)[0].trim().toLowerCase() : '';
}

export function checkRequestSize(request, maxBytes) {
  const value = request.headers?.['content-length'];
  if (value === undefined) return;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new RequestError(400, 'The request length is invalid.');
  }
  if (Number(value) > maxBytes) throw new RequestError(413, 'Submission is too large.');
}

export function cleanString(value, maxLength = 160) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function cleanList(value, allowedValues) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => allowedValues.has(item)))];
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function readJsonBody(body, maxBytes) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > maxBytes) {
      throw new RequestError(413, 'Submission is too large.');
    }
    return body;
  }
  const rawBody = Buffer.isBuffer(body) ? body.toString('utf8') : String(body ?? '');
  const size = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(rawBody, 'utf8');
  if (size > maxBytes) throw new RequestError(413, 'Submission is too large.');
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}
