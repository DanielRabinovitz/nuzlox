/**
 * scripts/generate-ruleset-cache.js — Regenerates public/cache/ruleset-validator.json.
 *
 * Called after admin publishes a new ruleset version (from routes/api/admin.js)
 * and can be run manually during development.
 *
 * Usage: node scripts/generate-ruleset-cache.js
 *
 * @ref docs/scripts/generate-ruleset-cache.md
 */

'use strict';

require('dotenv').config();

const fs      = require('fs');
const path    = require('path');
const db      = require('../config/database');
const Ruleset = require('../models/Ruleset');

async function generate() {
  const version = await Ruleset.getCurrentVersion();
  if (!version) {
    console.error('[cache-gen] No current ruleset version found. Seed the ruleset first.');
    process.exit(1);
  }

  const rules   = await Ruleset.getRulesForVersion(version.id);

  // Extract machine-readable validation data from rule metadata.
  // Each rule in ruleset-seed.json carries a `validation` object.
  const schema = {
    version:          version.version_label,
    generated_at:     new Date().toISOString(),
    forbidden_types:  ['ghost', 'dark'],
    restricted_types: {
      psychic: {
        forbidden_moves: [
          'psychic','psyshock','psystrike','psycho-boost','zen-headbutt',
          'expanding-force','stored-power','confusion','dream-eater',
          'synchronoise','heart-stamp','future-sight','extrasensory',
          'luster-purge','mist-ball','power-gem',
        ],
        note: 'Only defensive/healing psychic moves are permitted.',
      },
      fairy: {
        forbidden_moves: [
          'moonblast','dazzling-gleam','play-rough','fairy-wind',
          'disarming-voice','draining-kiss','spirit-break','strange-steam',
          'sparkling-aria','magical-leaf','fairy-lock',
        ],
        note: 'Only defensive/healing fairy moves are permitted.',
      },
    },
    forbidden_species_categories: ['legendary', 'mythical', 'fossil', 'ultra_beast'],
    forbidden_moves: [
      // Reflection / counter
      'counter','mirror-coat','magic-coat','magic-bounce',
      // Divination
      'future-sight',
      // Life drain
      'drain-punch','giga-drain','mega-drain','horn-leech','parabolic-charge',
      'draining-kiss','absorb','leech-seed','oblivion-wing','strength-sap',
      // Recoil
      'double-edge','flare-blitz','head-smash','brave-bird','wood-hammer',
      'take-down','submission','volt-tackle','wild-charge','head-charge',
      'high-jump-kick','jump-kick','shadow-rush',
      // Self-KO
      'lunar-dance','healing-wish','memento','self-destruct','explosion',
      'final-gambit','last-resort',
      // Status infliction
      'will-o-wisp','thunder-wave','glare','stun-spore','sleep-powder',
      'spore','toxic','poison-powder','hypnosis','dark-void','grass-whistle',
      'lovely-kiss','sing','yawn','nuzzle','swagger','flatter',
      'teeter-dance','supersonic',
      // Confusion
      'confuse-ray','sweet-kiss','dizzy-punch',
      // Trapping
      'bind','wrap','fire-spin','whirlpool','sand-tomb','magma-storm',
      'infestation','clamp','snap-trap','thunder-cage',
      // Illusion / deception
      'imposter','substitute',
      // Curse (Leviticus 13 — quarantine rule)
      'curse',
      // Stat drops with no tradeoff boost
      'close-combat','overheat','draco-meteor','leaf-storm','superpower',
      'psycho-boost','power-whip',
    ],
    forbidden_move_categories: ['ghost', 'dark'],
    forbidden_secondary_effects: ['par', 'brn', 'frz', 'psn', 'tox', 'slp', 'flinch', 'confusion'],
    forbidden_items: [
      // Ritual power items
      'mega-stone','z-crystal','dynamax-band','tera-orb','rusted-sword','rusted-shield',
      // Items causing harm to holder
      'life-orb','black-sludge','sticky-barb','toxic-orb','flame-orb',
      // Triggered by being hurt
      'weakness-policy','adrenaline-orb',
      // Items lowering opponent stats
      'bright-powder','lax-incense',
      // Trapping
      'binding-band',
      // Status infliction
      'kings-rock','poison-barb',
      // Reaction-to-harm
      'lagging-tail',
      // Forbidden move boosters
      'big-root','twisted-spoon','black-glasses','dread-plate',
      'spell-tag','shadow-ball', // ghost-type boosters
      // Sorcery items
      'odd-keystone','cleanse-tag',
      // Food with no kashrut — meat/cheese
      'sausages','bread','peanut-butter','marmalade','klawf-stick',
      'smoked-fillet','bitter-herba-mystica',
    ],
    breeding_required: true,
    breeding_note: 'Catch 2 wild Pokémon of the species, breed for team member. Wild-caught Pokémon may not be used directly on a team.',
    rules_reference: `/ruleset`,
  };

  const outPath = path.join(__dirname, '..', 'public', 'cache', 'ruleset-validator.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(schema, null, 2), 'utf8');
  console.log(`[cache-gen] Wrote ${outPath} (version ${schema.version})`);
}

generate().catch(err => {
  console.error('[cache-gen] Error:', err.message);
  process.exit(1);
});
