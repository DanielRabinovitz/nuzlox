/**
 * routes/index.js — Mounts all route groups onto the Express app.
 *
 * @ref docs/routes/index.md
 */

'use strict';

const authRoutes       = require('./auth');
const rulesetRoutes    = require('./ruleset');
const teambuilderRoutes = require('./teambuilder');
const forumRoutes      = require('./forum');
const trackerRoutes    = require('./tracker');
const accountRoutes    = require('./account');
const bugsRoutes       = require('./bugs');
const apiTeams         = require('./api/teams');
const apiForum         = require('./api/forum');
const apiTracker       = require('./api/tracker');
const apiAdmin         = require('./api/admin');
const apiPokeapi       = require('./api/pokeapi');

module.exports = function mountRoutes(app) {
  app.use('/',           authRoutes);
  app.use('/ruleset',    rulesetRoutes);
  app.use('/teambuilder', teambuilderRoutes);
  app.use('/forum',      forumRoutes);
  app.use('/tracker',    trackerRoutes);
  app.use('/account',    accountRoutes);
  app.use('/bugs',       bugsRoutes);
  app.use('/api/v1/teams',      apiTeams);
  app.use('/api/v1/forum',      apiForum);
  app.use('/api/v1/tracker',    apiTracker);
  app.use('/api/v1/admin',      apiAdmin);
  app.use('/api/v1/pokeapi',    apiPokeapi);

  // Home page → redirect to ruleset (the primary content).
  app.get('/', (req, res) => res.redirect('/ruleset'));
};
