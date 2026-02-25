# models/

All models import `config/database.js` and use the unified `db.all/get/run` interface.
Models are plain object exports (no classes) — each function is a named async export.

## User.js

Handles authentication and account lifecycle.

| Function | Description |
|----------|-------------|
| `validateAge(dob)` | Pure function. Calculates age from `{year,month,day}`. Returns `{valid, isMinor, error}`. Enforces 13+ gate (COPPA). |
| `create(data)` | Creates user + consent records. Applies UK Children's Code Standard 7 privacy defaults for minors (`profile_visibility='private'`, `dm_enabled=0`). Hashes password with bcryptjs (rounds=12). |
| `findById(id)` | Returns user row by primary key. |
| `findByEmail(email)` | Returns user row by email. |
| `verifyPassword(plain, hash)` | `bcrypt.compare` wrapper; returns boolean. |
| `update(id, fields)` | Partial update; only whitelisted fields permitted. |
| `softDelete(id)` | Sets `deleted_at`, anonymises PII fields. Triggers 30-day retention window before hard-delete (via cron). |

@ref wallbreaker/docs/legal/child-safety.md — COPPA age gate, UK Children's Code Standard 7

## Ruleset.js

Manages immutable published ruleset versions.

| Function | Description |
|----------|-------------|
| `getCurrentVersion()` | node-cache key `pk:current_ruleset` (TTL 1 hr). Returns `{version, rules[]}`. |
| `getAllVersions()` | Returns all versions ordered by `created_at DESC`. |
| `getRulesForVersion(versionId)` | Returns rules for a specific version. |
| `groupByCategory(rules)` | Returns `Map<string, rule[]>` for template rendering. |
| `createVersion(data)` | Inserts a new draft version + rules array. |
| `publish(versionId, adminId)` | Sets `is_current=1`, clears node-cache, triggers `generate-ruleset-cache.js`. |

@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Certified True Copy (immutable published versions)

## Team.js

Stores user teams with validation results.

| Function | Description |
|----------|-------------|
| `create(data)` | Creates team + member rows. Stores `violations` as JSON. |
| `findByUser(userId)` | Returns all teams for a user. |
| `findById(teamId, userId)` | Returns one team (scoped to user_id for ownership check). |
| `update(teamId, userId, data)` | Updates team name or members. |
| `delete(teamId, userId)` | Hard-deletes team and its members. |

## Forum.js

Custom forum with soft-delete and 15-minute grace window on replies.

| Function | Description |
|----------|-------------|
| `getAllForums()` | Returns all forums (parent + sub) ordered by `sort_order`. |
| `getForumWithTopics(slug)` | Returns sub-forum + its non-deleted topics. |
| `getTopic(slug)` | Returns topic + author username + reply count. |
| `getReplies(topicId)` | Returns visible replies (excludes `deleted_at IS NOT NULL`). |
| `createTopic(data)` | Inserts topic, calls `uniqueSlug()` to avoid collisions, increments forum `topic_count`. |
| `createReply(data)` | Inserts reply, increments topic `reply_count`. Triggers `services/moderation.scan()` via `setImmediate`. |
| `softDeleteReply(replyId, userId)` | Enforces 15-minute grace window: checks `created_at` age before setting `deleted_at`. |
| `uniqueSlug(base, table)` | Appends `-2`, `-3`… until slug is unique in the target table. |

@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Undo Redo (15-min grace window)

## Tracker.js

Nuzlocke playthrough tracking with event log.

| Function | Description |
|----------|-------------|
| `getPlaythroughs(userId)` | Returns all playthroughs for a user ordered by `updated_at DESC`. |
| `getPlaythrough(id, userId)` | Returns one playthrough with ownership check. |
| `create(data)` | Creates playthrough. Validates `youtube_playlist_url` if provided. |
| `getEvents(playthroughId, userId)` | Returns all non-deleted events. |
| `addEvent(data)` | Inserts a tracker event (`journal`, `checkpoint`, `catch`, `faint`, `team_update`). |
| `softDeleteEvent(eventId, userId)` | Sets `deleted_at`. Restoreable within 30 days. |
| `restoreEvent(eventId, userId)` | Clears `deleted_at`. |
| `updateTeam(playthroughId, userId, team)` | Updates `current_team` JSON column. |
| `validateYoutubeUrl(url)` | Regex check: must start with `https://(www.)?(youtube.com\|youtu.be)/`. |

@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Undo Redo (30-day soft delete)

## Moderation.js

Content moderation queue, actions, reports, appeals, blocks/mutes.

| Function | Description |
|----------|-------------|
| `getQueue(status)` | Returns moderation queue items with optional status filter. |
| `createReport(data)` | Creates a `nuzlox_reports` row (reporter may be null for guests). |
| `createAction(data)` | Records a `nuzlox_moderation_actions` row. Triggers SOR email via `services/email.sendSOR()`. |
| `createAppeal(data)` | Creates `nuzlox_appeals` row. |
| `resolveAppeal(id, outcome)` | Sets `status`, `outcome`, `resolved_at`. |
| `setRelationship(data)` | Upserts block or mute relationship between two users. |
| `removeRelationship(data)` | Lifts block or mute. |
| `getBlockedPhrases()` | Returns cached phrase list (node-cache key `mod:blocked_phrases`). |

@ref wallbreaker/docs/legal/dsa-compliance.md — Art. 17 (SOR), Art. 20 (appeals)
@ref wallbreaker/docs/legal/online-safety-and-content-moderation.md

## Consent.js

Manages GDPR consent records (one row per user per `consent_type`).

| Function | Description |
|----------|-------------|
| `getForUser(userId)` | Returns all consent rows keyed by `consent_type`. |
| `upsert(userId, type, granted)` | Sets `granted`, `granted_at`/`revoked_at` accordingly. |

@ref wallbreaker/docs/legal/gdpr-compliance.md — consent records, withdrawal

## DSR.js

Data Subject Request management (GDPR Art. 15/17).

| Function | Description |
|----------|-------------|
| `hasPending(userId)` | Returns true if there is already a pending export request. |
| `create(userId, type)` | Creates a DSR row with `deadline = today + 30 days`. |
| `getPendingDeadlines()` | Returns open requests approaching their 30-day deadline (used by cron alert). |

@ref wallbreaker/docs/legal/gdpr-compliance.md — DSR, 30-day response deadline

## EmailSuppression.js

Bounce/unsubscribe suppression list.

| Function | Description |
|----------|-------------|
| `isSuppressed(email)` | Returns true if email is on the suppression list. Used before every outbound email. |
| `add(email, reason)` | Adds email to suppression list. |
