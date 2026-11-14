import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, test } from 'node:test';

import handler from './apply.js';
import { MailConfigurationError } from '../server/mail.js';
import { MAX_RESUME_SIZE } from '../server/resume.js';

const originalInbox = process.env.APPLICATIONS_INBOX;
afterEach(() => {
  if (originalInbox === undefined) delete process.env.APPLICATIONS_INBOX;
  else process.env.APPLICATIONS_INBOX = originalInbox;
});

const validFields = {
  jobId: 'CH-BOH-1048',
  jobSlug: 'senior-sous-chef-mayfair',
  consultantId: 'consultant-marcus-reed',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  phone: '020 0000 0000',
  nationality: 'British',
  visaStatus: '',
  idealLocation: 'London',
  consent: 'on',
  website: '',
};

const resolvedJob = {
  jobId: 'CH-BOH-1048',
  role: 'Senior Sous Chef',
  position: 'Back of House',
  location: 'Mayfair, London',
  consultant: {
    _id: 'consultant-marcus-reed',
    name: 'Marcus Reed',
    email: 'marcus@changehospitality.co.uk',
  },
};

function createMultipartRequest(fields, file = {}) {
  const boundary = `----change-hospitality-${Date.now()}`;
  const chunks = [];

  Object.entries(fields).forEach(([name, value]) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ));
  });

  for (const upload of Array.isArray(file) ? file : [file]) {
    const filename = upload.filename || 'alex-morgan-cv.pdf';
    const mimeType = upload.mimeType || 'application/pdf';
    const content = upload.content || Buffer.from('%PDF-1.7\nTest CV');
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${upload.field || 'resume'}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ));
    chunks.push(content, Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(chunks);
  const request = Readable.from([body]);
  request.method = 'POST';
  request.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length),
  };
  return request;
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
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

test('rejects non-POST application requests', async () => {
  const response = createResponse();

  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.deepEqual(response.body, { ok: false, message: 'Method not allowed' });
});

test('emails a validated job application to its trusted consultant', async () => {
  const response = createResponse();
  const request = createMultipartRequest(validFields);
  let emailPayload;

  await handler(request, response, {
    resolveJob: async () => resolvedJob,
    sendMail: async (payload) => {
      emailPayload = payload;
      return { accepted: [payload.to] };
    },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.ok, true);
  assert.match(response.body.reference, /^CH-APP-\d{8}-[A-F0-9]{12}$/);
  assert.match(response.body.message, /Marcus Reed/);
  assert.equal(emailPayload.to, 'marcus@changehospitality.co.uk');
  assert.equal(emailPayload.replyTo, validFields.email);
  assert.match(emailPayload.subject, /Senior Sous Chef/);
  assert.equal(emailPayload.attachments[0].filename, 'alex-morgan-cv.pdf');
  assert.match(emailPayload.attachments[0].content.toString(), /^%PDF-/);
});

test('rejects a renamed non-CV file', async () => {
  const response = createResponse();
  const request = createMultipartRequest(validFields, {
    content: Buffer.from('This is not a PDF'),
  });

  await handler(request, response, {
    resolveJob: async () => resolvedJob,
    sendMail: async () => assert.fail('Invalid files must not be emailed.'),
  });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.errors.resume, 'Upload a valid PDF, DOC or DOCX file.');
});

test('rejects an application when the trusted job relationship is not found', async () => {
  const response = createResponse();
  const request = createMultipartRequest(validFields);

  await handler(request, response, {
    resolveJob: async () => null,
    sendMail: async () => assert.fail('Unknown jobs must not send email.'),
  });

  assert.equal(response.statusCode, 422);
  assert.match(response.body.message, /no longer available/i);
});

test('sample vacancies cannot send real applications', async () => {
  const response = createResponse();
  let called = false;
  await handler(createMultipartRequest({ ...validFields, jobId: 'TEST-1', jobSlug: 'test-sample' }), response, {
    resolveJob: async () => { called = true; return resolvedJob; },
    sendMail: async () => { called = true; },
  });
  assert.equal(response.statusCode, 422);
  assert.equal(called, false);
});

