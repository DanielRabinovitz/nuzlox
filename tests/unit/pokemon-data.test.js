/**
 * tests/unit/pokemon-data.test.js
 * Validates the structure and content of public/cache/pokemon-list.json
 */
'use strict';

const path = require('path');
const fs   = require('fs');

const pokemonListPath = path.join(__dirname, '../../public/cache/pokemon-list.json');

describe('pokemon-list.json', () => {
  let pokemonList;

  beforeAll(() => {
    const raw = fs.readFileSync(pokemonListPath, 'utf8');
    pokemonList = JSON.parse(raw);
  });

  test('is an array with at least 150 entries', () => {
    expect(Array.isArray(pokemonList)).toBe(true);
    expect(pokemonList.length).toBeGreaterThanOrEqual(150);
  });

  test('each entry has required fields', () => {
    for (const p of pokemonList) {
      expect(typeof p.id).toBe('number');
      expect(typeof p.name).toBe('string');
      expect(typeof p.displayName).toBe('string');
      expect(Array.isArray(p.types)).toBe(true);
      expect(p.types.length).toBeGreaterThan(0);
    }
  });

  test('no duplicate names', () => {
    const names = pokemonList.map(p => p.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test('gengar is present and marked ghost type', () => {
    const gengar = pokemonList.find(p => p.name === 'gengar');
    expect(gengar).toBeTruthy();
    expect(gengar.types).toContain('ghost');
  });

  test('mewtwo is marked as legendary', () => {
    const mewtwo = pokemonList.find(p => p.name === 'mewtwo');
    expect(mewtwo).toBeTruthy();
    expect(mewtwo.is_legendary).toBe(true);
  });

  test('gogoat is present and grass type', () => {
    const gogoat = pokemonList.find(p => p.name === 'gogoat');
    expect(gogoat).toBeTruthy();
    expect(gogoat.types).toContain('grass');
  });

  test('sprite URLs are strings when present', () => {
    for (const p of pokemonList) {
      if (p.sprite) {
        expect(typeof p.sprite).toBe('string');
        expect(p.sprite).toMatch(/^https?:\/\//);
      }
    }
  });
});
