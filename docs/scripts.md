# scripts/

Utility scripts run via `npm run` or directly with `node`. Never imported by the application at runtime.

## db-migrate.js

Reads the appropriate migration file (`migrations/sqlite/` or `migrations/mysql/`) based on `DB_DRIVER` and executes it. Safe to re-run (all statements use `IF NOT EXISTS`).

```sh
npm run migrate        # uses DB_DRIVER from .env
DB_DRIVER=mysql node scripts/db-migrate.js
```

## seed-ruleset.js

Reads `data/ruleset-seed.json` and inserts an initial ruleset version (v1.0.0) with all rules. Sets `is_current=1`. Skips if a current version already exists.

```sh
node scripts/seed-ruleset.js
```

## seed-dev.js

Creates two development accounts and the default forum structure. **Only for local dev — never run in production.**

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | `admin@nuzlox.dev` | `AdminPass1!` | admin |
| Player | `player@nuzlox.dev` | `PlayerPass1!` | member |

Forum structure created:
- "Nuzlox Debates" (parent)
  - Kosher Pokémon
  - Team Composition
  - Laws of Battle
  - Animal Welfare
  - Shabbat
  - Rulings & Precedents

```sh
npm run seed
```

## generate-ruleset-cache.js

Reads the current published ruleset from the DB and writes `public/cache/ruleset-validator.json`. This file is served statically for the teambuilder client.

Called automatically by `routes/api/admin.js` when a ruleset version is published (via `child_process.execFile`). Can also be run manually after seeding.

```sh
node scripts/generate-ruleset-cache.js
```

The output JSON has the shape:
```json
{
  "version": "1.0.0",
  "generated_at": "...",
  "forbidden_types": ["ghost", "dark"],
  "restricted_types": [{"type": "psychic", "forbidden_moves": [...]}, ...],
  "forbidden_species_categories": ["undead", "fossil", "legendary"],
  "forbidden_moves": [...],
  "forbidden_move_categories": ["ohko"],
  "forbidden_items": [...]
}
```
