/**
 * scripts/seed-ruleset.js — Seeds the database with the initial Nuzlox ruleset.
 *
 * Reads data/ruleset-seed.json and inserts ruleset v1.0 if not already present.
 * Safe to run multiple times.
 *
 * Usage: node scripts/seed-ruleset.js
 *
 * @ref docs/scripts/seed-ruleset.md
 */

'use strict';

require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const db      = require('../config/database');
const Ruleset = require('../models/Ruleset');

async function seed() {
  const seedFile = path.join(__dirname, '..', 'data', 'ruleset-seed.json');
  const seed     = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

  // Check if v1.0 already exists.
  const existing = await db.get(
    'SELECT id FROM nuzlox_ruleset_versions WHERE version_label = ?',
    [seed.version_label]
  );
  if (existing) {
    console.log(`[seed:ruleset] Version ${seed.version_label} already exists — skipping.`);
    return;
  }

  const versionId = await Ruleset.createVersion({
    versionLabel: seed.version_label,
    changelog:    seed.changelog,
    rules:        seed.rules,
  });
  await Ruleset.publish(versionId, null);
  console.log(`[seed:ruleset] Seeded ruleset v${seed.version_label} (${seed.rules.length} rules).`);
}

seed().catch(err => {
  console.error('[seed:ruleset] Error:', err.message);
  process.exit(1);
});
