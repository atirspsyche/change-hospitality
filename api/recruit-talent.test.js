import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import handler, { renderRecruitmentEmail, validateRecruitmentBrief } from './recruit-talent.js';

const validPayload = {
  submitterName: 'Alex Morgan',
  companyName: 'The Test Hotel',
  email: 'alex@example.com',
  phone: '020 0000 0000',
  location: 'London',
  jobTypes: ['Permanent Placements - Front of House'],
  message: 'Opening in September',
  consent: true,
  website: '',
};

const originalEnvironment = {
  RECRUITMENT_INBOX: process.env.RECRUITMENT_INBOX,
};

afterEach(() => {
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

test('accepts a brief without a job title or position count and ignores legacy fields', () => {
  const result = validateRecruitmentBrief(validPayload);
  const legacy = validateRecruitmentBrief({
    ...validPayload,
    numberPositions: 0,
    jobTitle: 'Old title',
  });

  assert.deepEqual(result.errors, {});
  assert.deepEqual(legacy.errors, {});
  assert.deepEqual(legacy.data, result.data);
  assert.equal(Object.hasOwn(result.data, 'numberPositions'), false);
  assert.equal(Object.hasOwn(result.data, 'jobTitle'), false);
});

test('still requires the location', () => {
  const result = validateRecruitmentBrief({ ...validPayload, location: ' ' });

  assert.deepEqual(result.errors, { location: 'Enter the role location.' });
});

test('escapes the company email heading', () => {
  const email = renderRecruitmentEmail({
    ...validPayload,
    companyName: 'Hotel <script>alert(1)</script>',
  }, 'CH-HIRE-TEST');

  assert.match(email.html, /Hotel &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(email.html, /<script>/);
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
  process.env.RECRUITMENT_INBOX = 'team@example.com';

  let emailPayload;

  const request = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: validPayload,
  };
  const response = createResponse();

  await handler(request, response, {
    sendMail: async (payload) => {
      emailPayload = payload;
      return { accepted: [payload.to] };
    },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.ok, true);
  assert.equal(emailPayload.to, 'team@example.com');
  assert.equal(emailPayload.replyTo, validPayload.email);
  assert.equal(emailPayload.subject, 'New staffing brief: The Test Hotel');
  assert.match(emailPayload.text, /The Test Hotel/);
  assert.match(emailPayload.text, /Location: London/);
  assert.match(emailPayload.html, /<h1[^>]*>The Test Hotel<\/h1>/);
  assert.match(emailPayload.html, /<th[^>]*>Location<\/th>/);
  assert.doesNotMatch(emailPayload.text, /Positions:|Job title:|undefined|NaN/);
  assert.doesNotMatch(emailPayload.html, />Positions<|>Job title<|undefined|NaN/);
  assert.doesNotMatch(emailPayload.html, /<script>/);
});

test('returns a controlled error when the email provider is unavailable', async () => {
  process.env.RECRUITMENT_INBOX = 'team@example.com';

  const request = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: validPayload,
  };
  const response = createResponse();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await handler(request, response, {
      sendMail: async () => {
        throw new Error('SMTP unavailable');
      },
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.statusCode, 502);
  assert.equal(response.body.ok, false);
  assert.match(response.body.message, /could not deliver your brief/i);
});
