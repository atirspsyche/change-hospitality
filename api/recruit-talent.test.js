import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import handler, { validateRecruitmentBrief } from './recruit-talent.js';

const validPayload = {
  submitterName: 'Alex Morgan',
  companyName: 'The Test Hotel',
  email: 'alex@example.com',
  phone: '020 0000 0000',
  location: 'London',
  numberPositions: 3,
  jobTitle: 'Restaurant Manager',
  jobTypes: ['Permanent Placements - Front of House'],
  message: 'Opening in September',
  consent: true,
  website: '',
};

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RECRUITMENT_INBOX: process.env.RECRUITMENT_INBOX,
  RECRUITMENT_FROM_EMAIL: process.env.RECRUITMENT_FROM_EMAIL,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(process.env, originalEnvironment);
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    setHeader() {},
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return value;
    },
  };
}

test('rejects incomplete recruitment briefs', () => {
  const result = validateRecruitmentBrief({});

  assert.equal(result.data.email, '');
  assert.equal(result.errors.email, 'Enter a valid email address.');
  assert.equal(result.errors.jobTypes, 'Choose at least one staffing type.');
});

test('accepts one choice from either staffing subgroup', () => {
  const temporary = validateRecruitmentBrief({
    ...validPayload,
    jobTypes: ['Temporary Staffing - Back of House Casual'],
  });
  const permanent = validateRecruitmentBrief({
    ...validPayload,
    jobTypes: ['Permanent Placements - Sales, Marketing & Events'],
  });

  assert.equal(temporary.errors.jobTypes, undefined);
  assert.deepEqual(temporary.data.jobTypes, ['Temporary Staffing - Back of House Casual']);
  assert.equal(permanent.errors.jobTypes, undefined);
  assert.deepEqual(permanent.data.jobTypes, ['Permanent Placements - Sales, Marketing & Events']);
});

test('sends a sanitized valid brief to the configured inbox', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RECRUITMENT_INBOX = 'team@example.com';
  process.env.RECRUITMENT_FROM_EMAIL = 'web@example.com';

  let emailPayload;
  globalThis.fetch = async (_url, options) => {
    emailPayload = JSON.parse(options.body);
    return { ok: true };
  };

  const request = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: validPayload,
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.ok, true);
  assert.equal(emailPayload.to[0], 'team@example.com');
  assert.equal(emailPayload.reply_to, validPayload.email);
  assert.match(emailPayload.text, /The Test Hotel/);
  assert.doesNotMatch(emailPayload.html, /<script>/);
});

test('returns a controlled error when the email provider is unavailable', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RECRUITMENT_INBOX = 'team@example.com';
  process.env.RECRUITMENT_FROM_EMAIL = 'web@example.com';

  globalThis.fetch = async () => {
    throw new Error('Network unavailable');
  };

  const request = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: validPayload,
  };
  const response = createResponse();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await handler(request, response);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.statusCode, 502);
  assert.equal(response.body.ok, false);
  assert.match(response.body.message, /could not deliver your brief/i);
});
