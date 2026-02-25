# services/

## validation.js

Pure validation functions for team legality. No DB calls; reads a pre-parsed schema object.

### `validateTeam(team, schema)`

```
team   : Array<{species, types[], category, moves[], item, bred}>
schema : object from /cache/ruleset-validator.json
→ {valid: boolean, violations: string[], warnings: string[]}
```

Checks:
1. **Forbidden types** — ghost, dark (from `schema.forbidden_types`)
2. **Forbidden species categories** — `schema.forbidden_species_categories` (e.g. undead, fossil)
3. **Restricted types** — psychic, fairy (warnings; move-level check required)
4. **Forbidden moves** — Perish Song, Destiny Bond, etc. (`schema.forbidden_moves`)
5. **Forbidden move categories** — one-hit-KO moves (`schema.forbidden_move_categories`)
6. **Forbidden items** — held items banned by the ruleset (`schema.forbidden_items`)
7. **Breeding flag** — warns if no `bred=true` member when team size ≥ 2

@ref wallbreaker/docs/ (fictional halacha) — Laws of Team Composition, Laws of Battle
@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Safe Practice Zone

## email.js

Wrapper functions around `config/email.js` for structured transactional emails.

| Function | Sends |
|----------|-------|
| `sendVerification(user, token)` | Email verify link (`/auth/verify?token=…`) |
| `sendSOR(user, action)` | Statement of Reasons for moderation action (DSA Art. 17) |
| `sendDsrDeadlineAlert(admin, dsr)` | Alert to admin when a DSR approaches its 30-day deadline |

All functions first check `EmailSuppression.isSuppressed(email)` and skip if suppressed.

@ref wallbreaker/docs/legal/dsa-compliance.md — Art. 17 SOR obligation
@ref wallbreaker/docs/legal/gdpr-compliance.md — Art. 15/17 DSR

## moderation.js

### `scan(replyId)`

Asynchronous content scan triggered via `setImmediate()` after a reply is saved (does not block HTTP response).

1. Loads `blocked_phrases` from node-cache (TTL 15 min)
2. Fetches reply content from DB
3. If a blocked phrase matches: sets reply `status = 'held'`, creates a `moderation_queue` row, sends SOR email to author
4. High-confidence matches (e.g. `illegal_content`) are auto-removed without admin review

@ref wallbreaker/docs/legal/online-safety-and-content-moderation.md
@ref wallbreaker/docs/legal/dsa-compliance.md — Art. 16 (notice and action)

## export.js

### `buildExport(userId)`

Assembles a JSON export of all personal data held for a user (DSR Art. 15 portable export):
- `users` record (PII redacted: password_hash replaced with `[redacted]`)
- All consents
- All forum replies
- All tracker events and playthroughs
- All teams

Returns the export object; caller is responsible for emailing it.

@ref wallbreaker/docs/legal/gdpr-compliance.md — Art. 15/20 data portability

## cron.js

### `start()`

Registers all `node-cron` schedules. Called once by `server.js` after the HTTP server begins listening.

| Job | Schedule | Action |
|-----|----------|--------|
| `enforceDataRetention` | Daily 02:00 | Hard-deletes tracker events soft-deleted >30 days ago; anonymises user accounts soft-deleted >30 days ago |
| `hardDeleteSoftReplies` | Daily 03:00 | Hard-deletes forum replies soft-deleted >30 days ago |
| `dsrDeadlineAlert` | Daily 08:00 | Calls `sendDsrDeadlineAlert()` for any DSR due in ≤3 days |
| `dmcaRepeatInfringerCheck` | Weekly Mon 09:00 | Flags users with ≥3 DMCA-related moderation actions for manual review |

@ref wallbreaker/docs/legal/gdpr-compliance.md — data retention schedule
@ref wallbreaker/docs/legal/dmca-compliance.md — repeat infringer policy
