# Alpha Pre-Launch Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship three alpha-blocking features: ruleset validator corrections, a logged-in bug report form (DB + GitHub Issues), and a dismissible sitewide support banner.

**Architecture:** Ruleset changes are pure JSON + service edits. Bug reports use a new `nuzlox_bug_reports` table, a thin Model, and a new `routes/bugs.js`; GitHub issue creation uses Node v22 native `fetch`. The banner lives in a new EJS partial included in `views/layouts/main.ejs`, dismissed via `localStorage`.

**Tech Stack:** Node.js v22, Express, EJS, MySQL2 (prod) / better-sqlite3 (test), Zod, Alpine.js, native `fetch` for GitHub API.

---

## Task 1: Fix ruleset-validator.json

**Files:**
- Modify: `public/cache/ruleset-validator.json`

### Step 1: Open the file and make these exact changes

1. In `forbidden_moves` array — **remove** `"substitute"`
2. In `restricted_types.psychic.forbidden_moves` — **remove** `"power-gem"`
3. In `forbidden_moves` array — **add** `"power-split"` and `"guard-swap"` (anywhere in the array)
4. In `forbidden_items` array — **remove** `"bread"`, `"peanut-butter"`, `"marmalade"`
5. **Add** a new top-level key after `"forbidden_items"`:
   ```json
   "forbidden_species": ["cubone"],
   ```

### Step 2: Verify JSON is valid

```bash
node -e "require('./public/cache/ruleset-validator.json'); console.log('valid')"
```
Expected: `valid`

### Step 3: Commit

```bash
git add public/cache/ruleset-validator.json
git commit -m "fix(ruleset): correct validator JSON per updated halacha sheets

- Remove substitute (explicitly exempted in Laws of Battle)
- Remove power-gem from psychic restricted moves (rock-type, misclassified)
- Add power-split and guard-swap to forbidden_moves (stat-swap prohibition)
- Remove bread/peanut-butter/marmalade from forbidden_items (not meat/cheese)
- Add forbidden_species array with cubone (mother's skull rule)"
```

---

## Task 2: Add forbidden_species check to rulesetValidator.js

**Files:**
- Modify: `services/rulesetValidator.js`

### Step 1: Write the failing test first

Open `tests/unit/validation.test.js`. Add a new `describe` block at the end of the file:

```js
describe('forbidden species', () => {
  const schemaWithSpecies = {
    ...SCHEMA,
    forbidden_species: ['cubone'],
  };

  test('flags cubone by name', () => {
    const { violations } = validateMon(
      { name: 'cubone', types: ['ground'], moves: [] },
      schemaWithSpecies
    );
    expect(violations.some(v => /cubone/i.test(v))).toBe(true);
  });

  test('passes a legal species', () => {
    const { violations } = validateMon(
      { name: 'gogoat', types: ['grass'], moves: [] },
      schemaWithSpecies
    );
    expect(violations).toHaveLength(0);
  });

  test('is case-insensitive', () => {
    const { violations } = validateMon(
      { name: 'Cubone', types: ['ground'], moves: [] },
      schemaWithSpecies
    );
    expect(violations.some(v => /cubone/i.test(v))).toBe(true);
  });
});
```

Also add a test that `substitute` is no longer flagged:

```js
describe('substitute exemption', () => {
  test('substitute is not a forbidden move', () => {
    const { violations } = validateMon(
      { name: 'eevee', types: ['normal'], moves: [{ name: 'substitute', type: 'normal' }] },
      SCHEMA
    );
    expect(violations.filter(v => /substitute/i.test(v))).toHaveLength(0);
  });
});
```

### Step 2: Run tests to verify they fail

```bash
cd /home/golem-master/wallbreaker/nuzlox_site && npm test -- --testPathPattern=validation
```
Expected: `forbidden species` tests FAIL (forbidden_species not yet checked), substitute test PASS (it was removed from JSON in Task 1).

### Step 3: Add the forbidden_species check to validateMon

In `services/rulesetValidator.js`, destructure `forbidden_species` from schema (add it alongside the others at line ~23):

```js
const {
  forbidden_types              = [],
  restricted_types             = {},
  forbidden_species_categories = [],
  forbidden_species            = [],   // ← add this line
  forbidden_moves              = [],
  forbidden_move_categories    = [],
  forbidden_items              = [],
  forbidden_secondary_effects  = [],
} = schema;
```

Then add this check immediately after the `// ── Species category ───` block (around line 46), before the moves loop:

```js
// ── Forbidden species ─────────────────────────────────────────────────────
const monName = (mon.name || '').toLowerCase();
if (forbidden_species.map(s => s.toLowerCase()).includes(monName)) {
  violations.push(`${mon.name} is a forbidden species`);
}
```

