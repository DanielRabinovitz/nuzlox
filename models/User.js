/**
 * models/User.js — User account data access and age gate logic.
 *
 * Handles: create, find, update for users; age gate validation on registration;
 * UK Children's Code Standard 7 privacy defaults for minor accounts;
 * password hashing and verification.
 *
 * @ref docs/models/User.md
 * @ref wallbreaker/docs/legal/child-safety.md § COPPA — Age Gate / Neutral Age Screen
 * @ref wallbreaker/docs/legal/child-safety.md § UK ICO Children's Code Standard 3, 7
 * @ref wallbreaker/docs/legal/data-privacy.md § Data Minimisation
 */

'use strict';

const bcrypt = require('bcryptjs');
const db     = require('../config/database');

/**
 * Validates date of birth and determines minor status.
 * Age is calculated server-side — cannot be bypassed client-side.
 *
 * @ref wallbreaker/docs/legal/child-safety.md § COPPA — Age Gate
 *
 * @param {string} dob — 'YYYY-MM-DD'
 * @returns {{ valid: boolean, isMinor: boolean, error?: string }}
 */
function validateAge(dob) {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) {
    return { valid: false, isMinor: false, error: 'Invalid date of birth.' };
  }
  const today  = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 13) {
    return { valid: false, isMinor: false, error: 'You must be at least 13 to register.' };
  }
  return { valid: true, isMinor: age < 18 };
}

/**
 * Creates a new user account.
 * Rejects under-13 DOBs, applies minor defaults per UK Children's Code Standard 7.
 * Stores consent records for ToS and marketing separately.
 *
 * @ref wallbreaker/docs/legal/child-safety.md § UK Children's Code Standard 7
 * @ref wallbreaker/docs/legal/data-privacy.md § Consent Management
 *
 * @param {{ email, password, dob, marketingOptIn, ipHash, consentVersion, consentText }} data
 * @returns {Promise<{ id: number, isMinor: boolean }>}
 * @throws {Error} with .status = 400 for validation failures
 */
async function create({ email, password, dob, marketingOptIn = false, ipHash = null, consentVersion = '1.0', consentText = '' }) {
  const ageResult = validateAge(dob);
  if (!ageResult.valid) {
    const err = new Error(ageResult.error);
    err.status = 400;
    throw err;
  }

  const existing = await findByEmail(email);
  if (existing) {
    const err = new Error('An account with that email already exists.');
    err.status = 400;
    throw err;
  }

  const hash = await bcrypt.hash(password, 12);

  // UK Children's Code Standard 7: privacy by default for minors.
  const profileVisibility = ageResult.isMinor ? 'private' : 'public';
  const dmEnabled         = ageResult.isMinor ? 0 : 1;

  const { lastId } = await db.run(
    `INSERT INTO users
       (email, password_hash, date_of_birth, is_minor,
        profile_visibility, dm_enabled, marketing_opt_in, age_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [email, hash, dob, ageResult.isMinor ? 1 : 0,
     profileVisibility, dmEnabled, marketingOptIn ? 1 : 0]
  );

  // Consent records — stored separately to satisfy audit requirements.
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO nuzlox_consent_records
       (user_id, consent_type, granted, ip_hash, consent_version, consent_text, source)
     VALUES (?, 'tos', 1, ?, ?, ?, 'registration_form')`,
    [lastId, ipHash, consentVersion, consentText]
  );
  await db.run(
    `INSERT INTO nuzlox_consent_records
       (user_id, consent_type, granted, ip_hash, consent_version, consent_text, source)
     VALUES (?, 'marketing_email', ?, ?, ?, ?, 'registration_form')`,
    [lastId, marketingOptIn ? 1 : 0, ipHash, consentVersion,
     'I\'d like to receive updates from Wallbreaker (optional).']
  );

  return { id: lastId, isMinor: ageResult.isMinor };
}

async function findById(id) {
  return db.get('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
}

async function findByEmail(email) {
  return db.get(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
}

/**
 * Verifies a plain-text password against the stored bcrypt hash.
 *
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function update(id, fields) {
  const allowed = ['username', 'email', 'word_filters', 'content_filters',
                   'youtube_channel_url', 'marketing_opt_in',
                   'profile_visibility', 'dm_enabled'];
  const keys    = Object.keys(fields).filter(k => allowed.includes(k));
  if (keys.length === 0) return;
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values     = keys.map(k => {
    const v = fields[k];
    return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
  });
  values.push(id);
  await db.run(`UPDATE users SET ${setClauses} WHERE id = ?`, values);
}

/**
 * Soft-deletes a user account. A node-cron job anonymizes the row after 30 days.
 *
 * @ref wallbreaker/docs/legal/data-privacy.md § Data Retention
 */
async function softDelete(id) {
  await db.run(
    'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
}

module.exports = { validateAge, create, findById, findByEmail, verifyPassword, update, softDelete };
