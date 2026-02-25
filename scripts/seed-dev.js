/**
 * scripts/seed-dev.js — Seeds development data for local prototyping.
 *
 * Creates: admin user, test user, forum structure, sample topics.
 * Calls seed-ruleset.js to ensure the ruleset is seeded first.
 *
 * Usage: node scripts/seed-dev.js  (or npm run seed)
 *
 * @ref docs/scripts/seed-dev.md
 */

'use strict';

require('dotenv').config();

const { execSync } = require('child_process');
const db           = require('../config/database');
const User         = require('../models/User');

async function seed() {
  // Seed the ruleset first.
  execSync('node scripts/seed-ruleset.js', { stdio: 'inherit' });

  // ── Admin user ────────────────────────────────────────────────────────────
  const existingAdmin = await db.get(
    "SELECT id FROM users WHERE email = 'admin@nuzlox.dev'"
  );
  if (!existingAdmin) {
    const { id } = await User.create({
      email:          'admin@nuzlox.dev',
      password:       'AdminPass1!',
      dob:            '1990-01-01',
      marketingOptIn: false,
      consentVersion: '1.0',
      consentText:    'Dev seed consent',
    });
    await db.run("UPDATE users SET role = 'admin', email_verified = 1 WHERE id = ?", [id]);
    console.log(`[seed:dev] Admin user created: admin@nuzlox.dev / AdminPass1! (id=${id})`);
  }

  // ── Test user ─────────────────────────────────────────────────────────────
  const existingUser = await db.get(
    "SELECT id FROM users WHERE email = 'player@nuzlox.dev'"
  );
  if (!existingUser) {
    const { id } = await User.create({
      email:          'player@nuzlox.dev',
      password:       'PlayerPass1!',
      dob:            '2000-06-15',
      marketingOptIn: true,
      consentVersion: '1.0',
      consentText:    'Dev seed consent',
    });
    await db.run("UPDATE users SET email_verified = 1, username = 'Trainer_Dev' WHERE id = ?", [id]);
    console.log(`[seed:dev] Player user created: player@nuzlox.dev / PlayerPass1! (id=${id})`);
  }

  // ── Forum structure ───────────────────────────────────────────────────────
  const existingForum = await db.get(
    "SELECT id FROM nuzlox_forums WHERE slug = 'nuzlox-debates'"
  );
  if (!existingForum) {
    const { lastId: parentId } = await db.run(
      "INSERT INTO nuzlox_forums (name, slug, description, sort_order) VALUES (?, ?, ?, 0)",
      ['Nuzlox Debates', 'nuzlox-debates', 'Main debate forum for Nuzlox challenge rules.']
    );
    const subForums = [
      { name: 'Kosher Pokémon',    slug: 'kosher-pokemon',    desc: 'Debates about which Pokémon species are kosher and why.' },
      { name: 'Team Composition',  slug: 'team-composition',  desc: 'Kilaayim, breeding rules, and team building debates.' },
      { name: 'Laws of Battle',    slug: 'laws-of-battle',    desc: 'Forbidden moves, items, and battle conduct.' },
      { name: 'Animal Welfare',    slug: 'animal-welfare',    desc: 'Tzaar baalei chayyim and feeding rules.' },
      { name: 'Shabbat',           slug: 'shabbat',           desc: 'Shabbat observance during a playthrough.' },
      { name: 'Rulings & Precedents', slug: 'rulings',        desc: 'Official rulings and edge cases.' },
    ];
    for (let i = 0; i < subForums.length; i++) {
      const sf = subForums[i];
      await db.run(
        "INSERT INTO nuzlox_forums (parent_id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)",
        [parentId, sf.name, sf.slug, sf.desc, i]
      );
    }
    console.log('[seed:dev] Forum structure created.');
  }

  console.log('[seed:dev] Done. Run: npm run dev');
}

seed().catch(err => {
  console.error('[seed:dev] Error:', err.message);
  process.exit(1);
});
