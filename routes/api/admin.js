/**
 * routes/api/admin.js — Admin-only moderation and ruleset management API.
 *
 * POST /api/v1/admin/ruleset/publish    — publish a ruleset version
 * GET  /api/v1/admin/moderation/queue  — get moderation queue
 * POST /api/v1/admin/moderation/action — take a moderation action
 * POST /api/v1/admin/forum/cite        — mark a reply as ruling precedent
 *
 * @ref docs/routes/api/admin.md
 */

'use strict';

const express       = require('express');
const router        = express.Router();
const requireAuth   = require('../../middleware/requireAuth');
const requireAdmin  = require('../../middleware/requireAdmin');
const Ruleset       = require('../../models/Ruleset');
const Moderation    = require('../../models/Moderation');
const Forum         = require('../../models/Forum');
const db            = require('../../config/database');
const emailSvc      = require('../../services/email');
const User          = require('../../models/User');
const { z }         = require('zod');

router.use(requireAuth, requireAdmin);

// ── Ruleset publish ───────────────────────────────────────────────────────────

router.post('/ruleset/publish', async (req, res, next) => {
  const schema = z.object({ version_id: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'version_id required.' });
  try {
    await Ruleset.publish(parsed.data.version_id, req.session.user.id);
    // Regenerate the ruleset validator JSON. We do this inline for simplicity;
    // for large rulesets a background job would be appropriate.
    const { execFile } = require('child_process');
    execFile('node', ['scripts/generate-ruleset-cache.js'], { cwd: process.cwd() },
      (err) => err && console.error('[admin] Cache regen error:', err.message));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Moderation queue ──────────────────────────────────────────────────────────

router.get('/moderation/queue', async (req, res, next) => {
  try {
    const queue = await Moderation.getPendingQueue();
    res.json(queue);
  } catch (err) { next(err); }
});

router.post('/moderation/action', async (req, res, next) => {
  const schema = z.object({
    content_id:   z.number().int().positive(),
    content_type: z.enum(['reply','topic']),
    user_id:      z.number().int().positive(),
    action_type:  z.enum(['removal','suspension','warning']),
    reason_code:  z.string(),
    tos_clause:   z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid action data.' });
  try {
    const d        = parsed.data;
    const actionId = await Moderation.createAction({ ...d, automated: false });

    if (d.action_type === 'removal') {
      await db.run(
        `UPDATE nuzlox_forum_replies SET status = 'deleted' WHERE id = ?`,
        [d.content_id]
      );
    } else if (d.action_type === 'suspension') {
      await db.run('UPDATE users SET role = ? WHERE id = ?', ['suspended', d.user_id]);
    }

    const user      = await User.findById(d.user_id);
    const appealUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/account/appeal/${actionId}`;
    if (user) {
      await emailSvc.sendSOR(user.email, {
        actionId, actionType: d.action_type, reasonCode: d.reason_code,
        tosClause: d.tos_clause, automated: false, appealUrl,
      });
      await Moderation.markSorSent(actionId, 'email');
    }
    res.json({ ok: true, action_id: actionId });
  } catch (err) { next(err); }
});

// ── Cite reply as ruling precedent ────────────────────────────────────────────

router.post('/forum/cite', async (req, res, next) => {
  const schema = z.object({
    reply_id:   z.number().int().positive(),
    is_ruling:  z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'reply_id and is_ruling required.' });
  try {
    await Forum.markRulingPrecedent(parsed.data.reply_id, parsed.data.is_ruling);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
