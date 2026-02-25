/**
 * routes/api/teams.js — Saved team API endpoints.
 *
 * POST /api/v1/teams        — save a team (auth required)
 * GET  /api/v1/teams        — list user's saved teams (auth required)
 * DELETE /api/v1/teams/:id  — delete a saved team (auth required)
 *
 * @ref docs/routes/api/teams.md
 */

'use strict';

const express     = require('express');
const router      = express.Router();
const Team        = require('../../models/Team');
const requireAuth = require('../../middleware/requireAuth');
const { z }       = require('zod');

router.use(requireAuth);

const pokemonSchema = z.object({
  species:   z.string().min(1),
  nickname:  z.string().optional(),
  held_item: z.string().optional(),
  moves:     z.array(z.string()).max(4).optional(),
  types:     z.array(z.string()).optional(),
  is_bred:   z.boolean().optional(),
});

router.post('/', async (req, res, next) => {
  const schema = z.object({
    team_name:       z.string().min(1).max(100),
    pokemon:         z.array(pokemonSchema).max(6),
    ruleset_version: z.string(),
    is_valid:        z.boolean().optional(),
    violations:      z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid team data.', details: parsed.error.flatten() });
  }
  try {
    const id = await Team.save({
      userId:         req.session.user.id,
      teamName:       parsed.data.team_name,
      pokemon:        parsed.data.pokemon,
      rulesetVersion: parsed.data.ruleset_version,
      isValid:        parsed.data.is_valid ?? null,
      violations:     parsed.data.violations ?? [],
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const teams = await Team.findByUser(req.session.user.id);
    res.json(teams);
  } catch (err) { next(err); }
});

router.delete('/:id(\\d+)', async (req, res, next) => {
  try {
    await Team.remove(parseInt(req.params.id, 10), req.session.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