### Step 4: Run tests to verify they pass

```bash
npm test -- --testPathPattern=validation
```
Expected: all tests PASS

### Step 5: Commit

```bash
git add services/rulesetValidator.js tests/unit/validation.test.js
git commit -m "feat(validator): add forbidden_species check; test substitute exemption"
```

---

## Task 3: DB migration — nuzlox_bug_reports

**Files:**
- Modify: `migrations/mysql/001_initial_schema.sql`
- Modify: `migrations/sqlite/001_initial_schema.sql`

### Step 1: Add to MySQL migration

Append this block at the end of `migrations/mysql/001_initial_schema.sql` (before any closing `SET FOREIGN_KEY_CHECKS = 1;` if present, otherwise just at the end):

```sql
-- ─── nuzlox_bug_reports ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nuzlox_bug_reports (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  user_id           BIGINT        NOT NULL,
  title             VARCHAR(255)  NOT NULL,
  description       TEXT          NOT NULL,
  url_reported_on   VARCHAR(512),
  github_issue_url  VARCHAR(512)  DEFAULT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bug_reports_user (user_id),
  CONSTRAINT fk_bug_reports_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Step 2: Add to SQLite migration

Append this block at the end of `migrations/sqlite/001_initial_schema.sql`:

```sql
-- nuzlox_bug_reports
CREATE TABLE IF NOT EXISTS nuzlox_bug_reports (
  id                INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER  NOT NULL,
  title             TEXT     NOT NULL,
  description       TEXT     NOT NULL,
  url_reported_on   TEXT,
  github_issue_url  TEXT     DEFAULT NULL,
  created_at        TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON nuzlox_bug_reports(user_id);
```

### Step 3: Commit

```bash
git add migrations/
git commit -m "feat(db): add nuzlox_bug_reports table migration"
```

---

## Task 4: BugReport model

**Files:**
- Create: `models/BugReport.js`

### Step 1: Create the model

```js
/**
 * models/BugReport.js — Bug report data access.
 *
 * @ref docs/legal/data-privacy.md (user_id links to PII — handle per GDPR)
 */
'use strict';

const db = require('../config/database');

async function create({ userId, title, description, urlReportedOn }) {
  const result = await db.run(
    `INSERT INTO nuzlox_bug_reports (user_id, title, description, url_reported_on)
     VALUES (?, ?, ?, ?)`,
    [userId, title, description, urlReportedOn || null]
  );
  return result.lastID ?? result.insertId;
}

async function setGithubUrl(id, githubIssueUrl) {
  await db.run(
    'UPDATE nuzlox_bug_reports SET github_issue_url = ? WHERE id = ?',
    [githubIssueUrl, id]
  );
}

async function getAll({ limit = 50, offset = 0 } = {}) {
  return db.all(
    `SELECT br.*, u.username
       FROM nuzlox_bug_reports br
       JOIN users u ON u.id = br.user_id
      ORDER BY br.created_at DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

module.exports = { create, setGithubUrl, getAll };
```

### Step 2: Commit

```bash
git add models/BugReport.js
git commit -m "feat(model): add BugReport model"
```

---

## Task 5: GitHub service

**Files:**
- Create: `services/github.js`

### Step 1: Add GitHub env vars to .env.example

Open `.env.example` (or `.env` — check which exists) and add:

```
GITHUB_TOKEN=
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=
```

Also add real values to your local `.env` file:
- `GITHUB_TOKEN` — a Personal Access Token with `repo` scope (create at github.com/settings/tokens)
- `GITHUB_REPO_OWNER` — your GitHub username (DanielRabinovitz)
- `GITHUB_REPO_NAME` — the nuzlox_site repository name

### Step 2: Create the service

```js
/**
 * services/github.js — GitHub Issues API integration.
 *
 * Uses Node v22 native fetch. Requires GITHUB_TOKEN, GITHUB_REPO_OWNER,
 * GITHUB_REPO_NAME env vars.
 */
'use strict';

async function createIssue({ title, body }) {
  const { GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
    console.warn('[github] Missing env vars — skipping issue creation');
    return null;
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body, labels: ['bug', 'user-report'] }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[github] Issue creation failed (${res.status}): ${text}`);
    return null;
  }

  const json = await res.json();
  return json.html_url;
}

module.exports = { createIssue };
```

### Step 3: Commit

```bash
git add services/github.js
git commit -m "feat(service): add GitHub Issues API integration"
```

---

## Task 6: Bug report route

**Files:**
- Create: `routes/bugs.js`

### Step 1: Write the failing integration test first

Create `tests/integration/bugs.test.js`:

```js
/**
 * tests/integration/bugs.test.js
 */
'use strict';

