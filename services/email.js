/**
 * services/email.js — Email sending helpers.
 *
 * All outbound email goes through this module. Marketing email checks the
 * suppression list before sending. Transactional email bypasses suppression.
 *
 * @ref docs/services/email.md
 * @ref wallbreaker/docs/legal/email-and-marketing.md
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md § DSA Art. 17 (SOR emails)
 */

'use strict';

const { transport, from } = require('../config/email');
const EmailSuppression    = require('../models/EmailSuppression');

const SITE_URL = () => process.env.SITE_URL || 'http://localhost:3000';

async function send({ to, subject, text, html, isMarketing = false }) {
  if (isMarketing && await EmailSuppression.isSuppressed(to)) {
    console.log(`[email] Suppressed marketing email to: ${to}`);
    return;
  }
  return transport.sendMail({ from, to, subject, text, html });
}

async function sendVerification(email, token) {
  const link = `${SITE_URL()}/verify-email?token=${token}`;
  return send({
    to:      email,
    subject: 'Verify your Nuzlox account',
    text:    `Welcome to Nuzlox! Please verify your email: ${link}`,
  });
}

async function sendPasswordReset(email, token) {
  const link = `${SITE_URL()}/reset-password?token=${token}`;
  return send({
    to:      email,
    subject: 'Reset your Nuzlox password',
    text:    `Click to reset your password: ${link}\n\nThis link expires in 1 hour.`,
  });
}

/**
 * Sends a Statement of Reasons (SOR) to a user after a moderation action.
 * Required by DSA Art. 17.
 *
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md § DSA Art. 17
 */
async function sendSOR(email, { actionId, actionType, reasonCode, tosClause, automated, appealUrl }) {
  const automatedNote = automated
    ? 'This action was taken automatically and has been queued for human review.'
    : 'This action was taken by a human moderator.';
  return send({
    to:      email,
    subject: `Nuzlox — Action taken on your content`,
    text:
      `A moderation action has been taken on your Nuzlox account.\n\n` +
      `Action:        ${actionType}\n` +
      `Reason:        ${reasonCode}\n` +
      `ToS clause:    ${tosClause || 'N/A'}\n` +
      `${automatedNote}\n\n` +
      `You may appeal this decision within 14 days:\n${appealUrl}\n\n` +
      `If you believe this was an error, please use the appeal link above.\n` +
      `— The Nuzlox moderation team`,
  });
}

async function sendDsrDeadlineAlert(privacyEmail, dsrRows) {
  const list = dsrRows.map(r =>
    `  ID ${r.id}: ${r.request_type} — deadline ${r.deadline_at}`).join('\n');
  return send({
    to:      privacyEmail,
    subject: `[Nuzlox] ${dsrRows.length} DSR request(s) approaching deadline`,
    text:    `The following DSR requests are approaching their 30-day deadline:\n\n${list}`,
  });
}

module.exports = { send, sendVerification, sendPasswordReset, sendSOR, sendDsrDeadlineAlert };
