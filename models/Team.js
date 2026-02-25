/**
 * models/Team.js — Saved team data access for the teambuilder.
 *
 * Teams are always scoped to the owning user_id.
 * The pokemon column is a JSON array of { species, nickname, held_item, moves[] }.
 *
 * @ref docs/models/Team.md
 */

'use strict';

const db = require('../config/database');

async function save({ userId, teamName, pokemon, rulesetVersion, isValid, violations }) {
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_saved_teams
       (user_id, team_name, pokemon, ruleset_version, is_valid, violations)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, teamName, JSON.stringify(pokemon),
     rulesetVersion, isValid ? 1 : 0, JSON.stringify(violations || [])]
  );
  return lastId;
}

async function findByUser(userId) {
  const rows = await db.all(
    'SELECT * FROM nuzlox_saved_teams WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(r => ({
    ...r,
    pokemon:    JSON.parse(r.pokemon || '[]'),
    violations: JSON.parse(r.violations || '[]'),
  }));
}

async function findOne(id, userId) {
  const row = await db.get(
    'SELECT * FROM nuzlox_saved_teams WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!row) return null;
  return {
    ...row,
    pokemon:    JSON.parse(row.pokemon || '[]'),
    violations: JSON.parse(row.violations || '[]'),
  };
}

async function remove(id, userId) {
  return db.run(
    'DELETE FROM nuzlox_saved_teams WHERE id = ? AND user_id = ?',
    [id, userId]
  );
}

module.exports = { save, findByUser, findOne, remove };
