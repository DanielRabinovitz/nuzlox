# routes/

## routes/index.js

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | Renders `views/index.ejs` (home page) |
| GET | `/privacy-policy` | Renders static privacy policy |
| GET | `/rules` | Redirects to `/ruleset` |

## routes/auth.js

Authentication routes. Uses `authLimiter` on login/register.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/auth/register` | Render register form |
| POST | `/auth/register` | Validate with Zod, call `User.create()`, send verification email, redirect to login |
| GET | `/auth/login` | Render login form |
| POST | `/auth/login` | Verify credentials, regenerate session (session fixation prevention), redirect |
| GET | `/auth/logout` | Destroy session, redirect to `/` |
| GET | `/auth/verify` | Verify email token, set `email_verified=1` |

`safeNext` helper: only redirects to paths starting with `/` (prevents open redirect).

@ref wallbreaker/docs/legal/gdpr-compliance.md — consent capture on registration
@ref wallbreaker/docs/legal/child-safety.md — 13+ age gate

## routes/ruleset.js

| Method | Path | Handler |
|--------|------|---------|
| GET | `/ruleset` | `Ruleset.getCurrentVersion()`, render `views/ruleset/index.ejs` |
| GET | `/ruleset/history` | `Ruleset.getAllVersions()`, render `views/ruleset/history.ejs` |
| GET | `/ruleset/:id` | `Ruleset.getRulesForVersion()`, render `views/ruleset/version.ejs` |

## routes/teambuilder.js

| Method | Path | Handler |
|--------|------|---------|
| GET | `/teambuilder` | Render `views/teambuilder/index.ejs`; passes ruleset schema for Alpine.js picker |

## routes/forum.js

| Method | Path | Handler |
|--------|------|---------|
| GET | `/forum` | `Forum.getAllForums()`, render `views/forum/index.ejs` |
| GET | `/forum/new` | Render `views/forum/new-topic.ejs` (auth required) |
| POST | `/forum/new` | Validate, `Forum.createTopic()`, redirect to topic |
| GET | `/forum/:slug` | `Forum.getTopic()` + `Forum.getReplies()`, render `views/forum/topic.ejs` |
| POST | `/forum/:slug/reply` | Validate, `Forum.createReply()`, redirect to topic (auth required) |

## routes/tracker.js

| Method | Path | Handler |
|--------|------|---------|
| GET | `/tracker` | `Tracker.getPlaythroughs()`, render `views/tracker/index.ejs` (auth required) |
| POST | `/tracker/new` | `Tracker.create()`, redirect to new playthrough (auth required) |
| GET | `/tracker/:id` | `Tracker.getPlaythrough()` + events + checkpoints, render `views/tracker/detail.ejs` |
| GET | `/tracker/:id/journal` | `Tracker.getEvents(type=journal)`, render `views/tracker/journal.ejs` |
| POST | `/api/v1/tracker/:id/event` | `Tracker.addEvent()` for checkpoint form submissions |

## routes/account.js

All routes require `requireAuth`.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/account/settings` | Render `views/account/settings.ejs` |
| POST | `/account/settings/profile` | Update username / YouTube channel URL |
| POST | `/account/settings/password` | Change password (current password verified) |
| POST | `/account/delete` | `User.softDelete()`, destroy session |
| GET | `/account/privacy` | `Consent.getForUser()`, render `views/account/privacy.ejs` |
| POST | `/account/privacy/visibility` | `User.update()` profile_visibility |
| POST | `/account/privacy/consent` | `Consent.upsert()` for marketing_email |
| POST | `/account/dsr/export` | `DSR.create()`, redirect with flash |
| GET | `/account/reports` | `Moderation.getReportsByUser()`, render `views/account/reports.ejs` |
| GET | `/account/appeal` | Render `views/account/appeal.ejs` |
| POST | `/account/appeal/:id?` | `Moderation.createAppeal()` |

## routes/api/teams.js

All routes require auth. All operations scoped to `user_id`.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/teams` | Returns user's saved teams as JSON |
| POST | `/api/v1/teams` | Creates team, runs `validateTeam()`, stores `violations` |
| DELETE | `/api/v1/teams/:id` | Deletes team (ownership check) |

## routes/api/forum.js

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/v1/forum/report` | `reportLimiter`, create report (guest-accessible) |
| POST | `/api/v1/forum/block` | Block user (auth required) |
| POST | `/api/v1/forum/unblock` | Unblock user |
| POST | `/api/v1/forum/mute` | Mute user |

## routes/api/tracker.js

All routes require auth.

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/v1/tracker/:id/team` | Update current_team JSON |
| POST | `/api/v1/tracker/:id/journal/save` | Auto-save journal entry as `journal` event |
| POST | `/api/v1/tracker/:id/event` | Add any tracker event |
| DELETE | `/api/v1/tracker/:id/event/:eventId` | Soft-delete event |
| POST | `/api/v1/tracker/:id/event/:eventId/restore` | Restore soft-deleted event |

## routes/api/admin.js

All routes require `requireAdmin`.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/admin/queue` | Returns mod queue as JSON |
| POST | `/api/v1/admin/queue/:id/approve` | Dismiss queue item |
| POST | `/api/v1/admin/queue/:id/remove` | Remove content + send SOR |
| POST | `/api/v1/admin/queue/:id/warn` | Warn user + send SOR |
| POST | `/api/v1/admin/ruleset/publish` | Publish ruleset version, spawn `generate-ruleset-cache.js` |
| POST | `/api/v1/admin/appeals/:id/uphold` | Uphold appeal (reverse action) |
| POST | `/api/v1/admin/appeals/:id/deny` | Deny appeal |
| POST | `/api/v1/admin/blocks/:id/lift` | Lift block/mute |
