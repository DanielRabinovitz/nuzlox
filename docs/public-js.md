# public/js/

Client-side JavaScript. Alpine.js (loaded from CDN in `views/layouts/main.ejs`) is the only runtime dependency. No build step required.

## teambuilder-engine.js

Exports the `teambuilder(playthroughId)` Alpine.js component.

### State

| Property | Type | Description |
|----------|------|-------------|
| `schema` | object\|null | Loaded from `/cache/ruleset-validator.json` on `init()` |
| `roster` | array | Bundled Pokémon list for the picker |
| `slots` | array[6] | Current team (null = empty slot) |
| `activeSlot` | number\|null | Index of the slot being edited |
| `pickerOpen` | boolean | Controls picker modal visibility |
| `validation` | object | `{valid, violations[], warnings[]}` |
| `savedTeamId` | number\|null | ID returned after successful `POST /api/v1/teams` |

### Methods

| Method | Description |
|--------|-------------|
| `init()` | Fetches `/cache/ruleset-validator.json`; stored in `this.schema` |
| `selectSlot(i)` | Opens picker modal for slot `i` |
| `clearSlot(i)` | Empties slot, re-validates |
| `pickMon(mon)` | Fills `activeSlot` with selected mon (no-op if forbidden), closes modal, re-validates |
| `filteredRoster` | Getter: filters roster by `pickerQuery` |
| `isForbidden(mon)` | Returns true if mon has a forbidden type or is in a forbidden species category |
| `_validate()` | Runs all validation checks against `this.schema`, updates `this.validation` |
| `saveTeam()` | `POST /api/v1/teams` with CSRF token from `<meta name="csrf-token">` |

@ref docs/services.md — validation.js (server-side mirror of this logic)
@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Safe Practice Zone

## forum.js

Exports two Alpine.js components.

### `reportModal()`

Delegates click events on any `[data-report-id]` button in the document (set in `views/forum/topic.ejs`).

| Method | Description |
|--------|-------------|
| `init()` | Attaches delegated click listener; populates `contentId`, `contentType` |
| `submit()` | `POST /api/v1/forum/report` with Zod-validated payload; shows `submitted` state; auto-closes after 2 s |

ARIA: modal has `role="dialog" aria-modal="true"`; focus moved to first input on open; closed on Escape.

@ref wallbreaker/docs/legal/online-safety-and-content-moderation.md

### `journal(playthroughId)`

Auto-saves journal draft to localStorage and to the server.

| Method | Description |
|--------|-------------|
| `init()` | Restores draft from `localStorage`; sets up `$watch` to persist every change |
| `scheduleSave()` | Debounces server save by 3 s after each keystroke |
| `saveNow()` | Cancels debounce and immediately calls `_saveToServer()` |
| `_saveToServer()` | `POST /api/v1/tracker/:id/journal/save`; clears localStorage on success; reloads page to show new entry |
| `deleteEntry(id)` | `DELETE /api/v1/tracker/:id/event/:eventId`; removes `<article>` from DOM on success |

Save status announced via `aria-live="polite"` region in `views/tracker/journal.ejs`.

@ref wallbreaker/docs/accessibility/WCAG/02-operable.md §2.2.2 (auto-save, no flash)
@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Save Early Save Often
@ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Undo Redo
