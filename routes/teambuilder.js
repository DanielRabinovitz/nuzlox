/**
 * routes/teambuilder.js — Teambuilder shell page.
 *
 * Serves the Alpine.js teambuilder shell. The validation engine runs fully
 * client-side by reading public/cache/ruleset-validator.json. PHP data injection
 * is replaced with EJS template variables passed as a JSON script tag.
 *
 * @ref docs/routes/teambuilder.md
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Save Early, Save Often
 */

'use strict';

const express = require('express');
const router  = express.Router();
const Ruleset = require('../models/Ruleset');
const Team    = require('../models/Team');

router.get('/', async (req, res, next) => {
  try {
    const version    = await Ruleset.getCurrentVersion();
    const savedTeams = req.session.user
      ? await Team.findByUser(req.session.user.id)
      : [];

    // teamData is injected into the page as a JSON script tag, then read by Alpine.js.
    const teamData = {
      rulesetVersion:   version?.version_label ?? null,
      rulesetSchemaUrl: '/cache/ruleset-validator.json',
      savedTeams,
    };

    // Shell page cached for guests; personal data excluded from cache.
    if (process.env.NODE_ENV === 'production' && !req.session.user) {
      res.set('Cache-Control', 'public, max-age=3600');
    }

    res.render('teambuilder/index', {
      pageTitle: 'Teambuilder — Nuzlox',
      teamData:  JSON.stringify(teamData),
    });
  } catch (err) { next(err); }
});

module.exports = router;