const request = require('supertest');
const app     = require('../../server');

describe('GET /bugs/report', () => {
  test('redirects guests to login', async () => {
    const res = await request(app).get('/bugs/report');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

describe('POST /bugs/report', () => {
  test('returns 302 redirect for guests', async () => {
    const res = await request(app)
      .post('/bugs/report')
      .send('title=Test&description=Test+bug');
    expect(res.status).toBe(302);
  });
});
```

### Step 2: Run to verify tests pass (auth redirect is already built)

```bash
npm test -- --testPathPattern=bugs
```
Expected: PASS (requireAuth will redirect guests before any route logic runs)

### Step 3: Create the route

```js
/**
 * routes/bugs.js — Bug report submission.
 *
 * Requires authentication. Stores to DB and creates a GitHub issue.
 *
 * @ref docs/legal/data-privacy.md (user_id stored, not email)
 */
'use strict';

const express    = require('express');
const router     = express.Router();
const { z }      = require('zod');
const requireAuth = require('../middleware/requireAuth');
const BugReport  = require('../models/BugReport');
const github     = require('../services/github');

const BugSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(5000),
  url_reported_on: z.string().max(512).optional(),
});

router.get('/report', requireAuth, (req, res) => {
  res.render('bugs/report', {
    pageTitle: 'Report a Bug — Nuzlox',
    prefillUrl: req.headers.referer || '',
  });
});

router.post('/report', requireAuth, async (req, res, next) => {
  try {
    const parsed = BugSchema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', 'Please fill in all required fields correctly.');
      return res.redirect('/bugs/report');
    }

    const { title, description, url_reported_on } = parsed.data;
    const userId   = req.session.user.id;
    const username = req.session.user.username || req.session.user.email;

    const reportId = await BugReport.create({ userId, title, description, urlReportedOn: url_reported_on });

    const issueBody = `**Reported by:** ${username}\n**URL:** ${url_reported_on || '(not provided)'}\n\n${description}`;
    const issueUrl  = await github.createIssue({ title, body: issueBody });

    if (issueUrl) {
      await BugReport.setGithubUrl(reportId, issueUrl);
    }

    req.flash('success', 'Bug report submitted — thank you!');
    res.redirect('/');
  } catch (err) { next(err); }
});

module.exports = router;
```

### Step 4: Mount the route in routes/index.js

In `routes/index.js`, add:

```js
const bugsRoutes = require('./bugs');   // ← add near top with other requires
```

And in `mountRoutes`:

```js
app.use('/bugs', bugsRoutes);           // ← add after the existing app.use() lines
```

### Step 5: Run full test suite

```bash
npm test
```
Expected: all 35+ tests PASS (plus the new bugs tests)

### Step 6: Commit

```bash
git add routes/bugs.js routes/index.js tests/integration/bugs.test.js
git commit -m "feat(route): add /bugs/report — DB + GitHub Issues integration"
```

---

## Task 7: Bug report view

**Files:**
- Create: `views/bugs/` (directory)
- Create: `views/bugs/report.ejs`

### Step 1: Create the directory and view

```bash
mkdir -p /home/golem-master/wallbreaker/nuzlox_site/views/bugs
```

Create `views/bugs/report.ejs`:

```ejs
<%# views/bugs/report.ejs — Bug report form (auth required) %>

<div class="page-container page-container--narrow">
  <div class="page-header">
    <h1 class="page-header__title">Report a Bug</h1>
    <p class="page-header__sub">Found something broken? Let us know and we'll fix it.</p>
  </div>

  <form method="POST" action="/bugs/report" novalidate>
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">

    <div class="form-group">
      <label for="title" class="form-label">Short summary <span aria-hidden="true">*</span></label>
      <input type="text" id="title" name="title" class="form-input"
             required minlength="5" maxlength="255"
             placeholder="e.g. Teambuilder crashes when selecting Gogoat"
             aria-required="true">
    </div>

    <div class="form-group">
      <label for="description" class="form-label">Description <span aria-hidden="true">*</span></label>
      <textarea id="description" name="description" class="form-textarea" rows="6"
                required minlength="10" maxlength="5000"
                aria-required="true"
                aria-describedby="description-hint"
                placeholder="What happened? What did you expect to happen? Steps to reproduce?"></textarea>
      <p class="form-hint" id="description-hint">Please include steps to reproduce if possible.</p>
    </div>

    <div class="form-group">
      <label for="url_reported_on" class="form-label">Page where you found this bug</label>
      <input type="url" id="url_reported_on" name="url_reported_on" class="form-input"
             maxlength="512"
             value="<%= prefillUrl %>"
             placeholder="https://nuzlox.com/teambuilder">
    </div>

    <button type="submit" class="btn btn--primary">Submit bug report</button>
  </form>
</div>
```

### Step 2: Manually verify the page renders

```bash
# Start the dev server
npm run dev
# Visit http://localhost:3000/bugs/report while logged in
# Confirm the form renders with all three fields
```

### Step 3: Commit

```bash
git add views/bugs/report.ejs
git commit -m "feat(view): add bug report form"
```

---

## Task 8: Support banner partial

**Files:**
- Create: `views/partials/support-banner.ejs`
- Modify: `views/layouts/main.ejs`
- Modify: `public/css/main.css`

### Step 1: Create the banner partial

Create `views/partials/support-banner.ejs`:

```ejs
<%# views/partials/support-banner.ejs
    Dismissible sitewide support banner.
    Dismiss state stored in localStorage ('supportBannerDismissed').
    WCAG: each link has aria-label; banner has role="banner" complemented
    by the existing <header>; dismiss button has aria-label.
%>
<div
  id="support-banner"
  class="support-banner"
  x-data="{
    show: !localStorage.getItem('supportBannerDismissed')
  }"
  x-show="show"
  x-transition:leave="support-banner--fade"
  role="complementary"
  aria-label="Support the project"
