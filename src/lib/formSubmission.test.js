import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitForm, SubmissionError } from './formSubmission.ts';

const confirmation = {
  ok: true, reference: 'CH-HIRE-20261113-AABBCCDDEEFF', message: 'Your brief has been sent.',
};

test('only accepts well-formed successful confirmations with real references', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(confirmation, { status: 202 }));
  assert.deepEqual(await submitForm('/api/recruit-talent', { method: 'POST' }), {
    reference: confirmation.reference, message: confirmation.message,
  });
  assert.equal(fetch.mock.calls[0].arguments[1].redirect, 'error');
  for (const body of [
    { ...confirmation, ok: false }, { ...confirmation, ok: 'false' },
    { ...confirmation, reference: undefined }, { ...confirmation, reference: ' ' },
    { ...confirmation, message: undefined }, { ...confirmation, reference: 123 },
    null, [], {}, '<html>Error</html>',
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(submitForm('/api/recruit-talent', {}), SubmissionError);
  }
});

test('malformed, HTML, null and empty responses are uncertain outcomes rather than success', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch');
  for (const response of [
    new Response('{broken', { headers: { 'content-type': 'application/json' } }),
    new Response('<html>Error</html>', { headers: { 'content-type': 'text/html' } }),
    new Response(null, { status: 204 }),
    Response.json(null),
  ]) {
    fetch.mock.mockImplementation(async () => response);
    await assert.rejects(submitForm('/api/recruit-talent', {}), (error) =>
      error instanceof SubmissionError && /before resubmitting/.test(error.message));
  }
});

test('only exposes valid field errors from 422 responses and preserves failure references', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    ok: false, message: 'Check your details.', reference: confirmation.reference,
    errors: { email: 'Enter a valid email address.', invalid: {}, blank: '' },
  }, { status: 422 }));
  await assert.rejects(submitForm('/api/recruit-talent', {}), (error) => {
    assert.deepEqual(error.fieldErrors, { email: 'Enter a valid email address.' });
    assert.match(error.message, new RegExp(confirmation.reference));
    return true;
  });
});

test('HTTP failures cannot become success even with a success-shaped response', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch');
  for (const status of [413, 429, 500, 502, 503, 504]) {
    fetch.mock.mockImplementation(async () => Response.json(confirmation, { status }));
    await assert.rejects(submitForm('/api/recruit-talent', {}), (error) =>
      error instanceof SubmissionError && !error.message.includes('Your brief has been sent.'));
  }
});

test('network failures and a stalled request produce an actionable uncertain-outcome message', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(submitForm('/api/recruit-talent', {}), /before resubmitting/);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fetch.mock.mockImplementation((_action, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const request = submitForm('/api/recruit-talent', {});
  const rejection = assert.rejects(request, /before resubmitting/);
  t.mock.timers.tick(65_000);
  await rejection;
});
