# server.js

Entry point for the Express application. Compatible with Phusion Passenger (`process.env.PORT || 3000`).

## Responsibilities

- Initialises Express and sets `view engine: ejs`, layout path, and static file serving
- Mounts all middleware in order (see [middleware.md](./middleware.md))
- Mounts all route modules under their path prefixes
- Defines the 404 and 500 error handlers (renders `views/error.ejs`)
- Starts `services/cron.js` tasks on listen

## Template locals injected for every request

| Local | Source | Used by |
|-------|--------|---------|
| `currentUser` | `req.session.user` | nav, conditional UI |
| `isAdmin` | `currentUser.role === 'admin'` | admin-only UI |
| `flash` | `req.flash()` | `partials/flash.ejs` |
| `csrfToken` | `req.csrfToken()` | every form + meta tag |
| `siteUrl` | `process.env.SITE_URL` | email templates |

## Route mount points

| Prefix | Module |
|--------|--------|
| `/` | `routes/index.js` |
| `/auth` | `routes/auth.js` |
| `/ruleset` | `routes/ruleset.js` |
| `/teambuilder` | `routes/teambuilder.js` |
| `/forum` | `routes/forum.js` |
| `/tracker` | `routes/tracker.js` |
| `/account` | `routes/account.js` |
| `/api/v1/teams` | `routes/api/teams.js` |
| `/api/v1/forum` | `routes/api/forum.js` |
| `/api/v1/tracker` | `routes/api/tracker.js` |
| `/api/v1/admin` | `routes/api/admin.js` |
