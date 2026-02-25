-- Nuzlox SQLite Schema — development use only
-- Run via: node scripts/db-migrate.js
-- @ref docs/migrations.md

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  email                      TEXT UNIQUE NOT NULL,
  email_verified             INTEGER NOT NULL DEFAULT 0,
  email_verify_token         TEXT,
  password_hash              TEXT NOT NULL,
  username                   TEXT UNIQUE,
  role                       TEXT NOT NULL DEFAULT 'user',
  date_of_birth              TEXT NOT NULL,
  is_minor                   INTEGER NOT NULL DEFAULT 0,
  age_verified_at            TEXT,
  marketing_opt_in           INTEGER NOT NULL DEFAULT 0,
  word_filters               TEXT,
  content_filters            TEXT,
  youtube_channel_url        TEXT,
  profile_visibility         TEXT NOT NULL DEFAULT 'public',
  dm_enabled                 INTEGER NOT NULL DEFAULT 1,
  content_profiling          INTEGER NOT NULL DEFAULT 0,
  gpc_opt_out                INTEGER NOT NULL DEFAULT 0,
  password_reset_token       TEXT,
  password_reset_expires     TEXT,
  created_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at                 TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_consent_records (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  consent_type     TEXT NOT NULL,
  granted          INTEGER NOT NULL,
  recorded_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash          TEXT,
  consent_version  TEXT NOT NULL,
  consent_text     TEXT NOT NULL,
  source           TEXT NOT NULL,
  withdrawn_at     TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_ruleset_versions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  version_label    TEXT NOT NULL,
  is_current       INTEGER NOT NULL DEFAULT 0,
  changelog        TEXT,
  published_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by     INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS nuzlox_rules (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  ruleset_version_id  INTEGER NOT NULL REFERENCES nuzlox_ruleset_versions(id),
  rule_key            TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'General',
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  citations           TEXT DEFAULT '[]',
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nuzlox_saved_teams (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  team_name        TEXT NOT NULL,
  pokemon          TEXT NOT NULL,
  ruleset_version  TEXT NOT NULL,
  is_valid         INTEGER,
  violations       TEXT,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nuzlox_forums (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id        INTEGER DEFAULT NULL REFERENCES nuzlox_forums(id),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nuzlox_topics (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  forum_id         INTEGER NOT NULL REFERENCES nuzlox_forums(id),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',
  reply_count      INTEGER NOT NULL DEFAULT 0,
  last_reply_at    TEXT,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nuzlox_forum_replies (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id              INTEGER NOT NULL REFERENCES nuzlox_topics(id),
  user_id               INTEGER NOT NULL REFERENCES users(id),
  content               TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'visible',
  is_ruling_precedent   INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at            TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_playthroughs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL REFERENCES users(id),
  game_slug             TEXT NOT NULL,
  title                 TEXT NOT NULL,
  current_team          TEXT DEFAULT '[]',
  house_rules           TEXT DEFAULT '{}',
  youtube_playlist_url  TEXT,
  status                TEXT NOT NULL DEFAULT 'active',
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nuzlox_playthrough_events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  playthrough_id   INTEGER NOT NULL REFERENCES nuzlox_playthroughs(id),
  user_id          INTEGER NOT NULL,
  event_type       TEXT NOT NULL,
  data             TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_blocked_phrases (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase           TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'low',
  added_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nuzlox_moderation_queue (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id       INTEGER NOT NULL,
  content_type     TEXT NOT NULL,
  user_id          INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  scan_result      TEXT,
  submitted_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nuzlox_moderation_actions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id       INTEGER NOT NULL,
  content_type     TEXT NOT NULL,
  user_id          INTEGER NOT NULL,
  action_type      TEXT NOT NULL,
  reason_code      TEXT NOT NULL,
  tos_clause       TEXT,
  legal_basis      TEXT,
  automated        INTEGER DEFAULT 0,
  human_reviewed   INTEGER DEFAULT 0,
  sor_sent_at      TEXT DEFAULT NULL,
  sor_method       TEXT,
  appeal_deadline  TEXT DEFAULT NULL,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nuzlox_moderation_appeals (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  action_id        INTEGER NOT NULL REFERENCES nuzlox_moderation_actions(id),
  user_id          INTEGER NOT NULL,
  reason           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  outcome_reason   TEXT,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at      TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_reports (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id      INTEGER,
  content_id       INTEGER NOT NULL,
  content_type     TEXT NOT NULL,
  category         TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  action_id        INTEGER,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash          TEXT
);

CREATE TABLE IF NOT EXISTS nuzlox_user_relationships (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  target_user_id   INTEGER NOT NULL,
  relationship     TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, target_user_id, relationship)
);

CREATE TABLE IF NOT EXISTS nuzlox_dmca_notices (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  complainant_name     TEXT NOT NULL,
  complainant_email    TEXT NOT NULL,
  content_url          TEXT NOT NULL,
  uploader_id          INTEGER,
  notice_valid         INTEGER NOT NULL,
  action_taken         TEXT,
  action_taken_at      TEXT DEFAULT NULL,
  counter_received_at  TEXT DEFAULT NULL,
  counter_valid        INTEGER DEFAULT NULL,
  content_restored_at  TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_dsr_requests (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER,
  email            TEXT NOT NULL,
  request_type     TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  received_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deadline_at      TEXT NOT NULL,
  fulfilled_at     TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS nuzlox_email_suppressions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash        TEXT UNIQUE NOT NULL,
  suppression_type  TEXT NOT NULL,
  source            TEXT,
  suppressed_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_consent_user        ON nuzlox_consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_version       ON nuzlox_rules(ruleset_version_id);
CREATE INDEX IF NOT EXISTS idx_teams_user          ON nuzlox_saved_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_forum        ON nuzlox_topics(forum_id);
CREATE INDEX IF NOT EXISTS idx_replies_topic       ON nuzlox_forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_events_playthrough  ON nuzlox_playthrough_events(playthrough_id);
CREATE INDEX IF NOT EXISTS idx_events_user         ON nuzlox_playthrough_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_queue_status    ON nuzlox_moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON nuzlox_reports(status);
CREATE INDEX IF NOT EXISTS idx_dsr_deadline        ON nuzlox_dsr_requests(deadline_at);
CREATE INDEX IF NOT EXISTS idx_dsr_status          ON nuzlox_dsr_requests(status);
CREATE INDEX IF NOT EXISTS idx_relationships_user  ON nuzlox_user_relationships(user_id);
