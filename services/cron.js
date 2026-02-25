/**
 * services/cron.js — node-cron scheduled task definitions.
 *
 * All tasks are wrapped in try/catch. A cron failure must not crash the app.
 *
 * Tasks:
 *   enforceDataRetention   — daily 02:00: soft→hard delete expired events/accounts
 *   dsrDeadlineAlert       — daily 08:00: email privacy officer about approaching deadlines
 *   dmcaRepeatCheck        — weekly Mon 09:00: flag repeat DMCA infringers
 *   hardDeleteSoftReplies  — daily 03:00: purge user-grace-window reply deletions
 *
 * @ref docs/services/cron.md
 * @ref wallbreaker/docs/legal/data-privacy.md § Data Retention
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md § DSA Art. 17
 */

'use strict';

const cron    = require('node-cron');
const db      = require('../config/database');
const DSR     = require('../models/DSR');
const emailSvc = require('./email');

function start() {
  // ── Data retention: hard-delete events past 30-day soft-delete window ──────
  cron.schedule('0 2 * * *', async () => {
    try {
      const { changes } = await db.run(
        `DELETE FROM nuzlox_playthrough_events
         WHERE deleted_at IS NOT NULL
           AND deleted_at <= datetime(CURRENT_TIMESTAMP, '-30 days')`
      );
      if (changes) console.log(`[cron:retention] Hard-deleted ${changes} expired events.`);
    } catch (err) {
      console.error('[cron:retention] Error:', err.message);
    }
  });

  // ── Anonymize accounts past 30-day deletion grace period ─────────────────
  cron.schedule('0 2 * * *', async () => {
    try {
      const { changes } = await db.run(
        `UPDATE users
         SET email = 'deleted_' || id || '@deleted.invalid',
             username = NULL,
             password_hash = 'DELETED',
             date_of_birth = NULL
         WHERE deleted_at IS NOT NULL
           AND deleted_at <= datetime(CURRENT_TIMESTAMP, '-30 days')
           AND email NOT LIKE 'deleted_%'`
      );
      if (changes) console.log(`[cron:anonymize] Anonymized ${changes} deleted accounts.`);
    } catch (err) {
      console.error('[cron:anonymize] Error:', err.message);
    }
  });

  // ── DSR deadline alerts ───────────────────────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    try {
      const approaching = await DSR.getPendingApproachingDeadline(5);
      if (approaching.length > 0) {
        const privacyEmail = process.env.PRIVACY_EMAIL || 'privacy@nuzlox.com';
        await emailSvc.sendDsrDeadlineAlert(privacyEmail, approaching);
        console.log(`[cron:dsr] Alerted privacy officer about ${approaching.length} upcoming deadlines.`);
      }
    } catch (err) {
      console.error('[cron:dsr] Error:', err.message);
    }
  });

  // ── Hard-delete user grace-window reply soft-deletes (>15 minutes old) ────
  cron.schedule('0 3 * * *', async () => {
    try {
      const { changes } = await db.run(
        `DELETE FROM nuzlox_forum_replies
         WHERE deleted_at IS NOT NULL
           AND deleted_at <= datetime(CURRENT_TIMESTAMP, '-15 minutes')
           AND id NOT IN (
             SELECT content_id FROM nuzlox_moderation_actions
             WHERE content_type = 'reply'
           )`
      );
      if (changes) console.log(`[cron:replies] Hard-deleted ${changes} grace-window replies.`);
    } catch (err) {
      console.error('[cron:replies] Error:', err.message);
    }
  });

  // ── DMCA repeat infringer check (weekly) ─────────────────────────────────
  cron.schedule('0 9 * * 1', async () => {
    try {
      const flagged = await db.all(
        `SELECT uploader_id, COUNT(*) AS count
         FROM nuzlox_dmca_notices
         WHERE notice_valid = 1
           AND action_taken = 'removed'
           AND received_at >= datetime(CURRENT_TIMESTAMP, '-1 year')
         GROUP BY uploader_id
         HAVING count >= 3`
      );
      if (flagged.length) {
        console.log(`[cron:dmca] ${flagged.length} repeat infringer(s) flagged for review.`);
      }
    } catch (err) {
      console.error('[cron:dmca] Error:', err.message);
    }
  });

  console.log('[cron] Scheduled tasks started.');
}

module.exports = { start };