test('missing, empty, duplicate, unexpected and malformed file uploads cannot send mail', async () => {
  for (const file of [[], { content: Buffer.alloc(0) }, [{}, {}], { field: 'other' },
  { filename: 'cv.docx', content: Buffer.from('PK\x03\x04word/not-an-actual-zip') }]) {
    const response = createResponse();
    await handler(createMultipartRequest(validFields, file), response, {
      resolveJob: async () => assert.fail('Invalid uploads must not query Sanity'),
      sendMail: async () => assert.fail('Invalid uploads must not email'),
    });
    assert.equal(response.statusCode, 422);
  }
  const truncated = createMultipartRequest(validFields);
  const chunks = [];
  for await (const chunk of truncated) chunks.push(chunk);
  const body = Buffer.concat(chunks).subarray(0, -50);
  const response = createResponse();
  await handler({ method: 'POST', headers: { 'content-type': truncated.headers['content-type'] }, body }, response);
  assert.equal(response.statusCode, 400);
});

test('the 4 MiB CV maximum is inclusive and attachment MIME comes from the validated extension', async () => {
  for (const size of [MAX_RESUME_SIZE - 1, MAX_RESUME_SIZE, MAX_RESUME_SIZE + 1]) {
    const content = Buffer.alloc(size, 0x20);
    content.write('%PDF-1.7\n');
    let payload;
    const response = createResponse();
    await handler(createMultipartRequest(validFields, { content, mimeType: 'text/html' }), response, {
      resolveJob: async () => resolvedJob,
      sendMail: async (value) => { payload = value; return { accepted: [value.to] }; },
    });
    assert.equal(response.statusCode, size <= MAX_RESUME_SIZE ? 202 : 413);
    if (payload) assert.equal(payload.attachments[0].contentType, 'application/pdf');
  }
});

test('archive-only acceptance never names the consultant and logs a correlated warning', async (t) => {
  process.env.APPLICATIONS_INBOX = 'archive@example.com';
  const log = t.mock.method(console, 'error');
  const response = createResponse();
  await handler(createMultipartRequest(validFields), response, {
    resolveJob: async () => resolvedJob,
    sendMail: async () => ({ accepted: ['archive@example.com'], rejected: [resolvedJob.consultant.email] }),
  });
  assert.equal(response.statusCode, 202);
  assert.match(response.body.message, /our recruitment team/);
  assert.doesNotMatch(response.body.message, /Marcus/);
  assert.equal(log.mock.calls[0].arguments[1].reference, response.body.reference);
  assert.equal(log.mock.calls[0].arguments[1].consultantAccepted, false);
});

test('a rejected archive does not retry or discard acceptance by the consultant', async (t) => {
  process.env.APPLICATIONS_INBOX = 'archive@example.com';
  const log = t.mock.method(console, 'error');
  let attempts = 0;
  const response = createResponse();
  await handler(createMultipartRequest(validFields), response, {
    resolveJob: async () => resolvedJob,
    sendMail: async () => { attempts++; return { accepted: [resolvedJob.consultant.email], rejected: ['archive@example.com'] }; },
  });
  assert.equal(response.statusCode, 202);
  assert.match(response.body.message, /Marcus/);
  assert.equal(attempts, 1);
  assert.equal(log.mock.callCount(), 1);
});

test('a missing consultant address falls back to the archive and uses team confirmation', async (t) => {
  t.mock.method(console, 'error');
  process.env.APPLICATIONS_INBOX = 'archive@example.com';
  const response = createResponse();
  await handler(createMultipartRequest(validFields), response, {
    resolveJob: async () => ({ ...resolvedJob, consultant: { name: 'Marcus Reed' } }),
    sendMail: async ({ to }) => ({ accepted: [to] }),
  });
  assert.equal(response.statusCode, 202);
  assert.match(response.body.message, /our recruitment team/);
  assert.doesNotMatch(response.body.message, /Marcus/);
});

