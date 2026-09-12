import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';

import handler from './apply.js';

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

  const filename = file.filename || 'alex-morgan-cv.pdf';
  const mimeType = file.mimeType || 'application/pdf';
  const content = file.content || Buffer.from('%PDF-1.7\nTest CV');
  chunks.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
  ));
  chunks.push(content);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

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
  assert.match(response.body.reference, /^CH-APP-\d{8}-[A-F0-9]{6}$/);
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