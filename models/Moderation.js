/**
 * models/Moderation.js — Moderation queue, actions, appeals, and reports.
 *
 * @ref docs/models/Moderation.md
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md § DSA Art. 17, 20
 */

'use strict';

const db = require('../config/database');

// ── Queue ─────────────────────────────────────────────────────────────────────

async function enqueue({ contentId, contentType, userId, scanResult = null }) {
  return db.run(
    `INSERT INTO nuzlox_moderation_queue
       (content_id, content_type, user_id, status, scan_result)
     VALUES (?, ?, ?, 'pending', ?)`,
    [contentId, contentType, userId, JSON.stringify(scanResult)]
  );
}

async function getPendingQueue() {
  return db.all(
    `SELECT q.*, u.username AS author_username
     FROM nuzlox_moderation_queue q
     JOIN users u ON u.id = q.user_id
     WHERE q.status != 'resolved'
     ORDER BY
       CASE q.status
         WHEN 'pending' THEN 1
         WHEN 'review_pending' THEN 2
       END,
       q.submitted_at ASC`
  );
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function createAction({ contentId, contentType, userId, actionType, reasonCode, tosClause, automated = false }) {
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_moderation_actions
       (content_id, content_type, user_id, action_type, reason_code,
        tos_clause, automated, appeal_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+14 days'))`,
    [contentId, contentType, userId, actionType, reasonCode, tosClause || null, automated ? 1 : 0]
  );
  return lastId;
}

async function markSorSent(actionId, method) {
  await db.run(
    `UPDATE nuzlox_moderation_actions
     SET sor_sent_at = CURRENT_TIMESTAMP, sor_method = ?, human_reviewed = 1
     WHERE id = ?`,
    [method, actionId]
  );
}

// ── Appeals ───────────────────────────────────────────────────────────────────

async function createAppeal({ actionId, userId, reason }) {
  return db.run(
    `INSERT INTO nuzlox_moderation_appeals
       (action_id, user_id, reason, status)
     VALUES (?, ?, ?, 'pending')`,
    [actionId, userId, reason]
  );
}

async function resolveAppeal(appealId, { status, outcomeReason }) {
  return db.run(
    `UPDATE nuzlox_moderation_appeals
     SET status = ?, outcome_reason = ?, resolved_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, outcomeReason, appealId]
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────

async function createReport({ reporterId, contentId, contentType, category, description, ipHash }) {
  return db.run(
    `INSERT INTO nuzlox_reports
       (reporter_id, content_id, content_type, category, description, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reporterId || null, contentId, contentType, category, description || null, ipHash || null]
  );
}

async function getReportsByUser(userId) {
  return db.all(
    `SELECT * FROM nuzlox_reports
     WHERE reporter_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
}

// ── User relationships (block/mute) ───────────────────────────────────────────

async function setRelationship({ userId, targetUserId, relationship }) {
  return db.run(
    `INSERT OR REPLACE INTO nuzlox_user_relationships
       (user_id, target_user_id, relationship)
     VALUES (?, ?, ?)`,
    [userId, targetUserId, relationship]
  );
}

async function removeRelationship({ userId, targetUserId, relationship }) {
  return db.run(
    `DELETE FROM nuzlox_user_relationships
     WHERE user_id = ? AND target_user_id = ? AND relationship = ?`,
    [userId, targetUserId, relationship]
  );
}

async function getBlockedIds(userId) {
  const rows = await db.all(
    `SELECT target_user_id FROM nuzlox_user_relationships
     WHERE user_id = ? AND relationship = 'block'`,
    [userId]
  );
  return rows.map(r => r.target_user_id);
}

module.exports = {
  enqueue, getPendingQueue,
  createAction, markSorSent,
  createAppeal, resolveAppeal,
  createReport, getReportsByUser,
  setRelationship, removeRelationship, getBlockedIds,
};
