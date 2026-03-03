# Alpha Pre-Launch Features Design
**Date:** 2026-03-03
**Status:** Approved

## 1. Ruleset Validator Updates

Changes to `public/cache/ruleset-validator.json` and `services/rulesetValidator.js` to align with current halacha sheets.

### JSON changes

| Change | Field | Reason |
|---|---|---|
| Remove `substitute` | `forbidden_moves` | Laws of Battle explicitly exempts it |
| Remove `power-gem` | `restricted_types.psychic.forbidden_moves` | Rock-type move, misclassified |
| Add `power-split`, `guard-swap` | `forbidden_moves` | Laws of Animal Welfare — stat-swap prohibition |
| Remove `bread`, `peanut-butter`, `marmalade` | `forbidden_items` | Laws of Battle bans meat/cheese only; these are neither |
| Add `cubone` | new `forbidden_species` array | Laws of Kosher & Banned Pokémon — mother's skull rule |

### Validator service changes

`services/rulesetValidator.js` needs a species-name lookup added alongside existing type/move checks, reading from the new `forbidden_species` array in the JSON.

---

## 2. Bug Report Form

### Database

New table `nuzlox_bug_reports`:
- `id` INT PK AUTO_INCREMENT
- `user_id` INT FK → `users.id`
- `title` VARCHAR(255)
- `description` TEXT
- `url_reported_on` VARCHAR(512)
- `github_issue_url` VARCHAR(512) NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### Routes

- `GET /bugs/report` — renders form (login required via existing `requireAuth` middleware)
- `POST /bugs/report` — validates input, inserts row, calls GitHub Issues API, updates `github_issue_url`

### GitHub Integration

- Env vars: `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`
- Single `POST /repos/:owner/:repo/issues` call via `node-fetch`
- Issue body includes: reporter username, description, URL reported on
- Returned issue URL stored back to the DB row

### Form Fields

- `title` (text, required, max 255)
- `description` (textarea, required)
- `url_reported_on` (text, pre-filled from `Referer` header if available)

No file uploads for alpha.

---

## 3. Support Banner

### Markup

`<div id="support-banner">` inserted in `views/layouts/main.ejs` between nav and flash partials.

Contains:
- Short "Support the project" message
- Icon links to: TikTok, YouTube, Patreon, Discord, Wallbreaker.net
- Dismiss `×` button

### Links

| Platform | URL |
|---|---|
| TikTok | https://www.tiktok.com/@swanksinatra.1 |
| YouTube | https://www.youtube.com/@swanksinatra.1 |
| Patreon | https://patreon.com/SwankSinatra662 |
| Discord | https://discord.gg/zfnyh45VaN |
| Wallbreaker.net | https://wallbreaker.net |

All links: `target="_blank" rel="noopener noreferrer"` + `aria-label` per WCAG.

### Behaviour

Alpine.js `x-data` reads `localStorage.getItem('supportBannerDismissed')` on init. Dismissed state is set on click, banner hides via CSS transition. No server round-trip.
