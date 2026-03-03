/**
 * tests/unit/validation.test.js
 * Unit tests for services/rulesetValidator.js
 */
'use strict';

const { validateMon, validateTeam } = require('../../services/rulesetValidator');

const SCHEMA = {
  forbidden_types: ['ghost', 'dark'],
  restricted_types: {
    psychic: { forbidden_moves: ['psychic', 'psybeam', 'psyshock', 'future-sight', 'stored-power'] },
    fairy:   { forbidden_moves: ['moonblast', 'dazzling-gleam', 'play-rough'] },
  },
  forbidden_species_categories: ['legendary', 'mythical', 'fossil'],
  forbidden_moves: ['dark-pulse', 'shadow-ball', 'earthquake', 'explosion'],
  forbidden_move_categories: ['ghost', 'dark'],
  forbidden_items: ['choice-band', 'focus-sash', 'leftovers'],
};

describe('validateMon', () => {
  describe('forbidden types', () => {
    test('flags ghost-type Pokémon', () => {
      const { violations } = validateMon(
        { name: 'gengar', types: ['ghost', 'poison'], moves: [] },
        SCHEMA
      );
      expect(violations).toEqual(expect.arrayContaining([
        expect.stringContaining('ghost'),
      ]));
    });

    test('flags dark-type Pokémon', () => {
      const { violations } = validateMon(
        { name: 'umbreon', types: ['dark'], moves: [] },
        SCHEMA
      );
      expect(violations.length).toBeGreaterThan(0);
    });

    test('passes normal-type Pokémon', () => {
      const { violations } = validateMon(
        { name: 'eevee', types: ['normal'], moves: [] },
        SCHEMA
      );
      expect(violations).toHaveLength(0);
    });
  });

  describe('legendary / mythical / fossil', () => {
    test('flags legendary', () => {
      const { violations } = validateMon(
        { name: 'mewtwo', types: ['psychic'], moves: [], is_legendary: true },
        SCHEMA
      );
      expect(violations.some(v => /legendary/i.test(v))).toBe(true);
    });

    test('flags mythical', () => {
      const { violations } = validateMon(
        { name: 'mew', types: ['psychic'], moves: [], is_mythical: true },
        SCHEMA
      );
      expect(violations.some(v => /mythical/i.test(v))).toBe(true);
    });

    test('warns about fossil', () => {
      const { warnings } = validateMon(
        { name: 'omanyte', types: ['rock', 'water'], moves: [], is_fossil: true },
        SCHEMA
      );
      expect(warnings.some(w => /fossil/i.test(w))).toBe(true);
    });

    test('passes non-legendary kosher Pokémon', () => {
      const { violations } = validateMon(
        { name: 'gogoat', types: ['grass'], moves: [] },
        SCHEMA
      );
      expect(violations).toHaveLength(0);
    });
  });

  describe('forbidden moves', () => {
    test('flags forbidden move by slug', () => {
      const { violations } = validateMon(
        { name: 'pikachu', types: ['electric'], moves: [{ name: 'earthquake', type: 'ground' }] },
        SCHEMA
      );
      expect(violations.some(v => /earthquake/i.test(v))).toBe(true);
    });

    test('flags dark-type move', () => {
      const { violations } = validateMon(
        { name: 'eevee', types: ['normal'], moves: [{ name: 'bite', type: 'dark' }] },
        SCHEMA
      );
      expect(violations.some(v => /dark/i.test(v))).toBe(true);
    });

    test('flags ghost-type move', () => {
      const { violations } = validateMon(
        { name: 'clefairy', types: ['fairy'], moves: [{ name: 'shadow-ball', type: 'ghost' }] },
        SCHEMA
      );
      expect(violations.length).toBeGreaterThan(0);
    });

    test('passes allowed move', () => {
      const { violations } = validateMon(
        { name: 'charmander', types: ['fire'], moves: [{ name: 'flamethrower', type: 'fire' }] },
        SCHEMA
      );
      expect(violations).toHaveLength(0);
    });
  });

  describe('restricted type moves (psychic / fairy)', () => {
    test('flags offensive psychic move on psychic-type', () => {
      const { violations } = validateMon(
        {
          name: 'alakazam',
          types: ['psychic'],
          moves: [{ name: 'psychic', type: 'psychic' }],
        },
        SCHEMA
      );
      expect(violations.some(v => /psychic/i.test(v))).toBe(true);
    });

    test('allows psychic move on non-psychic-type', () => {
      const { violations } = validateMon(
        {
          name: 'jigglypuff',
          types: ['normal', 'fairy'],
          moves: [{ name: 'psychic', type: 'psychic' }],
        },
        SCHEMA
      );
      // psychic restricted_types only applies to psychic-TYPE Pokémon
      const psychicViolation = violations.filter(v =>
        v.includes('psychic-type Pokémon') || v.includes('Offensive psychic')
      );
      expect(psychicViolation).toHaveLength(0);
    });

    test('flags offensive fairy move on fairy-type', () => {
      const { violations } = validateMon(
        {
          name: 'togekiss',
          types: ['fairy', 'flying'],
          moves: [{ name: 'moonblast', type: 'fairy' }],
        },
        SCHEMA
      );
      expect(violations.some(v => /moonblast/i.test(v) || /fairy/i.test(v))).toBe(true);
    });
  });

  describe('held items', () => {
    test('flags forbidden held item', () => {
      const { violations } = validateMon(
        { name: 'snorlax', types: ['normal'], moves: [], held_item: 'leftovers' },
        SCHEMA
      );
      expect(violations.some(v => /leftovers/i.test(v))).toBe(true);
    });

    test('passes allowed held item', () => {
      const { violations } = validateMon(
        { name: 'snorlax', types: ['normal'], moves: [], held_item: 'sitrus-berry' },
        SCHEMA
      );
      expect(violations).toHaveLength(0);
    });

    test('normalises item name spaces to dashes', () => {
      const { violations } = validateMon(
        { name: 'snorlax', types: ['normal'], moves: [], held_item: 'choice band' },
        SCHEMA
      );
      expect(violations.some(v => /choice-band|choice band/i.test(v))).toBe(true);
    });
  });
});

