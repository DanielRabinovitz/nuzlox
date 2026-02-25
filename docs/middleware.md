# middleware/

## requireAuth.js

Redirects unauthenticated requests to `/auth/login` with a flash message.
Stores the originally requested URL in `req.session.returnTo` for post-login redirect.

## requireAdmin.js

Extends `requireAuth`. Additionally checks `req.session.user.role === 'admin'`.
Returns 403 if the user is authenticated but not an admin.

## rateLimiter.js

Exports named `express-rate-limit` instances:

| Export | Window | Max | Applied to |
|--------|--------|-----|------------|
| `authLimiter` | 15 min | 15 | `POST /auth/login`, `POST /auth/register` |
| `reportLimiter` | 10 min | 10 | `POST /api/v1/forum/report` |
| `apiLimiter` | 1 min | 100 | All `/api/v1/*` routes |

## csrfProtection.js

Custom session-based CSRF middleware. Does **not** use `csurf` (deprecated).

### `req.csrfToken()`
Lazy-generates a 32-byte hex token stored in `req.session._csrf`. Returns the same token on repeat calls within the same session.

### Validation
Checks `req.body._csrf || req.headers['x-csrf-token'] || req.query._csrf` on `POST`, `PUT`, `PATCH`, `DELETE` requests. Returns 403 on mismatch.

@ref wallbreaker/docs/legal/gdpr-compliance.md — CSRF requirement for state-changing operations

## gpcSignal.js

Reads the `Sec-GPC: 1` request header. If present, sets `req.gpcOptOut = true` and:
- If user is logged in, persists `gpc_opt_out = 1` to the `users` table via `db.run()`
- Stores the flag in `req.session.user.gpc_opt_out` for same-session access

@ref wallbreaker/docs/legal/ccpa-cpra-compliance.md — GPC signal honoring (CCPA §1798.135)
