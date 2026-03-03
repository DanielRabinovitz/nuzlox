-- migrations/mysql/001_initial_schema.sql
-- Nuzlox initial schema for MySQL (production on Hostinger)
-- Run with: node scripts/db-migrate.js  (DB_DRIVER=mysql)
--
-- Differences from SQLite migration:
--   • BIGINT AUTO_INCREMENT instead of INTEGER PRIMARY KEY AUTOINCREMENT
--   • TINYINT(1) for booleans instead of INTEGER
--   • TIMESTAMP with ON UPDATE CURRENT_TIMESTAMP for updated_at columns
--   • VARCHAR instead of TEXT where lengths are bounded
--   • JSON column type where supported (MySQL 5.7.8+)
--   • utf8mb4 charset throughout

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   BIGINT       NOT NULL AUTO_INCREMENT,
  username             VARCHAR(30)  NOT NULL,
  email                VARCHAR(255) NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  role                 VARCHAR(20)  NOT NULL DEFAULT 'member',
  email_verified       TINYINT(1)   NOT NULL DEFAULT 0,
  email_verify_token   VARCHAR(255),
  profile_visibility   VARCHAR(20)  NOT NULL DEFAULT 'public',
  dm_enabled           TINYINT(1)   NOT NULL DEFAULT 1,
  is_minor             TINYINT(1)   NOT NULL DEFAULT 0,
  dob_year             SMALLINT,
  youtube_channel_url  TEXT,
  gpc_opt_out          TINYINT(1)   NOT NULL DEFAULT 0,
  status               VARCHAR(20)  NOT NULL DEFAULT 'active',
  deleted_at           TIMESTAMP    NULL     DEFAULT NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email    (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_consents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_consents (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  user_id      BIGINT       NOT NULL,
  consent_type VARCHAR(50)  NOT NULL,
  granted      TINYINT(1)   NOT NULL DEFAULT 0,
  ip_hash      VARCHAR(255),
  granted_at   TIMESTAMP    NULL     DEFAULT NULL,
  revoked_at   TIMESTAMP    NULL     DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consents_user (user_id),
  CONSTRAINT fk_consents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_dsr_requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_dsr_requests (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  user_id      BIGINT       NOT NULL,
  request_type VARCHAR(30)  NOT NULL DEFAULT 'export',
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  deadline     DATE,
  fulfilled_at TIMESTAMP    NULL     DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dsr_user   (user_id),
  KEY idx_dsr_status (status),
  CONSTRAINT fk_dsr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_email_suppressions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_email_suppressions (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  reason     VARCHAR(50),
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppression_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_ruleset_versions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_ruleset_versions (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  version_number VARCHAR(20)  NOT NULL,
  summary        TEXT,
  is_current     TINYINT(1)   NOT NULL DEFAULT 0,
  published_by   BIGINT,
  published_at   TIMESTAMP    NULL     DEFAULT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rv_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_ruleset_rules ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_ruleset_rules (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  version_id BIGINT       NOT NULL,
  rule_key   VARCHAR(100) NOT NULL,
  category   VARCHAR(100) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  title      VARCHAR(200) NOT NULL,
  body       TEXT         NOT NULL,
  severity   VARCHAR(20)  NOT NULL DEFAULT 'mandatory',
  source_ref TEXT,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rules_version  (version_id),
  KEY idx_rules_category (category),
  CONSTRAINT fk_rules_version FOREIGN KEY (version_id) REFERENCES nuzlox_ruleset_versions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_teams ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_teams (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  user_id        BIGINT       NOT NULL,
  playthrough_id BIGINT,
  name           VARCHAR(150) NOT NULL,
  is_valid       TINYINT(1)   NOT NULL DEFAULT 0,
  violations     JSON,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teams_user        (user_id),
  KEY idx_teams_playthrough (playthrough_id),
  CONSTRAINT fk_teams_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_team_members ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_team_members (
  id      BIGINT       NOT NULL AUTO_INCREMENT,
  team_id BIGINT       NOT NULL,
  slot    TINYINT      NOT NULL,
  species VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),
  moves   JSON,
  item    VARCHAR(100),
  bred    TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_members_team (team_id),
  CONSTRAINT fk_members_team FOREIGN KEY (team_id) REFERENCES nuzlox_teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_forums ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_forums (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  parent_id   BIGINT,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  slug        VARCHAR(200) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  topic_count INT          NOT NULL DEFAULT 0,
  post_count  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_forums_slug (slug),
  KEY idx_forums_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_topics ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_topics (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  forum_id    BIGINT       NOT NULL,
  author_id   BIGINT,
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(300) NOT NULL,
  reply_count INT          NOT NULL DEFAULT 0,
  is_pinned   TINYINT(1)   NOT NULL DEFAULT 0,
  is_locked   TINYINT(1)   NOT NULL DEFAULT 0,
  status      VARCHAR(20)  NOT NULL DEFAULT 'open',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_topics_slug (slug),
  KEY idx_topics_forum (forum_id),
  CONSTRAINT fk_topics_forum FOREIGN KEY (forum_id) REFERENCES nuzlox_forums (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_replies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_replies (
  id                   BIGINT     NOT NULL AUTO_INCREMENT,
  topic_id             BIGINT     NOT NULL,
  author_id            BIGINT,
  content              TEXT       NOT NULL,
  is_ruling_precedent  TINYINT(1) NOT NULL DEFAULT 0,
  status               VARCHAR(20) NOT NULL DEFAULT 'visible',
  deleted_at           TIMESTAMP  NULL     DEFAULT NULL,
  created_at           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_replies_topic (topic_id),
  CONSTRAINT fk_replies_topic FOREIGN KEY (topic_id) REFERENCES nuzlox_topics (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_playthroughs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_playthroughs (
  id                   BIGINT       NOT NULL AUTO_INCREMENT,
  user_id              BIGINT       NOT NULL,
  title                VARCHAR(150) NOT NULL,
  game_slug            VARCHAR(50)  NOT NULL,
  status               VARCHAR(20)  NOT NULL DEFAULT 'active',
  current_team         JSON,
  youtube_playlist_url TEXT,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pt_user (user_id),
  CONSTRAINT fk_pt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_tracker_events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_tracker_events (
  id             BIGINT      NOT NULL AUTO_INCREMENT,
  playthrough_id BIGINT      NOT NULL,
  event_type     VARCHAR(50) NOT NULL,
  data           JSON,
  deleted_at     TIMESTAMP   NULL     DEFAULT NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_playthrough (playthrough_id),
  KEY idx_events_type        (event_type),
  CONSTRAINT fk_events_pt FOREIGN KEY (playthrough_id) REFERENCES nuzlox_playthroughs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_moderation_queue ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_moderation_queue (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  content_type VARCHAR(30)  NOT NULL,
  content_id   BIGINT       NOT NULL,
  reason       VARCHAR(100),
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  TIMESTAMP    NULL     DEFAULT NULL,
  resolved_by  BIGINT,
  PRIMARY KEY (id),
  KEY idx_mq_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_moderation_actions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_moderation_actions (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  target_id   BIGINT       NOT NULL,
  target_type VARCHAR(30)  NOT NULL,
  action_type VARCHAR(50)  NOT NULL,
  reason      TEXT,
  mod_id      BIGINT,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ma_target (target_id, target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_appeals ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_appeals (
  id         BIGINT     NOT NULL AUTO_INCREMENT,
  user_id    BIGINT     NOT NULL,
  action_id  BIGINT     NOT NULL,
  grounds    TEXT       NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending',
  outcome    TEXT,
  created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL     DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_appeals_user   (user_id),
  KEY idx_appeals_action (action_id),
  CONSTRAINT fk_appeals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_reports (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  reporter_id     BIGINT,
  content_type    VARCHAR(30)  NOT NULL,
  content_id      BIGINT       NOT NULL,
  category        VARCHAR(50)  NOT NULL,
  description     TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  resolution_note TEXT,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_reporter (reporter_id),
  KEY idx_reports_content  (content_type, content_id),
  KEY idx_reports_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_blocks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_blocks (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  user_id    BIGINT      NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'ban',
  reason     TEXT,
  mod_id     BIGINT,
  expires_at TIMESTAMP   NULL     DEFAULT NULL,
  lifted_at  TIMESTAMP   NULL     DEFAULT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_blocks_user (user_id),
  CONSTRAINT fk_blocks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── nuzlox_bug_reports ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_bug_reports (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  user_id           BIGINT        NOT NULL,
  title             VARCHAR(255)  NOT NULL,
  description       TEXT          NOT NULL,
  url_reported_on   TEXT,
  github_issue_url  VARCHAR(255)  DEFAULT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bug_reports_user (user_id),
  CONSTRAINT fk_bug_reports_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
