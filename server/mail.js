import addressparser from 'nodemailer/lib/addressparser';
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import MailComposer from 'nodemailer/lib/mail-composer';
import { isEmailAddress } from './form-utils.js';

export class MailConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MailConfigurationError';
  }
}

function requiredEnvironmentValue(environment, primaryName, fallbackName) {
  const value = environment[primaryName] || (fallbackName ? environment[fallbackName] : '');
  if (typeof value !== 'string' || !value.trim()) {
    throw new MailConfigurationError(`Missing ${primaryName} environment variable.`);
  }
  return value;
}

export function getSmtpConfiguration(environment = process.env) {
  const host = requiredEnvironmentValue(environment, 'SMTP_SERVER', 'SMTP_HOST').trim();
  const portValue = requiredEnvironmentValue(environment, 'SMTP_PORT');
  const user = requiredEnvironmentValue(environment, 'SMTP_LOGIN', 'SMTP_USER');
  const pass = requiredEnvironmentValue(environment, 'SMTP_PASSWORD', 'SMTP_PASS');
  const from = requiredEnvironmentValue(environment, 'SMTP_FROM').trim();
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new MailConfigurationError('SMTP_PORT must be a valid TCP port.');
  }

  const secureValue = environment.SMTP_SECURE?.trim().toLowerCase();
  if (secureValue !== undefined && !['true', 'false'].includes(secureValue)) {
    throw new MailConfigurationError('SMTP_SECURE must be true or false.');
  }
  const secure = secureValue !== undefined
    ? secureValue === 'true'
    : port === 465;

  if (port === 465 && !secure) {
    throw new MailConfigurationError('SMTP port 465 requires implicit TLS.');
  }
  const senders = addressparser(from);
  if (/[\r\n\x00]/.test(from) || senders.length !== 1 || !isEmailAddress(senders[0].address)) {
    throw new MailConfigurationError('SMTP_FROM must contain exactly one valid sender address.');
  }
  if (/[\s/]/.test(host)) throw new MailConfigurationError('SMTP_SERVER must be a hostname.');

  const testInbox = environment.EMAIL_TEST_INBOX?.trim().toLowerCase();
  if (testInbox && !isEmailAddress(testInbox)) {
    throw new MailConfigurationError('EMAIL_TEST_INBOX must be a valid email address.');
  }
  if (environment.VERCEL_ENV === 'production' && testInbox) {
    throw new MailConfigurationError('EMAIL_TEST_INBOX must not be set in Production.');
  }
  if (['preview', 'development'].includes(environment.VERCEL_ENV) && !testInbox) {
    throw new MailConfigurationError('EMAIL_TEST_INBOX is required outside Vercel Production.');
  }
  return { host, port, secure, user, pass, from, testInbox };
}

export function acceptedRecipient(result, address) {
  return result?.accepted?.some((value) => typeof value === 'string' &&
    value.toLowerCase() === address?.toLowerCase()) === true;
}

export function confirmMailAcceptance(result, recipients) {
  const expected = result?.redirected ? [result.testInbox] : recipients;
  if (!expected.some((address) => isEmailAddress(address) && acceptedRecipient(result, address))) {
    throw new Error('The SMTP server did not confirm an intended recipient.');
  }
}

export function logMailFailure(flow, reference, error) {
  console.error('Submission email failed.', {
    flow, reference, name: error?.name, code: error?.code,
    command: error?.command, responseCode: error?.responseCode,
    ...(error instanceof MailConfigurationError ? { configuration: error.message } : {}),
  });
}

// SMTPTransport.close() does not close an active socket. The public connection API lets the deadline do so.
export function createSmtpTransport(options, Connection = SMTPConnection) {
  let connection;
  return {
    sendMail(message) {
      return new Promise((resolve, reject) => {
        const compiled = new MailComposer(message).compile();
        const envelope = compiled.getEnvelope();
        connection = new Connection(options);
        let settled = false;
        let content;
        const finish = (error, info) => {
          if (settled) return;
          settled = true;
          content?.destroy();
          connection.close();
          if (error) reject(error);
          else resolve({ ...info, envelope, messageId: compiled.messageId() });
        };
        connection.once('error', (error) => finish(error));
        connection.once('end', () => finish(new Error('The SMTP connection closed before acceptance was confirmed.')));
        const send = () => {
          if (settled) return;
          content = compiled.createReadStream();
          connection.send(envelope, content, finish);
        };
        connection.connect(() => {
          if (settled) return;
          connection.login(options.auth, (error) => {
            if (error) finish(error);
            else send();
          });
        });
      });
    },
    close() { connection?.close(); },
  };
}

export async function sendEmail(message, environment = process.env, createTransport = createSmtpTransport) {
  const configuration = getSmtpConfiguration(environment);
  const transport = createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTLS: !configuration.secure,
    auth: {
      user: configuration.user,
      pass: configuration.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: {
      minVersion: 'TLSv1.2',
    },
  });

  let deadline;
  try {
    const outgoing = {
      ...message, from: configuration.from,
      disableFileAccess: true, disableUrlAccess: true,
      ...(configuration.testInbox ? {
        to: configuration.testInbox, cc: undefined, bcc: undefined,
        envelope: { from: addressparser(configuration.from)[0].address, to: [configuration.testInbox] },
      } : {}),
    };
    const result = await Promise.race([
      transport.sendMail(outgoing),
      new Promise((_, reject) => {
        deadline = setTimeout(() => {
          reject(Object.assign(new Error('SMTP acceptance deadline exceeded.'), { code: 'ETIMEDOUT' }));
        }, 25_000);
      }),
    ]);
    const recipients = configuration.testInbox
      ? [configuration.testInbox]
      : [message.to, message.bcc].filter(Boolean);
    confirmMailAcceptance(result, recipients);
    const log = result.rejected?.length ? console.error : console.info;
    log('SMTP acceptance outcome.', {
      reference: message.headers?.['X-Change-Hospitality-Reference'],
      messageId: result.messageId,
      acceptedCount: result.accepted.length,
      rejectedCount: result.rejected?.length || 0,
      redirected: Boolean(configuration.testInbox),
    });
    return { ...result, redirected: Boolean(configuration.testInbox), testInbox: configuration.testInbox };
  } finally {
    clearTimeout(deadline);
    transport.close();
  }
}