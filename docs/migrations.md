# migrations/

SQL migration files. Applied by `scripts/db-migrate.js`.

## sqlite/001_initial_schema.sql

SQLite schema for local development. All 17 tables.

SQLite-specific adaptations vs MySQL:
- `INTEGER PRIMARY KEY AUTOINCREMENT` (not `BIGINT AUTO_INCREMENT`)
- `TEXT` for boolean columns (no `TINYINT(1)`)
- `TEXT` for enum-like columns
- `TEXT` (JSON stored as string) for JSON columns
- No `ON UPDATE CURRENT_TIMESTAMP` — SQLite doesn't support this trigger syntax; `updated_at` is set manually in queries
- `CREATE TABLE IF NOT EXISTS` throughout — safe to re-run

## mysql/001_initial_schema.sql

MySQL/MariaDB schema for production on Hostinger.

MySQL-specific features:
- `BIGINT NOT NULL AUTO_INCREMENT` primary keys
- `TINYINT(1)` for booleans
- `JSON` column type (requires MySQL 5.7.8+)
- `ON UPDATE CURRENT_TIMESTAMP` for `updated_at` columns
- `FOREIGN KEY` constraints with `ON DELETE CASCADE`
- `utf8mb4` charset on all tables
- `ENGINE=InnoDB` for transaction support and FK enforcement
- `SET FOREIGN_KEY_CHECKS = 0/1` wrapper for safe initial load

## Table list

| Table | Purpose |
|-------|---------|
| `users` | Auth, profile, GDPR fields |
| `nuzlox_consents` | Per-user consent records |
| `nuzlox_dsr_requests` | Data subject requests |
| `nuzlox_email_suppressions` | Bounce/unsubscribe list |
| `nuzlox_ruleset_versions` | Immutable ruleset version headers |
| `nuzlox_ruleset_rules` | Rules belonging to a version |
| `nuzlox_teams` | Saved teams with validation results |
| `nuzlox_team_members` | Individual Pokémon within a team |
| `nuzlox_forums` | Forum sections and sub-forums |
| `nuzlox_topics` | Discussion topics |
| `nuzlox_replies` | Replies with soft-delete |
| `nuzlox_playthroughs` | Nuzlocke run records |
| `nuzlox_tracker_events` | Event log (journal, checkpoint, catch, faint…) |
| `nuzlox_moderation_queue` | Items awaiting mod review |
| `nuzlox_moderation_actions` | Recorded mod decisions |
| `nuzlox_appeals` | User appeals of mod actions |
| `nuzlox_reports` | User-submitted content reports |
| `nuzlox_blocks` | Bans and mutes |