>
  <div class="support-banner__inner">
    <span class="support-banner__message">Support Nuzlox &amp; Wallbreaker:</span>

    <nav class="support-banner__links" aria-label="Support links">
      <a href="https://www.tiktok.com/@swanksinatra.1"
         class="support-banner__link"
         target="_blank" rel="noopener noreferrer"
         aria-label="TikTok (opens in new tab)">TikTok</a>

      <a href="https://www.youtube.com/@swanksinatra.1"
         class="support-banner__link"
         target="_blank" rel="noopener noreferrer"
         aria-label="YouTube (opens in new tab)">YouTube</a>

      <a href="https://patreon.com/SwankSinatra662"
         class="support-banner__link"
         target="_blank" rel="noopener noreferrer"
         aria-label="Patreon (opens in new tab)">Patreon</a>

      <a href="https://discord.gg/zfnyh45VaN"
         class="support-banner__link"
         target="_blank" rel="noopener noreferrer"
         aria-label="Discord (opens in new tab)">Discord</a>

      <a href="https://wallbreaker.net"
         class="support-banner__link"
         target="_blank" rel="noopener noreferrer"
         aria-label="Wallbreaker.net (opens in new tab)">Wallbreaker.net</a>
    </nav>

    <button
      class="support-banner__dismiss"
      @click="localStorage.setItem('supportBannerDismissed', '1'); show = false"
      aria-label="Dismiss support banner"
    >&times;</button>
  </div>
</div>
```

### Step 2: Include banner in main.ejs

In `views/layouts/main.ejs`, add the banner include between the nav and flash includes:

```ejs
  <%- include('../partials/nav') %>

  <%- include('../partials/support-banner') %>   <%# ← add this line %>

  <%# WCAG §4.1.3 — live region for flash messages %>
  <%- include('../partials/flash') %>
```

### Step 3: Add CSS to main.css

Append to `public/css/main.css`:

```css
/* ── Support banner ───────────────────────────────────────────────────────── */
.support-banner {
  background: var(--color-accent, #1a73e8);
  color: #fff;
  font-size: 0.875rem;
}

.support-banner__inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem 1rem;
}

.support-banner__message {
  font-weight: 600;
  white-space: nowrap;
}

.support-banner__links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

.support-banner__link {
  color: #fff;
  text-decoration: underline;
  white-space: nowrap;
}

.support-banner__link:hover,
.support-banner__link:focus {
  opacity: 0.85;
}

.support-banner__dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.support-banner__dismiss:hover,
.support-banner__dismiss:focus {
  background: rgba(255, 255, 255, 0.2);
  outline: 2px solid #fff;
}

.support-banner--fade {
  transition: opacity 0.2s ease;
  opacity: 0;
}
```

### Step 4: Manually test the banner

```bash
npm run dev
# Visit any page — banner should appear at top
# Click × — banner should fade and disappear
# Refresh — banner should stay gone (localStorage)
# Open DevTools → Application → localStorage → delete 'supportBannerDismissed'
# Refresh — banner should reappear
```

### Step 5: Run full test suite

```bash
npm test
```
Expected: all tests PASS

### Step 6: Commit

```bash
git add views/partials/support-banner.ejs views/layouts/main.ejs public/css/main.css
git commit -m "feat(ui): add dismissible sitewide support banner

Links: TikTok, YouTube, Patreon, Discord, Wallbreaker.net
Dismiss state persisted in localStorage."
```

---

## Final check

```bash
npm test
```
Expected: all tests green.

```bash
git log --oneline -8
```
You should see all feature commits listed cleanly.
