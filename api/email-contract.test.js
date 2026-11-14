import assert from 'node:assert/strict';
import { test } from 'node:test';
import recruit, { validateRecruitmentBrief } from './recruit-talent.js';
import temporary, { validateTemporaryApplication } from './temporary-application.js';
import { MailConfigurationError } from '../server/mail.js';

const shared = { email: 'alex@example.com', phone: '02000000000', consent: true, website: '' };
const flows = [
  {
    name: 'recruitment', handler: recruit, validate: validateRecruitmentBrief,
    inbox: 'RECRUITMENT_INBOX', limit: 24_000, kind: 'HIRE',
    payload: { ...shared, submitterName: 'Alex', companyName: 'Hotel', location: 'London', jobTypes: ['Permanent Placements - Front of House'], message: '' },
    lengths: { submitterName: 160, companyName: 160, email: 254, phone: 40, location: 180, message: 2000 },
  },
  {
    name: 'temporary', handler: temporary, validate: validateTemporaryApplication,
    inbox: 'TEMP_APPLICATIONS_INBOX', limit: 64_000, kind: 'TEMP',
    payload: { ...shared, name: 'Alex', country: 'UK', city: 'London', roles: ['Events'], experience: 'Hospitality experience.' },
    lengths: { name: 160, country: 100, city: 100, email: 254, phone: 40 },
  },
];

function response() {
  return {
    headers: {}, statusCode: 0, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
  };
}

function setInbox(t, name) {
  const original = process.env[name];
  process.env[name] = 'team@example.com';
  t.after(() => {
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  });
}

for (const flow of flows) {
  test(`${flow.name}: validates request shape, actual byte limits, consent and honeypots`, async (t) => {
    setInbox(t, flow.inbox);
    let attempts = 0;
    const mailer = async ({ to }) => { attempts++; return { accepted: [to] }; };
    const cases = [
      { body: '{broken', status: 422 }, { body: [], status: 422 }, { body: null, status: 422 },
      { body: { ...flow.payload, consent: 'true' }, status: 422 },
      { body: { ...flow.payload, email: 'a@@example.com' }, status: 422 },
      { body: { ...flow.payload, unused: 'x'.repeat(flow.limit) }, status: 413 },
      { body: JSON.stringify({ ...flow.payload, unused: '\u9910'.repeat(flow.limit / 2) }), status: 413 },
      { body: flow.payload, type: 'application/json-invalid', status: 415 },
      { body: flow.payload, length: '-1', status: 400 },
      { body: flow.payload, length: String(flow.limit + 1), status: 413 },
    ];
    for (const value of cases) {
      const result = response();
      await flow.handler({
        method: 'POST', headers: {
          'content-type': value.type || 'application/json',
          ...(value.length ? { 'content-length': value.length } : {}),
        }, body: value.body,
      }, result, { sendMail: mailer });
      assert.equal(result.statusCode, value.status);
      assert.equal(result.body.ok, false);
      assert.equal(result.headers['Cache-Control'], 'no-store');
    }
    const honeypot = response();
    await flow.handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { ...flow.payload, website: 'bot.example.com' } }, honeypot, { sendMail: mailer });
    assert.equal(honeypot.statusCode, 202);
    assert.equal(attempts, 0);
  });

  test(`${flow.name}: rejects overlong and nontext fields instead of silently sending changed input`, () => {
    for (const [name, limit] of Object.entries(flow.lengths)) {
      assert.ok(flow.validate({ ...flow.payload, [name]: 'a'.repeat(limit + 1) }).errors[name], name);
      assert.ok(flow.validate({ ...flow.payload, [name]: {} }).errors[name], name);
    }
  });

  test(`${flow.name}: validates SMTP outcomes and returns traceable, honest failure/preview responses`, async (t) => {
    setInbox(t, flow.inbox);
    t.mock.method(console, 'error', () => {});
    for (const [result, failure, expected] of [
      [undefined, null, 502], [{ accepted: [] }, null, 502],
      [{ accepted: ['unrelated@example.com'] }, null, 502],
      [null, new Error('Audit timeout'), 502],
      [null, new MailConfigurationError('Audit incomplete configuration'), 503],
      [{ accepted: ['team@example.com'] }, null, 202],
      [{ accepted: ['preview@example.com'], redirected: true, testInbox: 'preview@example.com' }, null, 202],
    ]) {
      const output = response();
      await flow.handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: flow.payload }, output, {
        sendMail: async () => { if (failure) throw failure; return result; },
      });
      assert.equal(output.statusCode, expected);
      if (expected !== 503) assert.match(output.body.reference, new RegExp(`^CH-${flow.kind}-\\d{8}-[A-F0-9]{12}$`));
      if (expected === 502) assert.match(output.body.message, /before resubmitting/);
      if (result?.redirected) assert.match(output.body.message, /No email was sent to the recruitment team/);
    }
  });
}
