import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import handler, { renderTemporaryApplicationEmail, validateTemporaryApplication } from './temporary-application.js';

const validPayload = {
  name: 'Alex Morgan',
  country: 'United Kingdom',
  city: 'London',
  email: 'alex@example.com',
  phone: '020 0000 0000',
  roles: ['Front of house', 'Events'],
  experience: 'Three years in front of house.\n\nI have also supported events and banqueting.',
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
  assert.equal(result.errors.country, 'Enter the country you live in.');
  assert.equal(result.errors.city, 'Enter your city.');
  assert.equal(result.errors.email, 'Enter a valid email address.');
  assert.equal(result.errors.phone, 'Enter your phone number.');
  assert.equal(result.errors.roles, 'Choose at least one role.');
  assert.equal(result.errors.experience, 'Tell us about your hospitality experience.');
  assert.equal(result.errors.consent, 'Confirm that we may contact you about temporary work.');
});

test('requires a non-blank text answer for hospitality experience', () => {
  for (const experience of [undefined, null, 42, {}, '', ' \r\n\t ']) {
    const result = validateTemporaryApplication({ ...validPayload, experience });
    assert.equal(result.errors.experience, 'Tell us about your hospitality experience.');
  }
});

test('accepts 5,000 experience characters and rejects longer answers without truncation', () => {
  const accepted = validateTemporaryApplication({ ...validPayload, experience: 'a'.repeat(5_000) });
  const rejected = validateTemporaryApplication({ ...validPayload, experience: 'a'.repeat(5_001) });

  assert.deepEqual(accepted.errors, {});
  assert.equal(accepted.data.experience.length, 5_000);
  assert.equal(rejected.errors.experience, 'Keep your hospitality experience to 5,000 characters or fewer.');
  assert.equal(rejected.data.experience.length, 5_001);
});

test('preserves experience paragraphs and escapes user content in the HTML email', () => {
  const result = validateTemporaryApplication({
    ...validPayload,
    experience: '  Managed bars & events.\r\n\r\n<script>alert("test")</script>  ',
  });
  const email = renderTemporaryApplicationEmail(result.data, 'CH-TEMP-TEST');

  assert.equal(result.data.experience, 'Managed bars & events.\n\n<script>alert("test")</script>');
  assert.ok(email.text.includes(`Country of residence: ${validPayload.country}`));
  assert.ok(email.text.includes(`\n\nHospitality experience:\n${result.data.experience}`));
  assert.match(email.html, /Hospitality experience<\/th>/);
  assert.match(email.html, /Managed bars &amp; events\.<br><br>&lt;script&gt;alert\(&quot;test&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(email.html, /<script>/);
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
  assert.match(response.body.reference, /^CH-TEMP-\d{8}-[A-F0-9]{12}$/);
  assert.equal(emailPayload.to, 'temp-team@example.com');
  assert.equal(emailPayload.replyTo, validPayload.email);
  assert.match(emailPayload.subject, /Alex Morgan/);
  assert.match(emailPayload.text, /Front of house, Events/);
  assert.ok(emailPayload.text.includes(validPayload.experience));
  assert.ok(emailPayload.html.includes(validPayload.experience.replaceAll('\n', '<br>')));
});

test('emails a full-length Unicode answer even when JSON escapes exceed the old body limit', async () => {
  process.env.TEMP_APPLICATIONS_INBOX = 'temp-team@example.com';
  const experience = '\u9910'.repeat(5_000);
  const body = JSON.stringify({ ...validPayload, experience }).replace(/\u9910/g, '\\u9910');
  let emailPayload;
  const response = createResponse();

  assert.ok(Buffer.byteLength(body, 'utf8') > 16_000);
  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body, 'utf8')) },
    body,
  }, response, {
    sendMail: async (payload) => { emailPayload = payload; return { accepted: [payload.to] }; },
  });

  assert.equal(response.statusCode, 202);
  assert.ok(emailPayload.text.includes(experience));
  assert.ok(emailPayload.html.includes(experience));
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
    sendMail: async ({ to }) => { recipient = to; return { accepted: [to] }; },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(recipient, 'applications@example.com');
});

test('rejects invalid temporary applications without sending email', async () => {
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { ...validPayload, email: 'not-an-email', roles: [], experience: 'a'.repeat(5_001) },
  }, response, {
    sendMail: async () => assert.fail('Invalid applications must not send email.'),
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.errors.email, 'Enter a valid email address.');
  assert.equal(response.body.errors.roles, 'Choose at least one role.');
  assert.equal(response.body.errors.experience, 'Keep your hospitality experience to 5,000 characters or fewer.');
});