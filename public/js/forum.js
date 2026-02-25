/**
 * public/js/forum.js
 * Alpine.js components for forum report modal and journal auto-save.
 *
 * @ref wallbreaker/docs/accessibility/WCAG/02-operable.md §2.2.2 (auto-save, no flash)
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Save Early Save Often
 * @ref wallbreaker/docs/accessibility/APXpatterns/challenge-patterns.md — Undo Redo (30-day soft delete)
 */

'use strict';

/* ─── Report modal ─────────────────────────────────────────────────────────── */
function reportModal() {
  return {
    open: false,
    contentId: null,
    contentType: null,
    category: '',
    description: '',
    submitted: false,
    submitting: false,
    error: null,

    init() {
      /* Delegate click on any [data-report-id] button in the document */
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-report-id]');
        if (!btn) return;
        this.contentId   = btn.dataset.reportId;
        this.contentType = btn.dataset.reportType || 'reply';
        this.category    = '';
        this.description = '';
        this.submitted   = false;
        this.error       = null;
        this.open        = true;
        /* Trap focus inside modal on next tick */
        this.$nextTick(() => {
          const first = document.querySelector('#report-modal-root [id="report-category"]');
          if (first) first.focus();
        });
      });
    },

    async submit() {
      if (!this.category || this.submitted || this.submitting) return;
      this.submitting = true;
      this.error = null;

      const csrf = document.querySelector('meta[name="csrf-token"]')?.content
                || window.__JOURNAL_CSRF__
                || '';
      try {
        const res = await fetch('/api/v1/forum/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({
            content_id:   this.contentId,
            content_type: this.contentType,
            category:     this.category,
            description:  this.description,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Error ${res.status}`);
        }
        this.submitted = true;
        /* Auto-close after 2 s */
        setTimeout(() => { this.open = false; }, 2000);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.submitting = false;
      }
    },
  };
}

/* ─── Journal auto-save ────────────────────────────────────────────────────── */
/**
 * @param {number} playthroughId
 */
function journal(playthroughId) {
  return {
    playthroughId,
    draft: '',
    saveStatus: '',
    _timer: null,
    _lastSaved: '',

    init() {
      /* Restore draft from localStorage on page load */
      const key = `nuzlox:journal:${playthroughId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        this.draft = saved;
        this.saveStatus = 'Draft restored';
      }

      /* Save draft to localStorage whenever the model changes */
      this.$watch('draft', (val) => {
        localStorage.setItem(key, val);
      });
    },

    scheduleSave() {
      /* Debounce: send to server 3 s after the user stops typing */
      clearTimeout(this._timer);
      this.saveStatus = 'Unsaved changes…';
      this._timer = setTimeout(() => this._saveToServer(), 3000);
    },

    saveNow() {
      clearTimeout(this._timer);
      this._saveToServer();
    },

    async _saveToServer() {
      const text = this.draft.trim();
      if (!text || text === this._lastSaved) { this.saveStatus = 'No changes'; return; }

      this.saveStatus = 'Saving…';
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content
                || window.__JOURNAL_CSRF__
                || '';
      try {
        const res = await fetch(`/api/v1/tracker/${this.playthroughId}/journal/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ content: text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Error ${res.status}`);
        }
        this._lastSaved = text;
        this.saveStatus = 'Saved ✓';
        /* Clear localStorage draft — it's now on the server */
        localStorage.removeItem(`nuzlox:journal:${this.playthroughId}`);
        /* Reload entries list after short delay so new entry appears */
        setTimeout(() => { window.location.reload(); }, 800);
      } catch (err) {
        this.saveStatus = `Save failed: ${err.message}`;
      }
    },

    async deleteEntry(entryId) {
      if (!confirm('Delete this entry? You can restore it within 30 days.')) return;
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content
                || window.__JOURNAL_CSRF__
                || '';
      try {
        const res = await fetch(`/api/v1/tracker/${this.playthroughId}/event/${entryId}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': csrf },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        /* Remove the article from DOM without full reload */
        const el = document.getElementById(`journal-${entryId}`);
        if (el) el.remove();
      } catch (err) {
        alert(`Could not delete entry: ${err.message}`);
      }
    },
  };
}
