/**
 * config/session.js — express-session configuration.
 *
 * In production: sessions are persisted in the MySQL sessions table via
 * express-mysql-session, so they survive Passenger process restarts and can
 * support multi-process setups later.
 *
 * In development (SQLite mode): sessions use the default MemoryStore, which
 * is intentionally simple (loses on restart, no leak in production).
 *
 * Cookies are httpOnly, Secure (production), and sameSite:lax to mitigate CSRF.
 *
 * @ref docs/config/session.md
 * @ref wallbreaker/docs/legal/cookies-and-tracking.md — strictly necessary cookies only
 */

'use strict';

const db = require('./database');

let sessionStore;

if (db.driver === 'mysql') {
  const MySQLStore = require('express-mysql-session')(require('express-session'));
  sessionStore     = new MySQLStore({}, db._pool);
} else {
  // MemoryStore for local SQLite dev. Not for production.
  sessionStore = undefined; // express-session uses MemoryStore by default
}

const sessionOptions = {
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

module.exports = { sessionStore, sessionOptions };
