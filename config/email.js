/**
 * config/email.js — Nodemailer transport configuration.
 *
 * In development (EMAIL_DRIVER=console or default), email content is printed
 * to stdout instead of sent — zero external dependency for local work.
 *
 * In production (EMAIL_DRIVER=smtp), uses Resend or Brevo as an SMTP relay.
 * Transactional and marketing email use the same transport; caller
 * (services/email.js) is responsible for suppression list checks before
 * sending marketing mail.
 *
 * @ref docs/config/email.md
 * @ref wallbreaker/docs/legal/email-and-marketing.md
 */

'use strict';

const nodemailer = require('nodemailer');

const driver = process.env.EMAIL_DRIVER || 'console';

let transport;

if (driver === 'smtp') {
  transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // Console transport for development: prints email to stdout.
  transport = {
    sendMail(options) {
      console.log('\n──── [EMAIL] ────────────────────────────────────────');
      console.log(`To:      ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:    ${options.text || options.html}`);
      console.log('────────────────────────────────────────────────────\n');
      return Promise.resolve({ messageId: `dev-${Date.now()}` });
    },
  };
}

module.exports = { transport, from: process.env.EMAIL_FROM || 'noreply@nuzlox.com' };