test('unconfirmed SMTP outcomes preserve a reference and advise contact rather than blind retry', async (t) => {
  t.mock.method(console, 'error');
  for (const result of [undefined, { accepted: [] }, { accepted: ['unrelated@example.com'] }]) {
    const response = createResponse();
    await handler(createMultipartRequest(validFields), response, {
      resolveJob: async () => resolvedJob, sendMail: async () => result,
    });
    assert.equal(response.statusCode, 502);
    assert.match(response.body.reference, /^CH-APP-/);
    assert.match(response.body.message, /before resubmitting/);
  }
});

test('configuration and CMS failures return controlled errors without sending email', async (t) => {
  t.mock.method(console, 'error');
  const unavailable = createResponse();
  await handler(createMultipartRequest(validFields), unavailable, {
    resolveJob: async () => { throw new Error('Audit CMS outage'); },
    sendMail: async () => assert.fail('CMS failures must not email'),
  });
  assert.equal(unavailable.statusCode, 502);
  const unconfigured = createResponse();
  await handler(createMultipartRequest(validFields), unconfigured, {
    resolveJob: async () => resolvedJob,
    sendMail: async () => { throw new MailConfigurationError('Audit configuration missing'); },
  });
  assert.equal(unconfigured.statusCode, 503);
});

test('actual multipart bytes are limited with or without a content-length header', async () => {
  for (const buffered of [false, true]) {
    const original = createMultipartRequest(validFields);
    const chunks = [];
    for await (const chunk of original) chunks.push(chunk);
    const content = Buffer.concat([Buffer.alloc(4_400_001, 0x78), Buffer.from('\r\n'), ...chunks]);
    const request = buffered ? { body: content } : Readable.from([content]);
    request.method = 'POST';
    request.headers = { 'content-type': original.headers['content-type'] };
    const response = createResponse();
    await handler(request, response, {
      resolveJob: async () => assert.fail('Oversized bodies must not query Sanity'),
      sendMail: async () => assert.fail('Oversized bodies must not email'),
    });
    assert.equal(response.statusCode, 413);
  }
});

test('interrupted, errored and stalled upload streams settle and remove their listeners', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const event of ['aborted', 'error', 'close', 'timeout']) {
    const request = new PassThrough();
    request.method = 'POST';
    request.headers = { 'content-type': 'multipart/form-data; boundary=audit' };
    const response = createResponse();
    const result = handler(request, response);
    request.write('--audit\r\nContent-Disposition: form-data; name="name"\r\n\r\nAudit');
    if (event === 'timeout') t.mock.timers.tick(20_000);
    else if (event === 'error') request.emit('error', new Error('Audit disconnected'));
    else request.emit(event);
    await result;
    assert.equal(response.statusCode, event === 'timeout' ? 408 : 400);
    assert.equal(request.listenerCount('aborted'), 0);
    assert.equal(request.listenerCount('error'), 0);
    request.destroy();
  }
});

test('overlong fields, invalid addresses and duplicate multipart fields cannot email', async () => {
  const response = createResponse();
  await handler(createMultipartRequest({ ...validFields, name: 'A'.repeat(161), email: 'a@@example.com' }), response, {
    resolveJob: async () => assert.fail('Invalid fields must not query Sanity'),
  });
  assert.equal(response.statusCode, 422);
  assert.ok(response.body.errors.name);
  assert.ok(response.body.errors.email);
  const original = createMultipartRequest(validFields);
  const chunks = [];
  for await (const chunk of original) chunks.push(chunk);
  const boundary = original.headers['content-type'].split('boundary=')[1];
  const duplicate = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\nduplicate@example.com\r\n`);
  const body = Buffer.concat([duplicate, ...chunks]);
  const repeated = createResponse();
  await handler({ method: 'POST', headers: { 'content-type': original.headers['content-type'] }, body }, repeated);
  assert.equal(repeated.statusCode, 422);
  assert.match(repeated.body.message, /must not be repeated/);
});