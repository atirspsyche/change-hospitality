import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getSmtpConfiguration, MailConfigurationError } from './mail.js';

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