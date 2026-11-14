import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getSmtpConfiguration, MailConfigurationError, sendEmail, createSmtpTransport } from './mail.js';
import { EventEmitter } from 'node:events';

const baseEnvironment = {
  SMTP_SERVER: 'smtp.example.com',
  SMTP_LOGIN: 'website@example.com',
  SMTP_PASSWORD: 'secret',
  SMTP_FROM: 'Change Hospitality <website@example.com>',
};

test('uses STARTTLS configuration for SMTP port 587', () => {
  const configuration = getSmtpConfiguration({
    ...baseEnvironment,
    SMTP_PORT: '587',
  });

  assert.equal(configuration.host, 'smtp.example.com');
  assert.equal(configuration.port, 587);
  assert.equal(configuration.secure, false);
});

test('uses implicit TLS configuration for SMTP port 465', () => {
  const configuration = getSmtpConfiguration({
    ...baseEnvironment,
    SMTP_PORT: '465',
  });

  assert.equal(configuration.secure, true);
});

test('rejects incomplete SMTP configuration before opening a connection', () => {
  assert.throws(
    () => getSmtpConfiguration({ ...baseEnvironment, SMTP_PORT: '' }),
    MailConfigurationError,
  );
});

test('rejects invalid TLS flags, insecure port 465, sender lists and preview routing errors', () => {
  const environment = { ...baseEnvironment, SMTP_PORT: '587' };
  for (const override of [
    { SMTP_SECURE: 'tru' }, { SMTP_SECURE: '' },
    { SMTP_PORT: '465', SMTP_SECURE: 'false' }, { SMTP_FROM: 'not-an-address' },
    { SMTP_FROM: 'a@example.com, b@example.com' }, { SMTP_FROM: 'A\r\nB <a@example.com>' },
    { SMTP_SERVER: 'https://smtp.example.com' }, { VERCEL_ENV: 'preview' },
    { VERCEL_ENV: 'development' }, { EMAIL_TEST_INBOX: 'bad' },
    { VERCEL_ENV: 'production', EMAIL_TEST_INBOX: 'test@example.com' },
  ]) {
    assert.throws(() => getSmtpConfiguration({ ...environment, ...override }), MailConfigurationError);
  }
});

function fakeTransport(result, failure) {
  const state = { options: null, outgoing: null, closed: false };
  state.create = (options) => {
    state.options = options;
    return {
      async sendMail(message) {
        state.outgoing = message;
        if (failure) throw failure;
        return result;
      },
      close() { state.closed = true; },
    };
  };
  return state;
}

const message = {
  to: 'consultant@example.com', bcc: 'archive@example.com',
  from: 'untrusted@example.com', headers: { 'X-Change-Hospitality-Reference': 'CH-TEST' },
};

test('requires TLS on alternate SMTP ports, fixes sender and closes successful transports', async (t) => {
  t.mock.method(console, 'info');
  const transport = fakeTransport({ accepted: [message.to], rejected: [] });
  const result = await sendEmail(message, { ...baseEnvironment, SMTP_PORT: '2525' }, transport.create);
  assert.equal(transport.options.requireTLS, true);
  assert.equal(transport.outgoing.from, baseEnvironment.SMTP_FROM);
  assert.equal(transport.outgoing.disableFileAccess, true);
  assert.equal(transport.outgoing.disableUrlAccess, true);
  assert.equal(result.redirected, false);
  assert.equal(transport.closed, true);
});

test('preserves partial acceptance without retrying already accepted recipients', async (t) => {
  const log = t.mock.method(console, 'error');
  const transport = fakeTransport({ accepted: [message.bcc], rejected: [message.to], messageId: 'audit-message' });
  const result = await sendEmail(message, { ...baseEnvironment, SMTP_PORT: '587' }, transport.create);
  assert.deepEqual(result.accepted, [message.bcc]);
  assert.equal(log.mock.callCount(), 1);
  assert.equal(log.mock.calls[0].arguments[1].rejectedCount, 1);
  assert.equal(transport.closed, true);
});

