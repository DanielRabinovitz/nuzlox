/**
 * services/moderation.js — Automated content scanning and moderation queue.
 *
 * scan() is called with setImmediate after a reply is saved, so it does not
 * block the HTTP response. If a high-confidence violation is found, the reply
 * is set to 'held' and a SOR email is queued.
 *
 * Blocked phrases are loaded from the DB into the in-process cache at startup
 * to avoid a DB query on every post.
 *
 * @ref docs/services/moderation.md
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md
 */

'use strict';

const db         = require('../config/database');
const cache      = require('../config/cache');
const Moderation = require('../models/Moderation');
const emailSvc   = require('./email');
const User       = require('../models/User');

const PHRASES_CACHE_KEY = 'pk:blocked_phrases';

async function getBlockedPhrases() {
  let phrases = cache.get(PHRASES_CACHE_KEY);
  if (!phrases) {
    const rows = await db.all('SELECT phrase, severity FROM nuzlox_blocked_phrases');
    phrases    = rows;
    cache.set(PHRASES_CACHE_KEY, phrases, 3600);
  }
  return phrases;
}

/**
 * Scans forum reply or topic content asynchronously.
 * Called with setImmediate after content is saved to avoid blocking the response.
 *
 * @param {{ contentId, contentType, userId, content }} opts
 */
async function scan({ contentId, contentType, userId, content }) {
  try {
    const phrases    = await getBlockedPhrases();
    const lower      = content.toLowerCase();
    const violations = phrases.filter(p => lower.includes(p.phrase.toLowerCase()));

    const highConfidence = violations.some(v => v.severity === 'high');
    const hasViolation   = violations.length > 0;

    // Enqueue for moderation review regardless.
    await Moderation.enqueue({
      contentId, contentType, userId,
      scanResult: { violations: violations.map(v => v.phrase), highConfidence },
    });

    if (highConfidence) {
      // Hold the content immediately.
      await db.run(
        `UPDATE nuzlox_forum_replies SET status = 'held' WHERE id = ?`,
        [contentId]
      );
      const actionId = await Moderation.createAction({
        contentId, contentType, userId,
        actionType:  'removal',
        reasonCode:  'tos_violation',
        automated:   true,
      });
      const user = await User.findById(userId);
      if (user) {
        const appealUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/account/appeal/${actionId}`;
        await emailSvc.sendSOR(user.email, {
          actionId,
          actionType:  'removal',
          reasonCode:  'tos_violation',
          tosClause:   '3.1 — Content standards',
          automated:   true,
          appealUrl,
        });
      }
    }
  } catch (err) {
    console.error('[moderation] Scan error:', err.message);
  }
}

/** Invalidates the phrases cache when an admin updates the blocked phrase list. */
function invalidatePhrasesCache() {
  cache.del(PHRASES_CACHE_KEY);
}

module.exports = { scan, getBlockedPhrases, invalidatePhrasesCache };
