# config/

## database.js

Unified database interface supporting SQLite (dev) and MySQL (prod), selected by `DB_DRIVER` env var.

### Exports

| Export | Signature | Description |
|--------|-----------|-------------|
| `db.all(sql, params)` | `async (string, any[]) → row[]` | Returns all matching rows |
| `db.get(sql, params)` | `async (string, any[]) → row\|undefined` | Returns first matching row |
| `db.run(sql, params)` | `async (string, any[]) → {lastId, changes}` | Executes write query |

**SQLite path:** Uses `better-sqlite3` (synchronous), wrapped in `Promise.resolve()` for uniform async interface.
**MySQL path:** Uses `mysql2/promise` connection pool. `db.run()` maps `insertId` → `lastId`, `affectedRows` → `changes`.

## session.js

Exports the `express-session` config object.

- **Dev:** MemoryStore (default) — fine for single-process local dev
- **Prod:** `express-mysql-session` MySQLStore — sessions survive Passenger restarts, work across multi-instance deploys
- Session cookie is `httpOnly`, `sameSite: 'lax'`, `secure` in production

## cache.js

Exports a singleton `NodeCache` instance with default TTL of 600 s. Used by:
- `models/Ruleset.js` — caches current ruleset (key `pk:current_ruleset`, TTL 3600 s)
- `services/moderation.js` — caches blocked phrases list (key `mod:blocked_phrases`, TTL 900 s)

## email.js

Exports a `sendMail(options)` function wrapping Nodemailer.

- `EMAIL_DRIVER=console` — prints `subject`, `to`, and `text` to stdout; no SMTP needed in dev
- `EMAIL_DRIVER=smtp` — real Nodemailer SMTP transport using `EMAIL_HOST/PORT/USER/PASS` env vars
- `EMAIL_FROM` env var sets the From address (default: `noreply@nuzlox.com`)

@ref wallbreaker/docs/legal/gdpr-compliance.md — transactional email requirements
