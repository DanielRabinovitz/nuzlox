/**
 * models/Consent.js — Consent record reads and withdrawals.
 *
 * Consent records are written in models/User.js at registration.
 * This module handles reads (for DSR access exports) and withdrawals (marketing opt-out).
 *
 * @ref docs/models/Consent.md
 * @ref wallbreaker/docs/legal/data-privacy.md § Consent Management
 * @ref wallbreaker/docs/legal/email-and-marketing.md
 */

'use strict';

const db = require('../config/database');

async function getByUser(userId) {
  return db.all(
    'SELECT * FROM nuzlox_consent_records WHERE user_id = ? ORDER BY recorded_at DESC',
    [userId]
  );
}

/**
 * Records withdrawal of marketing consent (unsubscribe).
 * Does NOT withdraw ToS consent — ToS is not withdrawable; account deletion
 * is the mechanism to stop all processing.
 *
 * @ref wallbreaker/docs/legal/email-and-marketing.md — Unsubscribe
 */
async function withdrawMarketing(userId) {
  await db.run(
    `UPDATE nuzlox_consent_records
     SET withdrawn_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND consent_type = 'marketing_email' AND withdrawn_at IS NULL`,
    [userId]
  );
  await db.run(
    'UPDATE users SET marketing_opt_in = 0 WHERE id = ?',
    [userId]
  );
}

module.exports = { getByUser, withdrawMarketing };
