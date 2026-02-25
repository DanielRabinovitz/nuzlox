/**
 * routes/tracker.js — Playthrough tracker page routes.
 *
 * All routes require authentication. All queries are scoped to the logged-in
 * user's ID — no user can view or modify another user's playthroughs.
 *
 * @ref docs/routes/tracker.md
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Save Early, Save Often
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Total Recall
 */

'use strict';

const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const router      = express.Router();
const Tracker     = require('../models/Tracker');
const requireAuth = require('../middleware/requireAuth');
const { z }       = require('zod');

router.use(requireAuth);

// ── Playthrough list ──────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const playthroughs = await Tracker.getByUser(req.session.user.id);
    res.render('tracker/index', {
      pageTitle: 'My Playthroughs — Nuzlox',
      playthroughs,
    });
  } catch (err) { next(err); }
});

// ── Create playthrough ────────────────────────────────────────────────────────

router.post('/new', async (req, res, next) => {
  const schema = z.object({
    game_slug:            z.string().min(1).max(50),
    title:                z.string().min(1).max(150),
    youtube_playlist_url: z.string().url().optional().or(z.literal('')),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    req.flash('error', 'Please provide a valid game and title.');
    return res.redirect('/tracker');
  }
  try {
    const id = await Tracker.create({
      userId:              req.session.user.id,
      gameSlug:            parsed.data.game_slug,
      title:               parsed.data.title,
      youtubePlaylistUrl:  parsed.data.youtube_playlist_url || null,
    });
    res.redirect(`/tracker/${id}`);
  } catch (err) { next(err); }
});

// ── Single playthrough ────────────────────────────────────────────────────────

router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const playthrough = await Tracker.getById(req.params.id, req.session.user.id);
    if (!playthrough) return res.status(404).render('error', { pageTitle: 'Not Found', status: 404, message: 'Playthrough not found.' });

    const events = await Tracker.getEvents(playthrough.id, req.session.user.id);

    // Load game checkpoints if available.
    const checkpointFile = path.join(__dirname, '..', 'data', 'checkpoints', `${playthrough.game_slug}.json`);
    let checkpoints = [];
    if (fs.existsSync(checkpointFile)) {
      checkpoints = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
    }

    res.render('tracker/detail', {
      pageTitle:  `${playthrough.title} — Nuzlox`,
      playthrough,
      events,
      checkpoints,
    });
  } catch (err) { next(err); }
});

// ── Journal view ──────────────────────────────────────────────────────────────

router.get('/:id(\\d+)/journal', async (req, res, next) => {
  try {
    const playthrough = await Tracker.getById(req.params.id, req.session.user.id);
    if (!playthrough) return res.status(404).render('error', { pageTitle: 'Not Found', status: 404, message: 'Playthrough not found.' });

    const journalEvents = await Tracker.getEvents(
      playthrough.id, req.session.user.id, { type: 'journal' }
    );

    res.render('tracker/journal', {
      pageTitle:     `${playthrough.title} Journal — Nuzlox`,
      playthrough,
      journalEvents,
    });
  } catch (err) { next(err); }
});

module.exports = router;
