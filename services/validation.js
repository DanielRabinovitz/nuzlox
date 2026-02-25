/**
 * services/validation.js — Team validation engine (server-side mirror).
 *
 * This module contains the pure validation logic that is also bundled into
 * public/js/teambuilder-engine.js for client-side use. Keeping both in sync
 * ensures that server-side validation (for saved teams) matches client-side
 * feedback exactly.
 *
 * validateTeam() accepts a team array and a parsed ruleset-validator.json
 * object, and returns { valid, violations[], warnings[] }.
 *
 * @ref docs/services/validation.md
 */

'use strict';

/**
 * Validates a team against the compiled ruleset schema.
 *
 * @param {object[]} team         Array of pokemon slots: { species, types[], moves[], held_item }
 * @param {object}   schema       Parsed ruleset-validator.json
 * @returns {{ valid: boolean, violations: string[], warnings: string[] }}
 */
function validateTeam(team, schema) {
  const violations = [];
  const warnings   = [];

  for (const slot of team) {
    if (!slot.species) continue;

    // ── Type legality ─────────────────────────────────────────────────────
    for (const type of (slot.types || [])) {
      if (schema.forbidden_types?.includes(type.toLowerCase())) {
        violations.push(
          `${slot.species}: ${type} type is forbidden on a kosher team ` +
          `(ghost/dark types are forbidden, Leviticus 19:31).`
        );
      }
    }

    // ── Restricted type move check ────────────────────────────────────────
    for (const [restrictedType, restriction] of Object.entries(schema.restricted_types || {})) {
      if ((slot.types || []).map(t => t.toLowerCase()).includes(restrictedType)) {
        for (const move of (slot.moves || [])) {
          if ((restriction.forbidden_moves || []).includes(move.toLowerCase())) {
            violations.push(
              `${slot.species}: Move "${move}" is forbidden for ${restrictedType} types — ` +
              `only defensive/healing ${restrictedType} moves are permitted.`
            );
          }
        }
      }
    }

    // ── Species legality ──────────────────────────────────────────────────
    if (schema.forbidden_species_categories) {
      for (const cat of (slot.categories || [])) {
        if (schema.forbidden_species_categories.includes(cat.toLowerCase())) {
          violations.push(
            `${slot.species}: ${cat} Pokémon are not permitted (${
              cat === 'legendary' || cat === 'mythical'
                ? 'unbreedable — lineage cannot be confirmed'
                : cat === 'fossil'
                ? 'necromancy is forbidden'
                : 'not permitted'
            }).`
          );
        }
      }
    }

    // ── Move legality ─────────────────────────────────────────────────────
    for (const move of (slot.moves || [])) {
      if ((schema.forbidden_moves || []).includes(move.toLowerCase())) {
        violations.push(
          `${slot.species}: Move "${move}" is forbidden under the Nuzlox rules.`
        );
      }
      if ((schema.forbidden_move_categories || []).some(t =>
        move.toLowerCase().startsWith(t))) {
        violations.push(
          `${slot.species}: "${move}" is a forbidden move type.`
        );
      }
    }

    // ── Item legality ─────────────────────────────────────────────────────
    if (slot.held_item) {
      if ((schema.forbidden_items || []).includes(slot.held_item.toLowerCase())) {
        violations.push(
          `${slot.species}: Held item "${slot.held_item}" is forbidden under the Nuzlox rules.`
        );
      }
    }

    // ── Breeding warning ──────────────────────────────────────────────────
    if (schema.breeding_required && !slot.is_bred) {
      warnings.push(
        `${slot.species}: Team members should be bred (catch 2 wild, breed for child). ` +
        `Mark as "bred" to dismiss this warning.`
      );
    }
  }

  return { valid: violations.length === 0, violations, warnings };
}

module.exports = { validateTeam };
