/**
 * models/Forum.js — Forums, topics, and replies data access.
 *
 * Forum reading is open to guests; posting requires authentication (enforced in
 * routes/forum.js via requireAuth).
 *
 * Soft-deleted replies set deleted_at but are only hard-deleted after the 15-
 * minute user grace window by the node-cron hardDeleteSoftReplies task.
 *
 * @ref docs/models/Forum.md
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md § DSA Art. 17
 */

'use strict';

const db = require('../config/database');

// ── Forums ────────────────────────────────────────────────────────────────────

async function getAllForums() {
  return db.all('SELECT * FROM nuzlox_forums ORDER BY sort_order ASC, id ASC');
}

async function getForumBySlug(slug) {
  return db.get('SELECT * FROM nuzlox_forums WHERE slug = ?', [slug]);
}

// ── Topics ────────────────────────────────────────────────────────────────────

async function getTopicsByForum(forumId, { limit = 20, offset = 0 } = {}) {
  return db.all(
    `SELECT t.*, u.username AS author_username
     FROM nuzlox_topics t
     JOIN users u ON u.id = t.user_id
     WHERE t.forum_id = ? AND t.status != 'deleted'
     ORDER BY t.last_reply_at DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    [forumId, limit, offset]
  );
}

async function getTopicBySlug(slug) {
  return db.get(
    `SELECT t.*, u.username AS author_username
     FROM nuzlox_topics t
     JOIN users u ON u.id = t.user_id
     WHERE t.slug = ? AND t.status != 'deleted'`,
    [slug]
  );
}

async function createTopic({ forumId, userId, title, slug }) {
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_topics (forum_id, user_id, title, slug, status)
     VALUES (?, ?, ?, ?, 'open')`,
    [forumId, userId, title, slug]
  );
  return lastId;
}

// ── Replies ───────────────────────────────────────────────────────────────────

async function getRepliesByTopic(topicId) {
  return db.all(
    `SELECT r.*, u.username AS author_username
     FROM nuzlox_forum_replies r
     JOIN users u ON u.id = r.user_id
     WHERE r.topic_id = ? AND r.deleted_at IS NULL AND r.status = 'visible'
     ORDER BY r.created_at ASC`,
    [topicId]
  );
}

async function createReply({ topicId, userId, content }) {
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_forum_replies (topic_id, user_id, content, status)
     VALUES (?, ?, ?, 'visible')`,
    [topicId, userId, content]
  );
  // Update topic reply count and last_reply_at.
  await db.run(
    `UPDATE nuzlox_topics
     SET reply_count = reply_count + 1, last_reply_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [topicId]
  );
  return lastId;
}

/**
 * Soft-deletes a reply within the 15-minute user grace window.
 * After grace window, deletion requires moderator action.
 *
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md § DSA Art. 17
 */
async function softDeleteReply(replyId, userId) {
  const reply = await db.get(
    'SELECT * FROM nuzlox_forum_replies WHERE id = ? AND user_id = ?',
    [replyId, userId]
  );
  if (!reply) return false;
  const ageMs = Date.now() - new Date(reply.created_at).getTime();
  if (ageMs > 15 * 60 * 1000) return false; // grace window expired

  await db.run(
    'UPDATE nuzlox_forum_replies SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
    [replyId]
  );
  return true;
}

async function markRulingPrecedent(replyId, isRuling) {
  await db.run(
    'UPDATE nuzlox_forum_replies SET is_ruling_precedent = ? WHERE id = ?',
    [isRuling ? 1 : 0, replyId]
  );
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

async function uniqueSlug(base) {
  let slug    = slugify(base);
  let attempt = slug;
  let suffix  = 1;
  while (await db.get('SELECT id FROM nuzlox_topics WHERE slug = ?', [attempt])) {
    attempt = `${slug}-${++suffix}`;
  }
  return attempt;
}

module.exports = {
  getAllForums, getForumBySlug,
  getTopicsByForum, getTopicBySlug, createTopic,
  getRepliesByTopic, createReply, softDeleteReply, markRulingPrecedent,
  slugify, uniqueSlug,
};
