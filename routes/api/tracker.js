/**
 * routes/api/tracker.js — Playthrough tracker API endpoints.
 *
 * All routes require authentication. All operations are scoped to user_id.
 *
 * POST /api/v1/tracker/:id/team          — update current team
 * POST /api/v1/tracker/:id/journal/save  — auto-save journal entry
 * POST /api/v1/tracker/:id/event        — add a catch/faint/checkpoint event
 *
 * @ref docs/routes/api/tracker.md
 * @ref wallbreaker/docs/accessibility/WCAG/02-operable.md §2.2.2 (auto-save status)
 */

'use strict';

const express     = require('express');
const router      = express.Router();
const Tracker     = require('../../models/Tracker');
const requireAuth = require('../../middleware/requireAuth');
const { z }       = require('zod');

router.use(requireAuth);

router.post('/:id(\\d+)/team', async (req, res, next) => {
  const schema = z.object({
    team: z.array(z.object({
      species:  z.string(),
      nickname: z.string().optional(),
      status:   z.enum(['active','fainted','boxed']).optional(),
    })).max(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid team data.' });
  try {
    await Tracker.updateTeam(parseInt(req.params.id,10), req.session.user.id, parsed.data.team);
    res.json({ ok: true, saved_at: new Date().toISOString() });
  } catch (err) { next(err); }
});

router.post('/:id(\\d+)/journal/save', async (req, res, next) => {
  const schema = z.object({ content: z.string().max(50000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Journal content too long.' });
  try {
    const eventId = await Tracker.addEvent({
      playthroughId: parseInt(req.params.id, 10),
      userId:        req.session.user.id,
      eventType:     'journal',
      data:          { content: parsed.data.content },
    });
    res.json({ ok: true, event_id: eventId, saved_at: new Date().toISOString() });
  } catch (err) { next(err); }
});

router.post('/:id(\\d+)/event', async (req, res, next) => {
  const schema = z.object({
    event_type: z.enum(['checkpoint','catch','faint','breeding_note','team_update']),
    data:       z.record(z.unknown()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid event data.' });
  try {
    const eventId = await Tracker.addEvent({
      playthroughId: parseInt(req.params.id, 10),
      userId:        req.session.user.id,
      eventType:     parsed.data.event_type,
      data:          parsed.data.data,
    });
    res.json({ ok: true, event_id: eventId });
  } catch (err) { next(err); }
});

router.delete('/:id(\\d+)/event/:eventId(\\d+)', async (req, res, next) => {
  try {
    await Tracker.softDeleteEvent(parseInt(req.params.eventId,10), req.session.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id(\\d+)/event/:eventId(\\d+)/restore', async (req, res, next) => {
  try {
    await Tracker.restoreEvent(parseInt(req.params.eventId,10), req.session.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
