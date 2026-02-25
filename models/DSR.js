/**
 * models/DSR.js — Data Subject Request portal data access.
 *
 * @ref docs/models/DSR.md
 * @ref wallbreaker/docs/legal/data-privacy.md § DSR Portal
 * @ref wallbreaker/docs/legal/data-privacy.md § Quebec Law 25 — De-indexing
 */

'use strict';

const db = require('../config/database');

const VALID_TYPES = ['access', 'deletion', 'correction', 'portability', 'deindex'];

/**
 * Creates a new DSR request with a 30-day deadline.
 *
 * @ref wallbreaker/docs/legal/data-privacy.md § Response Timelines
 */
async function create({ userId, email, requestType, description }) {
  if (!VALID_TYPES.includes(requestType)) {
    throw new Error(`Invalid request type: ${requestType}`);
  }
  return db.run(
    `INSERT INTO nuzlox_dsr_requests
       (user_id, email, request_type, description, status, deadline_at)
     VALUES (?, ?, ?, ?, 'pending',
       datetime(CURRENT_TIMESTAMP, '+30 days'))`,
    [userId || null, email, requestType, description || null]
  );
}

async function getByUser(userId) {
  return db.all(
    `SELECT * FROM nuzlox_dsr_requests
     WHERE user_id = ?
     ORDER BY received_at DESC`,
    [userId]
  );
}

async function getPendingApproachingDeadline(daysAhead = 5) {
  return db.all(
    `SELECT * FROM nuzlox_dsr_requests
     WHERE status IN ('pending', 'in_progress')
       AND deadline_at <= datetime(CURRENT_TIMESTAMP, '+${daysAhead} days')
     ORDER BY deadline_at ASC`
  );
}

async function updateStatus(id, status) {
  const fulfilled = status === 'fulfilled'
    ? ', fulfilled_at = CURRENT_TIMESTAMP'
    : '';
  await db.run(
    `UPDATE nuzlox_dsr_requests SET status = ?${fulfilled} WHERE id = ?`,
    [status, id]
  );
}

module.exports = { create, getByUser, getPendingApproachingDeadline, updateStatus };
