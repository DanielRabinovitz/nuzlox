/**
 * services/export.js — User data export for DSR access/portability requests.
 *
 * Generates a machine-readable JSON export of all data held for a given user:
 * account info, consent records, saved teams, playthroughs, and events.
 *
 * @ref docs/services/export.md
 * @ref wallbreaker/docs/legal/data-privacy.md § DSR Portal — Access, Portability
 */

'use strict';

const db      = require('../config/database');
const Consent = require('../models/Consent');
const Tracker = require('../models/Tracker');
const Team    = require('../models/Team');

/**
 * Builds a full data export object for the given userId.
 *
 * @param {number} userId
 * @returns {Promise<object>} machine-readable JSON export
 */
async function buildExport(userId) {
  const [user, consentRecords, teams, playthroughs] = await Promise.all([
    db.get('SELECT id, email, username, date_of_birth, created_at FROM users WHERE id = ?', [userId]),
    Consent.getByUser(userId),
    Team.findByUser(userId),
    Tracker.getByUser(userId),
  ]);

  // Fetch all events for all playthroughs.
  const events = [];
  for (const p of playthroughs) {
    const evts = await Tracker.getEvents(p.id, userId);
    events.push(...evts);
  }

  return {
    export_generated_at: new Date().toISOString(),
    account:             user,
    consent_records:     consentRecords,
    saved_teams:         teams,
    playthroughs:        playthroughs,
    playthrough_events:  events,
  };
}

module.exports = { buildExport };
