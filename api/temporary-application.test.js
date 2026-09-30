import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import handler, { validateTemporaryApplication } from './temporary-application.js';

const validPayload = {
  name: 'Alex Morgan',
  country: 'United Kingdom',
  city: 'London',
  email: 'alex@example.com',
  phone: '020 0000 0000',
  roles: ['Front of house', 'Events'],
  consent: true,
  website: '',
};

const originalTempInbox = process.env.TEMP_APPLICATIONS_INBOX;
const originalApplicationsInbox = process.env.APPLICATIONS_INBOX;

afterEach(() => {
  if (originalTempInbox === undefined) delete process.env.TEMP_APPLICATIONS_INBOX;
  else process.env.TEMP_APPLICATIONS_INBOX = originalTempInbox;
  if (originalApplicationsInbox === undefined) delete process.env.APPLICATIONS_INBOX;
  else process.env.APPLICATIONS_INBOX = originalApplicationsInbox;
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return value; },
  };
}

test('requires every temporary candidate field and at least one allowed role', () => {
  const result = validateTemporaryApplication({ roles: ['Not a real role'] });

  assert.equal(result.errors.name, 'Enter your first and last name.');
  assert.equal(result.errors.country, 'Enter your country.');
  assert.equal(result.errors.city, 'Enter your city.');
  assert.equal(result.errors.email, 'Enter a valid email address.');
  assert.equal(result.errors.phone, 'Enter your phone number.');
  assert.equal(result.errors.roles, 'Choose at least one role.');
  assert.equal(result.errors.consent, 'Confirm that we may contact you about temporary work.');
});

test('deduplicates and allow-lists temporary role choices', () => {
  const result = validateTemporaryApplication({
    ...validPayload,
    roles: ['Events', 'Events', 'Admin', 'Injected role'],
  });

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.data.roles, ['Events', 'Admin']);
});

test('emails a valid temporary application to its dedicated inbox', async () => {
  process.env.TEMP_APPLICATIONS_INBOX = 'temp-team@example.com';
  let emailPayload;
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: validPayload,
  }, response, {
    sendMail: async (payload) => { emailPayload = payload; return { accepted: [payload.to] }; },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.ok, true);
  assert.match(response.body.reference, /^CH-TEMP-\d{8}-[A-F0-9]{6}$/);
  assert.equal(emailPayload.to, 'temp-team@example.com');
  assert.equal(emailPayload.replyTo, validPayload.email);
  assert.match(emailPayload.subject, /Alex Morgan/);
  assert.match(emailPayload.text, /Front of house, Events/);
});

test('falls back to the general applications inbox', async () => {
  delete process.env.TEMP_APPLICATIONS_INBOX;
  process.env.APPLICATIONS_INBOX = 'applications@example.com';
  let recipient;
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: validPayload,
  }, response, {
    sendMail: async ({ to }) => { recipient = to; },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(recipient, 'applications@example.com');
});

test('rejects invalid temporary applications without sending email', async () => {
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { ...validPayload, email: 'not-an-email', roles: [] },
  }, response, {
    sendMail: async () => assert.fail('Invalid applications must not send email.'),
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.errors.email, 'Enter a valid email address.');
  assert.equal(response.body.errors.roles, 'Choose at least one role.');
});