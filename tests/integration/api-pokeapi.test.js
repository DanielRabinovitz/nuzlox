/**
 * tests/integration/api-pokeapi.test.js
 * Integration tests for the PokéAPI proxy route (Showdown-backed).
 *
 * Uses a temporary directory with minimal fixture data so tests run offline
 * without touching the production cache files.
 */
'use strict';

const fs      = require('fs');
const os      = require('os');
const path    = require('path');
const express = require('express');
const request = require('supertest');

/* ── Test fixture data ─────────────────────────────────────────────────────── */

const TEST_POKEMON_LIST = [
  {
    id: 1, name: 'bulbasaur', displayName: 'Bulbasaur',
    types: ['grass', 'poison'],
    sprite: 'https://play.pokemonshowdown.com/sprites/dex/bulbasaur.png',
    is_legendary: false, is_mythical: false, is_fossil: false, can_breed: true,
  },
  {
    id: 150, name: 'mewtwo', displayName: 'Mewtwo',
    types: ['psychic'],
    sprite: 'https://play.pokemonshowdown.com/sprites/dex/mewtwo.png',
    is_legendary: true, is_mythical: false, is_fossil: false, can_breed: false,
  },
  {
    id: 138, name: 'omanyte', displayName: 'Omanyte',
    types: ['rock', 'water'],
    sprite: 'https://play.pokemonshowdown.com/sprites/dex/omanyte.png',
    is_legendary: false, is_mythical: false, is_fossil: true, can_breed: true,
  },
];

const TEST_MOVES_MAP = {
  tackle: {
    name: 'tackle', displayName: 'Tackle', type: 'normal', damage_class: 'physical',
    power: 40, accuracy: 100, pp: 35,
    secondary_status: null, secondary_volatile: null,
    secondary_chance: null, secondary_boosts: null, effect: '',
  },
  flamethrower: {
    name: 'flamethrower', displayName: 'Flamethrower', type: 'fire', damage_class: 'special',
    power: 90, accuracy: 100, pp: 15,
    secondary_status: 'brn', secondary_volatile: null,
    secondary_chance: 10, secondary_boosts: null, effect: '',
  },
  fireblast: {
    name: 'fireblast', displayName: 'Fire Blast', type: 'fire', damage_class: 'special',
    power: 110, accuracy: 85, pp: 5,
    secondary_status: 'brn', secondary_volatile: null,
    secondary_chance: 10, secondary_boosts: null, effect: '',
  },
};

const TEST_LEARNSETS = {
  bulbasaur: { learnset: { tackle: ['9L1'], flamethrower: ['9M'] } },
};

/* ── Test setup: write fixture files before module load ────────────────────── */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuzlox-pokeapi-test-'));
process.env.POKEMON_CACHE_DIR = tmpDir;

fs.writeFileSync(path.join(tmpDir, 'pokemon-list.json'),     JSON.stringify(TEST_POKEMON_LIST));
fs.writeFileSync(path.join(tmpDir, 'showdown-moves.json'),   JSON.stringify(TEST_MOVES_MAP));
fs.writeFileSync(path.join(tmpDir, 'showdown-learnsets.json'), JSON.stringify(TEST_LEARNSETS));

// Require AFTER env var is set so CACHE_DIR picks up the temp path
const pokeapi = require('../../routes/api/pokeapi');

function buildApp() {
  const app = express();
  app.use('/api/v1/pokeapi', pokeapi);
  return app;
}

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

/* ── Pokemon endpoint ──────────────────────────────────────────────────────── */

describe('GET /api/v1/pokeapi/pokemon/:name', () => {
  beforeEach(() => pokeapi._resetCache());

  test('returns Pokémon data for a valid name', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/pokemon/bulbasaur');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('bulbasaur');
    expect(res.body.types).toEqual(expect.arrayContaining(['grass', 'poison']));
    expect(res.body.sprite).toMatch(/^https?:\/\//);
    expect(Array.isArray(res.body.moves)).toBe(true);
    expect(typeof res.body.can_breed).toBe('boolean');
    expect(typeof res.body.is_legendary).toBe('boolean');
  });

  test('returns 404 for unknown Pokémon', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/pokemon/notarealpokemon');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('rejects names with invalid characters', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/pokemon/bulb@saur');
    expect([400, 404]).toContain(res.status);
  });

  test('marks legendary as is_legendary: true', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/pokemon/mewtwo');
    expect(res.status).toBe(200);
    expect(res.body.is_legendary).toBe(true);
  });

  test('detects fossil Pokémon', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/pokemon/omanyte');
    expect(res.status).toBe(200);
    expect(res.body.is_fossil).toBe(true);
  });

  test('includes secondary effect data in move objects', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/pokemon/bulbasaur');
    expect(res.status).toBe(200);
    const flamethrower = res.body.moves.find(m => m.name === 'flamethrower');
    expect(flamethrower).toBeDefined();
    expect(flamethrower.secondary_status).toBe('brn');
    expect(flamethrower.secondary_chance).toBe(10);
  });
});

/* ── Move endpoint ─────────────────────────────────────────────────────────── */

describe('GET /api/v1/pokeapi/move/:name', () => {
  beforeEach(() => pokeapi._resetCache());

  test('returns move data for a valid move name', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/move/tackle');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('tackle');
    expect(res.body.type).toBe('normal');
    expect(res.body.damage_class).toBe('physical');
    expect(res.body.power).toBe(40);
    expect(res.body.accuracy).toBe(100);
    expect(res.body.pp).toBe(35);
    expect(typeof res.body.effect).toBe('string');
  });

  test('returns 404 for unknown move', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/move/notarealmove');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('displayName is set correctly for Showdown slug', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/move/fireblast');
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Fire Blast');
  });

  test('normalises hyphenated move names to Showdown slug', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/move/fire-blast');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('fireblast');
  });

  test('returns secondary_status for moves with status chance', async () => {
    const res = await request(buildApp()).get('/api/v1/pokeapi/move/flamethrower');
    expect(res.status).toBe(200);
    expect(res.body.secondary_status).toBe('brn');
    expect(res.body.secondary_chance).toBe(10);
  });
});
