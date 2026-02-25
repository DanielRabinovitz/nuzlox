/**
 * models/EmailSuppression.js — Email suppression list (unsubscribes, bounces).
 *
 * Before sending any marketing email, services/email.js calls isSuppressed()
 * to check whether the address is on the suppression list.
 * Transactional email (verification, SOR, password reset) bypasses this check.
 *
 * Email addresses are stored as SHA-256 hashes, not plaintext.
 *
 * @ref docs/models/EmailSuppression.md
 * @ref wallbreaker/docs/legal/email-and-marketing.md — Unsubscribe
 */

'use strict';

const crypto = require('crypto');
const db     = require('../config/database');

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

async function suppress({ email, type, source }) {
  const hash = hashEmail(email);
  await db.run(
    `INSERT OR IGNORE INTO nuzlox_email_suppressions
       (email_hash, suppression_type, source)
     VALUES (?, ?, ?)`,
    [hash, type, source || null]
  );
}

async function isSuppressed(email) {
  const hash = hashEmail(email);
  const row  = await db.get(
    'SELECT id FROM nuzlox_email_suppressions WHERE email_hash = ?',
    [hash]
  );
  return !!row;
}

module.exports = { suppress, isSuppressed, hashEmail };
