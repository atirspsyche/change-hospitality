import nodemailer from 'nodemailer';

export class MailConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MailConfigurationError';
  }
}

function requiredEnvironmentValue(environment, primaryName, fallbackName) {
  const value = environment[primaryName] || (fallbackName ? environment[fallbackName] : '');
  if (!value) {
    throw new MailConfigurationError(`Missing ${primaryName} environment variable.`);
  }
  return value;
}

export function getSmtpConfiguration(environment = process.env) {
  const host = requiredEnvironmentValue(environment, 'SMTP_SERVER', 'SMTP_HOST');
  const portValue = requiredEnvironmentValue(environment, 'SMTP_PORT');
  const user = requiredEnvironmentValue(environment, 'SMTP_LOGIN', 'SMTP_USER');
  const pass = requiredEnvironmentValue(environment, 'SMTP_PASSWORD', 'SMTP_PASS');
  const from = requiredEnvironmentValue(environment, 'SMTP_FROM');
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new MailConfigurationError('SMTP_PORT must be a valid TCP port.');
  }

  const secure = environment.SMTP_SECURE
    ? environment.SMTP_SECURE.toLowerCase() === 'true'
    : port === 465;

  return { host, port, secure, user, pass, from };
}

export async function sendEmail(message, environment = process.env) {
  const configuration = getSmtpConfiguration(environment);
  const transport = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTLS: !configuration.secure && configuration.port === 587,
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

  try {
    const result = await transport.sendMail({
      ...message,
      from: configuration.from,
    });

    if (!result.accepted?.length) {
      throw new Error('The SMTP server did not accept any recipients.');
    }

    if (result.rejected?.length) {
      console.error('SMTP rejected one or more recipients:', result.rejected);
    }

    return result;
  } finally {
    transport.close();
  }
}