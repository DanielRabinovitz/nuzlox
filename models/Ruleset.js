/**
 * models/Ruleset.js — Ruleset version and rule data access.
 *
 * Each published ruleset version is a row in nuzlox_ruleset_versions.
 * Individual rules are rows in nuzlox_rules linked to a version.
 * Publishing a version invalidates the cache and schedules regeneration of
 * public/cache/ruleset-validator.json.
 *
 * @ref docs/models/Ruleset.md
 */

'use strict';

const db    = require('../config/database');
const cache = require('../config/cache');

const CACHE_KEY = 'pk:current_ruleset';

async function getCurrentVersion() {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  const version = await db.get(
    'SELECT * FROM nuzlox_ruleset_versions WHERE is_current = 1 LIMIT 1'
  );
  if (version) cache.set(CACHE_KEY, version, 3600);
  return version;
}

async function getAllVersions() {
  return db.all(
    'SELECT * FROM nuzlox_ruleset_versions ORDER BY published_at DESC'
  );
}

async function getVersionById(id) {
  return db.get(
    'SELECT * FROM nuzlox_ruleset_versions WHERE id = ?',
    [id]
  );
}

async function getRulesForVersion(versionId) {
  return db.all(
    'SELECT * FROM nuzlox_rules WHERE ruleset_version_id = ? ORDER BY sort_order ASC, id ASC',
    [versionId]
  );
}

/**
 * Groups rules by their category field for display on the ruleset page.
 *
 * @param {object[]} rules
 * @returns {Map<string, object[]>}
 */
function groupByCategory(rules) {
  const map = new Map();
  for (const rule of rules) {
    const cat = rule.category || 'General';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push({
      ...rule,
      citations: rule.citations ? JSON.parse(rule.citations) : [],
    });
  }
  return map;
}

/**
 * Publishes a new ruleset version as current.
 * Clears the cache so the next request rebuilds from DB.
 *
 * @param {number} versionId
 * @param {number} adminUserId
 */
async function publish(versionId, adminUserId) {
  // Unset current from any existing version first.
  await db.run('UPDATE nuzlox_ruleset_versions SET is_current = 0', []);
  await db.run(
    'UPDATE nuzlox_ruleset_versions SET is_current = 1, published_by = ? WHERE id = ?',
    [adminUserId, versionId]
  );
  cache.del(CACHE_KEY);
}

/**
 * Creates a new draft version with the given rules.
 *
 * @param {{ versionLabel, changelog, rules: object[] }} data
 * @returns {Promise<number>} new version ID
 */
async function createVersion({ versionLabel, changelog = '', rules = [] }) {
  const { lastId: versionId } = await db.run(
    'INSERT INTO nuzlox_ruleset_versions (version_label, is_current, changelog) VALUES (?, 0, ?)',
    [versionLabel, changelog]
  );
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    await db.run(
      `INSERT INTO nuzlox_rules
         (ruleset_version_id, rule_key, category, title, body, citations, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [versionId, r.rule_key, r.category || 'General', r.title, r.body,
       JSON.stringify(r.citations || []), r.sort_order ?? i]
    );
  }
  return versionId;
}

module.exports = {
  getCurrentVersion, getAllVersions, getVersionById,
  getRulesForVersion, groupByCategory, publish, createVersion,
};