test('rejects empty or unrelated acceptance and closes failed transports', async () => {
  for (const accepted of [[], ['unrelated@example.com']]) {
    const transport = fakeTransport({ accepted, rejected: [message.to] });
    await assert.rejects(sendEmail(message, { ...baseEnvironment, SMTP_PORT: '587' }, transport.create));
    assert.equal(transport.closed, true);
  }
  const transport = fakeTransport(null, new Error('Audit SMTP failure'));
  await assert.rejects(sendEmail(message, { ...baseEnvironment, SMTP_PORT: '587' }, transport.create), /Audit SMTP failure/);
  assert.equal(transport.closed, true);
});

test('preview routing replaces all envelope recipients, not just the visible To header', async (t) => {
  t.mock.method(console, 'info');
  const transport = fakeTransport({ accepted: ['preview@example.com'], rejected: [] });
  const result = await sendEmail({
    ...message, cc: 'another@example.com', envelope: { to: ['live@example.com'] },
  }, {
    ...baseEnvironment, SMTP_PORT: '587', VERCEL_ENV: 'preview', EMAIL_TEST_INBOX: 'preview@example.com',
  }, transport.create);
  assert.equal(transport.outgoing.to, 'preview@example.com');
  assert.equal(transport.outgoing.bcc, undefined);
  assert.equal(transport.outgoing.cc, undefined);
  assert.deepEqual(transport.outgoing.envelope.to, ['preview@example.com']);
  assert.equal(result.redirected, true);
  assert.equal(result.testInbox, 'preview@example.com');
});

test('a stalled SMTP exchange is bounded by an overall deadline and its transport closes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let closed = false;
  const sending = sendEmail(message, { ...baseEnvironment, SMTP_PORT: '587' }, () => ({
    sendMail: () => new Promise(() => {}),
    close() { closed = true; },
  }));
  const rejected = assert.rejects(sending, { code: 'ETIMEDOUT' });
  t.mock.timers.tick(25_000);
  await rejected;
  assert.equal(closed, true);
});

test('the cancellable SMTP adapter composes MIME and includes blind recipients only in the envelope', async () => {
  let instance;
  let mime = '';
  class Connection extends EventEmitter {
    constructor(options) { super(); this.options = options; instance = this; }
    connect(callback) { callback(); }
    login(auth, callback) { this.auth = auth; callback(); }
    send(envelope, stream, callback) {
      this.envelope = envelope;
      stream.on('data', (chunk) => { mime += chunk; });
      stream.on('end', () => callback(null, { accepted: envelope.to, rejected: [] }));
    }
    close() { this.closed = true; this.emit('end'); }
  }
  const transport = createSmtpTransport({ auth: { user: 'audit', pass: 'audit-password' } }, Connection);
  const result = await transport.sendMail({
    from: baseEnvironment.SMTP_FROM, to: message.to, bcc: message.bcc,
    subject: 'Test application', text: 'Candidate details',
    attachments: [{ filename: 'cv.pdf', content: Buffer.from('%PDF-1.7\n'), contentType: 'application/pdf' }],
  });
  assert.deepEqual(instance.envelope.to, [message.to, message.bcc]);
  assert.match(mime, /Content-Type: application\/pdf/);
  assert.match(mime, /filename=cv.pdf/);
  assert.doesNotMatch(mime, /^Bcc:/im);
  assert.equal(instance.closed, true);
  assert.ok(result.messageId);
});

test('the SMTP adapter closes active connections on deadline and never sends after failed authentication', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let closed = false;
  let sent = false;
  class StalledConnection extends EventEmitter {
    connect() {}
    close() { closed = true; this.emit('end'); }
  }
  const sending = sendEmail(message, { ...baseEnvironment, SMTP_PORT: '587' },
    (options) => createSmtpTransport(options, StalledConnection));
  const rejection = assert.rejects(sending, { code: 'ETIMEDOUT' });
  t.mock.timers.tick(25_000);
  await rejection;
  assert.equal(closed, true);
  class UnauthenticatedConnection extends EventEmitter {
    connect(callback) { callback(); }
    login(_auth, callback) { callback(new Error('Audit auth rejected')); }
    send() { sent = true; }
    close() { this.emit('end'); }
  }
  await assert.rejects(createSmtpTransport({ auth: {} }, UnauthenticatedConnection).sendMail(message), /auth rejected/);
  assert.equal(sent, false);
});