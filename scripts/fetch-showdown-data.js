/**
 * scripts/fetch-showdown-data.js — Download Pokémon Showdown data and write to cache.
 *
 * Fetches:
 *   https://play.pokemonshowdown.com/data/pokedex.json   → pokemon-list.json
 *   https://play.pokemonshowdown.com/data/moves.json     → showdown-moves.json
 *   https://play.pokemonshowdown.com/data/learnsets.json → showdown-learnsets.json
 *
 * Included entries: base species + Alolan/Galarian/Hisuian/Paldean regional forms.
 * Excluded: Mega evolutions, Gigantamax, Totem, Primal, gender forms, costume variants.
 *
 * Sprites use PokémonDB icon URLs (avif format):
 *   https://img.pokemondb.net/sprites/scarlet-violet/icon/avif/{slug}.avif
 *
 * Run once (or after each Showdown data update):
 *   node scripts/fetch-showdown-data.js
 *
 * @ref https://play.pokemonshowdown.com/data/
 * @ref https://pokemondb.net/sprites
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'public', 'cache');

/** Regional forme names to keep; maps to PokémonDB adjective suffix. */
const REGIONAL_FORME_SUFFIX = {
  Alola:  'alolan',
  Galar:  'galarian',
  Hisui:  'hisuian',
  Paldea: 'paldean',
};

/** Pokémon whose fossil status is determined by species slug. */
const FOSSIL_SPECIES = new Set([
  'omanyte', 'omastar', 'kabuto', 'kabutops', 'aerodactyl',
  'lileep', 'cradily', 'anorith', 'armaldo',
  'cranidos', 'rampardos', 'shieldon', 'bastiodon',
  'tirtouga', 'carracosta', 'archen', 'archeops',
  'tyrunt', 'tyrantrum', 'amaura', 'aurorus',
  'dracozolt', 'arctozolt', 'dracovish', 'arctovish',
]);

/**
 * Convert a Pokémon display name to a PokémonDB sprite slug.
 * Handles: Mr. Mime → mr-mime, Nidoran♀ → nidoran-f, Ho-Oh → ho-oh, etc.
 * @param {string} name - Display name from Showdown dex
 * @returns {string}
 */
function toPokeDBSlug(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics (Flabébé → Flabebe)
    .toLowerCase()
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/[.':]/g, '')             // remove punctuation
    .replace(/\s+/g, '-')             // spaces → hyphens
    .replace(/-+/g, '-')              // collapse runs
    .replace(/^-|-$/g, '');           // trim edges
}

async function fetchJSON(url) {
  console.log(`[fetch-showdown] GET ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Nuzlox/1.0 (nuzlox.com)' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const [rawDex, rawMoves, rawLearnsets] = await Promise.all([
    fetchJSON('https://play.pokemonshowdown.com/data/pokedex.json'),
    fetchJSON('https://play.pokemonshowdown.com/data/moves.json'),
    fetchJSON('https://play.pokemonshowdown.com/data/learnsets.json'),
  ]);

  // ── Pokémon list ────────────────────────────────────────────────────────────
  const pokemonList = [];
  for (const [slug, p] of Object.entries(rawDex)) {
    if (!p.num || p.num <= 0 || p.num > 1025) continue;

    // Keep only base species and recognised regional formes
    const isBase     = !p.baseSpecies;
    const regionSuffix = p.baseSpecies && REGIONAL_FORME_SUFFIX[p.forme];
    if (!isBase && !regionSuffix) continue;

    const tags         = p.tags || [];
    const eggGroups    = p.eggGroups || [];
    const is_legendary = tags.some(t => /legendary/i.test(t));
    const is_mythical  = tags.includes('Mythical');
    const is_fossil    = FOSSIL_SPECIES.has(slug);
    const can_breed    = !eggGroups.includes('Undiscovered');

    // PokémonDB sprite slug
    let spriteSlug;
    if (regionSuffix) {
      spriteSlug = `${toPokeDBSlug(p.baseSpecies)}-${regionSuffix}`;
    } else {
      spriteSlug = toPokeDBSlug(p.name);
    }
    const sprite = `https://img.pokemondb.net/sprites/scarlet-violet/icon/avif/${spriteSlug}.avif`;

    pokemonList.push({
      id:           p.num,
      name:         slug,
      displayName:  p.name,
      types:        (p.types || []).map(t => t.toLowerCase()),
      sprite,
      is_legendary,
      is_mythical,
      is_fossil,
      can_breed,
    });
  }

  pokemonList.sort((a, b) => a.id - b.id || a.name.localeCompare(b.name));

  fs.writeFileSync(
    path.join(CACHE_DIR, 'pokemon-list.json'),
    JSON.stringify(pokemonList, null, 2),
  );
  console.log(`[fetch-showdown] Wrote pokemon-list.json — ${pokemonList.length} entries`);

  // ── Moves ───────────────────────────────────────────────────────────────────
  const movesMap = {};
  for (const [slug, m] of Object.entries(rawMoves)) {
    const secondary = m.secondary || {};
    movesMap[slug] = {
      name:               slug,
      displayName:        m.name,
      type:               (m.type     || 'Normal').toLowerCase(),
      damage_class:       (m.category || 'status').toLowerCase(),
      power:              m.basePower  || null,
      accuracy:           m.accuracy === true ? null : (m.accuracy || null),
      pp:                 m.pp        || null,
      secondary_status:   secondary.status         || null,
      secondary_volatile: secondary.volatileStatus || null,
      secondary_chance:   secondary.chance          || null,
      secondary_boosts:   secondary.boosts          || null,
      effect:             '',
    };
  }

  fs.writeFileSync(
    path.join(CACHE_DIR, 'showdown-moves.json'),
    JSON.stringify(movesMap, null, 2),
  );
  console.log(`[fetch-showdown] Wrote showdown-moves.json — ${Object.keys(movesMap).length} moves`);

  // ── Learnsets ───────────────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(CACHE_DIR, 'showdown-learnsets.json'),
    JSON.stringify(rawLearnsets, null, 2),
  );
  console.log(`[fetch-showdown] Wrote showdown-learnsets.json`);

  console.log('[fetch-showdown] Done.');
}

main().catch(err => {
  console.error('[fetch-showdown] Fatal:', err.message);
  process.exit(1);
});
