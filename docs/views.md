# views/

All EJS templates use `express-ejs-layouts`. Body-only content is written in each template; the layout (`views/layouts/main.ejs`) wraps it with `<html>`, nav, flash, and footer.

## views/layouts/main.ejs

Master HTML shell. Injects:
- `<meta name="csrf-token">` — read by Alpine.js fetch calls
- Skip link (`#main-content`) — WCAG §2.4.1
- `<title>` from `pageTitle` local or default `'Nuzlox'` — WCAG §2.4.2
- Alpine.js CDN script
- `partials/nav.ejs`, `partials/flash.ejs`, `partials/footer.ejs`

## views/partials/

| File | Purpose |
|------|---------|
| `nav.ejs` | Sticky site nav. Alpine.js dropdown for logged-in user menu |
| `flash.ejs` | `role="status" aria-live="polite"` flash region — WCAG §4.1.3 |
| `footer.ejs` | CCPA "Do Not Sell" link; fan project disclaimer |

## views/auth/

| File | Key features |
|------|-------------|
| `register.ejs` | Full DOB age gate (3 selects: day/month/year); separate ToS + marketing checkboxes; COPPA §312.5 |
| `login.ejs` | Standard email/password form |

## views/ruleset/

| File | Key features |
|------|-------------|
| `index.ejs` | TOC nav sidebar; rule cards with `badge--severity-*` colours; source citations |
| `history.ejs` | All versions listed; links to individual version pages |
| `version.ejs` | Single version with all its rules; "Current" badge on live version |

@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Certified True Copy

## views/teambuilder/

| File | Key features |
|------|-------------|
| `index.ejs` | Alpine.js `teambuilder(playthroughId)` component; slot grid; picker modal; validation panel |

Loads `public/js/teambuilder-engine.js` and `public/cache/ruleset-validator.json`.

@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Safe Practice Zone

## views/forum/

| File | Key features |
|------|-------------|
| `index.ejs` | Forum sections and sub-forum cards with topic/post counts |
| `topic.ejs` | Reply list; `reply-card--ruling` variant for precedent replies; report modal (Alpine.js); reply form (auth-gated) |
| `new-topic.ejs` | New topic form with forum selector |

`topic.ejs` loads `public/js/forum.js` for `reportModal()` component.

@ref wallbreaker/docs/accessibility/WCAG/03-understandable.md §3.3.2 (explicit reply form labels)

## views/tracker/

| File | Key features |
|------|-------------|
| `index.ejs` | Playthrough list + `<details>` new playthrough form |
| `detail.ejs` | Checkpoint list; party sidebar (Total Recall APX pattern); quick actions |
| `journal.ejs` | Alpine.js `journal(playthroughId)` auto-save; `aria-live="polite"` save status (WCAG §2.2.2) |

@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Total Recall
@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Save Early Save Often

## views/account/

| File | Key features |
|------|-------------|
| `settings.ejs` | Profile update; password change; account delete (confirm dialog; WCAG §3.3.4) |
| `privacy.ejs` | Profile visibility (gated for minors); marketing email consent; DSR export request; GPC status |
| `reports.ejs` | List of reports submitted by current user with status |
| `appeal.ejs` | Appeal form citing DSA Art. 20 |

## views/admin/

| File | Key features |
|------|-------------|
| `queue.ejs` | Three-tab view: moderation queue / appeals / blocks+mutes |
| `ruleset-editor.ejs` | Draft/published version editor; publish action with confirmation |

@ref wallbreaker/docs/legal/dsa-compliance.md — Art. 17 (SOR), Art. 20 (appeals)

## views/error.ejs

Generic error page. Receives `status` (HTTP code) and `message` from Express error handler. Renders contextual heading (404 / 403 / 500).
