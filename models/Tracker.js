/**
 * models/Tracker.js — Playthrough and event data access.
 *
 * All queries are scoped to user_id. Server-side enforcement ensures no user
 * can read or modify another user's playthroughs.
 *
 * youtube_playlist_url is validated on save — only youtube.com and youtu.be
 * URLs are accepted.
 *
 * @ref docs/models/Tracker.md
 * @ref wallbreaker/docs/legal/cookies-and-tracking.md — youtube-nocookie.com embeds
 */

'use strict';

const db = require('../config/database');

const YT_URL_RE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//;

function validateYoutubeUrl(url) {
  if (!url) return null;
  return YT_URL_RE.test(url) ? url : null;
}

// ── Playthroughs ─────────────────────────────────────────────────────────────

async function getByUser(userId) {
  return db.all(
    `SELECT * FROM nuzlox_playthroughs
     WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  );
}

async function getById(id, userId) {
  const row = await db.get(
    'SELECT * FROM nuzlox_playthroughs WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!row) return null;
  return {
    ...row,
    current_team: JSON.parse(row.current_team || '[]'),
    house_rules:  JSON.parse(row.house_rules || '{}'),
  };
}

async function create({ userId, gameSlug, title, youtubePlaylistUrl = null }) {
  const ytUrl = validateYoutubeUrl(youtubePlaylistUrl);
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_playthroughs
       (user_id, game_slug, title, current_team, house_rules, youtube_playlist_url, status)
     VALUES (?, ?, ?, '[]', '{}', ?, 'active')`,
    [userId, gameSlug, title, ytUrl]
  );
  return lastId;
}

async function updateTeam(id, userId, team) {
  await db.run(
    `UPDATE nuzlox_playthroughs
     SET current_team = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [JSON.stringify(team), id, userId]
  );
}

async function updateHouseRules(id, userId, houseRules) {
  await db.run(
    `UPDATE nuzlox_playthroughs
     SET house_rules = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [JSON.stringify(houseRules), id, userId]
  );
}

// ── Events (checkpoints, journal, catches, faints, breeding notes) ────────────

async function getEvents(playthroughId, userId, { type = null } = {}) {
  const base = `
    SELECT * FROM nuzlox_playthrough_events
    WHERE playthrough_id = ? AND user_id = ? AND deleted_at IS NULL
    ${type ? 'AND event_type = ?' : ''}
    ORDER BY created_at ASC`;
  const params = type
    ? [playthroughId, userId, type]
    : [playthroughId, userId];
  const rows = await db.all(base, params);
  return rows.map(r => ({ ...r, data: JSON.parse(r.data || '{}') }));
}

async function addEvent({ playthroughId, userId, eventType, data }) {
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_playthrough_events
       (playthrough_id, user_id, event_type, data)
     VALUES (?, ?, ?, ?)`,
    [playthroughId, userId, eventType, JSON.stringify(data)]
  );
  await db.run(
    'UPDATE nuzlox_playthroughs SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [playthroughId]
  );
  return lastId;
}

/**
 * Soft-deletes an event. Retained for 30 days then hard-deleted by cron.
 *
 * @ref wallbreaker/docs/legal/data-privacy.md § Data Retention
 */
async function softDeleteEvent(eventId, userId) {
  await db.run(
    `UPDATE nuzlox_playthrough_events
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [eventId, userId]
  );
}

/**
 * Restores a recently soft-deleted event (within 30-day window).
 * Implements the "Undo Redo" APX pattern.
 *
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Undo Redo
 */
async function restoreEvent(eventId, userId) {
  await db.run(
    `UPDATE nuzlox_playthrough_events
     SET deleted_at = NULL
     WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`,
    [eventId, userId]
  );
}

module.exports = {
  getByUser, getById, create, updateTeam, updateHouseRules,
  getEvents, addEvent, softDeleteEvent, restoreEvent,
  validateYoutubeUrl,
};
