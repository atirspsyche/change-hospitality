import assert from 'node:assert/strict';
import { test } from 'node:test';

import handler from './apply.js';

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

test('acknowledges a job application with a reference', async () => {
  const response = createResponse();
  const request = {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=test' },
  };

  await handler(request, response);

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.ok, true);
  assert.match(response.body.reference, /^CH-\d{6}$/);
  assert.match(response.body.message, /application received/i);
});