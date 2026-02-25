/**
 * routes/ruleset.js — Official ruleset pages.
 *
 * GET /ruleset         — current version
 * GET /ruleset/history — all published versions
 * GET /ruleset/:id     — specific version by ID
 *
 * Guest-accessible. Served with public Cache-Control headers.
 *
 * @ref docs/routes/ruleset.md
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Total Recall
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const Ruleset  = require('../models/Ruleset');

router.get('/', async (req, res, next) => {
  try {
    const version = await Ruleset.getCurrentVersion();
    if (!version) {
      return res.render('ruleset/index', {
        pageTitle: 'Official Ruleset — Nuzlox',
        version:   null,
        byCategory: new Map(),
      });
    }
    const rules     = await Ruleset.getRulesForVersion(version.id);
    const byCategory = Ruleset.groupByCategory(rules);

    // Public cache: 1 hour fresh.
    if (process.env.NODE_ENV === 'production') {
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }

    res.render('ruleset/index', {
      pageTitle:  `Official Ruleset v${version.version_label} — Nuzlox`,
      version,
      byCategory,
    });
  } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
  try {
    const versions = await Ruleset.getAllVersions();
    res.render('ruleset/history', {
      pageTitle: 'Ruleset History — Nuzlox',
      versions,
    });
  } catch (err) { next(err); }
});

router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const version = await Ruleset.getVersionById(req.params.id);
    if (!version) return res.status(404).render('error', { pageTitle: 'Not Found', status: 404, message: 'Ruleset version not found.' });
    const rules      = await Ruleset.getRulesForVersion(version.id);
    const byCategory = Ruleset.groupByCategory(rules);

    if (process.env.NODE_ENV === 'production') {
      res.set('Cache-Control', 'public, max-age=86400');
    }

    res.render('ruleset/version', {
      pageTitle:  `Ruleset v${version.version_label} — Nuzlox`,
      version,
      byCategory,
    });
  } catch (err) { next(err); }
});

module.exports = router;
