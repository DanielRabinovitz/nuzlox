/**
 * services/rulesetValidator.js — Pure Nuzlox ruleset validation.
 *
 * Used by server-side routes and by the test suite.
 * The client (Alpine.js) duplicates this logic for offline validation.
 *
 * @ref wallbreaker/docs/legal/data-privacy.md (no PII passed to this function)
 */
'use strict';

/**
 * Validate a single Pokémon against the ruleset schema.
 *
 * @param {object} mon - { name, types[], moves[], held_item?, is_legendary?, is_mythical?, is_fossil? }
 * @param {object} schema - ruleset-validator.json structure
 * @returns {{ violations: string[], warnings: string[] }}
 */
function validateMon(mon, schema) {
  const violations = [];
  const warnings   = [];

  const {
    forbidden_types              = [],
    restricted_types             = {},
    forbidden_species_categories = [],
    forbidden_species            = [],   // named species list
    forbidden_moves              = [],
    forbidden_move_categories    = [],
    forbidden_items              = [],
    forbidden_secondary_effects  = [],
  } = schema;
  const norm = n => (n || '').toLowerCase().replace(/-/g, '');
  const normalizedForbiddenMoves = forbidden_moves.map(norm);
  const secondaryEffectSet = new Set(forbidden_secondary_effects);

  // ── Types ──────────────────────────────────────────────────────────────
  const forbiddenTypeHits = (mon.types || []).filter(t =>
    forbidden_types.includes(t.toLowerCase())
  );
  if (forbiddenTypeHits.length) {
    violations.push(`Forbidden type(s): ${forbiddenTypeHits.join(', ')}`);
  }

  // ── Species category ───────────────────────────────────────────────────
  if (mon.is_legendary) violations.push('Legendary Pokémon are forbidden');
  if (mon.is_mythical)  violations.push('Mythical Pokémon are forbidden');
  if (mon.is_fossil)    warnings.push('Fossil Pokémon may be forbidden (verify)');

  // ── Forbidden species ─────────────────────────────────────────────────
  const monName = (mon.name || '').toLowerCase();
  if (forbidden_species.map(s => s.toLowerCase()).includes(monName)) {
    violations.push(`${mon.name} is a forbidden species`);
  }

  // ── Moves ──────────────────────────────────────────────────────────────
  for (const move of (mon.moves || [])) {
    if (!move) continue;
    const moveObj  = typeof move === 'object' ? move : { name: move };
    const moveName = norm(moveObj.name || '');
    const moveType = (moveObj.type || '').toLowerCase();
    const moveLabel = moveObj.name || moveName;

    if (normalizedForbiddenMoves.includes(moveName)) {
      violations.push(`Forbidden move: ${moveLabel}`);
    }

    if (moveType && forbidden_move_categories.includes(moveType)) {
      violations.push(`Forbidden move type (${moveType}): ${moveLabel}`);
    }

    // Psychic-type Pokémon — offensive psychic moves banned
    if ((mon.types || []).map(t => t.toLowerCase()).includes('psychic') && restricted_types.psychic) {
      const psychicForbidden = (restricted_types.psychic.forbidden_moves || []).map(norm);
      if (psychicForbidden.includes(moveName)) {
        violations.push(`Offensive psychic move forbidden for psychic-type: ${moveLabel}`);
      }
    }

    // Fairy-type Pokémon — offensive fairy moves banned
    if ((mon.types || []).map(t => t.toLowerCase()).includes('fairy') && restricted_types.fairy) {
      const fairyForbidden = (restricted_types.fairy.forbidden_moves || []).map(norm);
      if (fairyForbidden.includes(moveName)) {
        violations.push(`Offensive fairy move forbidden for fairy-type: ${moveLabel}`);
      }
    }

    // Secondary effect check
    if (secondaryEffectSet.size && typeof move === 'object') {
      if (move.secondary_status && secondaryEffectSet.has(move.secondary_status)) {
        violations.push(`Forbidden secondary effect (${move.secondary_status}): ${moveLabel}`);
      }
      if (move.secondary_volatile && secondaryEffectSet.has(move.secondary_volatile)) {
        violations.push(`Forbidden secondary effect (${move.secondary_volatile}): ${moveLabel}`);
      }
      if (move.secondary_boosts && Object.values(move.secondary_boosts).some(v => v < 0)) {
        violations.push(`Move can lower opponent stat (secondary effect): ${moveLabel}`);
      }
    }
  }

  // ── Held item ──────────────────────────────────────────────────────────
  const item = (mon.held_item || mon.item || '').toLowerCase().replace(/\s+/g, '-');
  if (item && forbidden_items.includes(item)) {
    violations.push(`Forbidden item: ${item}`);
  }

  return { violations, warnings };
}

/**
 * Validate an entire team.
 * @param {object[]} mons
 * @param {object}   schema
 * @returns {{ valid: boolean, violations: string[], warnings: string[] }}
 */
function validateTeam(mons, schema) {
  const allViolations = [];
  const allWarnings   = [];

  for (const mon of mons) {
    const { violations, warnings } = validateMon(mon, schema);
    const label = mon.name || mon.species || 'Unknown';
    allViolations.push(...violations.map(v => `${label}: ${v}`));
    allWarnings.push(...warnings.map(w => `${label}: ${w}`));
  }

  return {
    valid:      allViolations.length === 0,
    violations: allViolations,
    warnings:   allWarnings,
  };
}

module.exports = { validateMon, validateTeam };
