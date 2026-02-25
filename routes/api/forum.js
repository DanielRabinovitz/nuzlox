/**
 * routes/api/forum.js — Forum API endpoints.
 *
 * POST /api/v1/forum/report — submit a content report (guest-accessible, rate-limited)
 * POST /api/v1/forum/block  — block a user (auth required)
 * POST /api/v1/forum/mute   — mute a user (auth required)
 *
 * @ref docs/routes/api/forum.md
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md
 */

'use strict';

const express        = require('express');
const crypto         = require('crypto');
const router         = express.Router();
const Moderation     = require('../../models/Moderation');
const requireAuth    = require('../../middleware/requireAuth');
const { reportLimiter } = require('../../middleware/rateLimiter');
const { z }          = require('zod');

router.post('/report', reportLimiter, async (req, res, next) => {
  const schema = z.object({
    content_id:   z.string().regex(/^\d+$/),
    content_type: z.enum(['reply', 'topic']),
    category:     z.enum(['illegal_content','spam','harassment','off_topic','other']),
    description:  z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid report data.' });
  }
  try {
    const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
    await Moderation.createReport({
      reporterId:  req.session.user?.id ?? null,
      contentId:   parseInt(parsed.data.content_id, 10),
      contentType: parsed.data.content_type,
      category:    parsed.data.category,
      description: parsed.data.description,
      ipHash,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/block', requireAuth, async (req, res, next) => {
  const schema = z.object({ target_user_id: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid user ID.' });
  try {
    await Moderation.setRelationship({
      userId:       req.session.user.id,
      targetUserId: parsed.data.target_user_id,
      relationship: 'block',
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/unblock', requireAuth, async (req, res, next) => {
  const schema = z.object({ target_user_id: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid user ID.' });
  try {
    await Moderation.removeRelationship({
      userId:       req.session.user.id,
      targetUserId: parsed.data.target_user_id,
      relationship: 'block',
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/mute', requireAuth, async (req, res, next) => {
  const schema = z.object({ target_user_id: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid user ID.' });
  try {
    await Moderation.setRelationship({
      userId:       req.session.user.id,
      targetUserId: parsed.data.target_user_id,
      relationship: 'mute',
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