describe('secondary effect moves', () => {
  const SCHEMA_SE = {
    ...SCHEMA,
    forbidden_secondary_effects: ['par', 'brn', 'frz', 'psn', 'tox', 'slp', 'flinch', 'confusion'],
  };

  test('flags move with forbidden secondary status (burn)', () => {
    const { violations } = validateMon(
      {
        name: 'pikachu', types: ['electric'],
        moves: [{ name: 'flamethrower', type: 'fire', secondary_status: 'brn', secondary_chance: 10 }],
      },
      SCHEMA_SE
    );
    expect(violations.some(v => /brn/i.test(v))).toBe(true);
  });

  test('flags move with forbidden secondary volatile (flinch)', () => {
    const { violations } = validateMon(
      {
        name: 'pikachu', types: ['electric'],
        moves: [{ name: 'ironhead', type: 'steel', secondary_volatile: 'flinch', secondary_chance: 30 }],
      },
      SCHEMA_SE
    );
    expect(violations.some(v => /flinch/i.test(v))).toBe(true);
  });

  test('flags move with stat-drop secondary', () => {
    const { violations } = validateMon(
      {
        name: 'pikachu', types: ['electric'],
        moves: [{ name: 'aurorabeam', type: 'ice', secondary_boosts: { atk: -1 }, secondary_chance: 10 }],
      },
      SCHEMA_SE
    );
    expect(violations.some(v => /stat|lower/i.test(v))).toBe(true);
  });

  test('allows move with no secondary effect', () => {
    const { violations } = validateMon(
      {
        name: 'pikachu', types: ['electric'],
        moves: [{ name: 'thunderbolt', type: 'electric', secondary_status: null }],
      },
      SCHEMA_SE
    );
    expect(violations).toHaveLength(0);
  });

  test('ignores secondary effects when forbidden_secondary_effects is absent', () => {
    const { violations } = validateMon(
      {
        name: 'pikachu', types: ['electric'],
        moves: [{ name: 'flamethrower', type: 'fire', secondary_status: 'brn' }],
      },
      SCHEMA  // no forbidden_secondary_effects
    );
    expect(violations).toHaveLength(0);
  });
});

describe('validateTeam', () => {
  test('returns valid for clean team', () => {
    const result = validateTeam(
      [
        { name: 'gogoat',    types: ['grass'],          moves: [] },
        { name: 'stantler',  types: ['normal'],         moves: [] },
        { name: 'garganacl', types: ['rock'],           moves: [] },
      ],
      SCHEMA
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('returns invalid when a team member has forbidden type', () => {
    const result = validateTeam(
      [
        { name: 'gogoat',  types: ['grass'], moves: [] },
        { name: 'gengar',  types: ['ghost', 'poison'], moves: [] },
      ],
      SCHEMA
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => /gengar/i.test(v))).toBe(true);
  });

  test('prefixes each violation with Pokémon name', () => {
    const result = validateTeam(
      [{ name: 'haunter', types: ['ghost', 'poison'], moves: [] }],
      SCHEMA
    );
    expect(result.violations[0]).toMatch(/haunter/i);
  });
});

describe('forbidden species', () => {
  const schemaWithSpecies = {
    ...SCHEMA,
    forbidden_species: ['cubone'],
  };

  test('flags cubone by name', () => {
    const { violations } = validateMon(
      { name: 'cubone', types: ['ground'], moves: [] },
      schemaWithSpecies
    );
    expect(violations.some(v => /cubone/i.test(v))).toBe(true);
  });

  test('passes a legal species', () => {
    const { violations } = validateMon(
      { name: 'gogoat', types: ['grass'], moves: [] },
      schemaWithSpecies
    );
    expect(violations).toHaveLength(0);
  });

  test('is case-insensitive', () => {
    const { violations } = validateMon(
      { name: 'Cubone', types: ['ground'], moves: [] },
      schemaWithSpecies
    );
    expect(violations.some(v => /cubone/i.test(v))).toBe(true);
  });
});

describe('allowed move — substitute', () => {
  test('substitute is not flagged as forbidden', () => {
    const { violations } = validateMon(
      { name: 'eevee', types: ['normal'], moves: [{ name: 'substitute', type: 'normal' }] },
      SCHEMA
    );
    expect(violations.filter(v => /substitute/i.test(v))).toHaveLength(0);
  });
});
