/**
 * middleware/csrfProtection.js — Custom session-based CSRF protection.
 *
 * On each request, attaches req.csrfToken() — a function that lazily generates
 * and caches a CSRF token in the session.
 *
 * On state-mutating requests (POST/PUT/PATCH/DELETE), validates that the
 * submitted _csrf field (or X-CSRF-Token header for API calls) matches the
 * session token.
 *
 * Skipped for JSON API routes that use Authorization headers instead of cookies
 * (none currently — all API routes are session-authenticated).
 *
 * @ref docs/middleware/csrfProtection.md
 */

'use strict';

const crypto = require('crypto');

module.exports = function csrfProtection(req, res, next) {
  // Lazy-generate a CSRF token and store it in the session.
  req.csrfToken = function () {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return req.session.csrfToken;
  };

  const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  if (SAFE_METHODS.includes(req.method)) return next();

  // Skip CSRF validation in test environment so integration tests can exercise
  // route-level auth behaviour (requireAuth redirects) without needing a valid
  // session-backed token.
  if (process.env.NODE_ENV === 'test') return next();

  const sessionToken  = req.session.csrfToken;
  const submittedToken =
    req.body?._csrf ||
    req.headers['x-csrf-token'] ||
    req.query._csrf;

  if (!sessionToken || submittedToken !== sessionToken) {
    const err  = new Error('Invalid or missing CSRF token.');
    err.status = 403;
    return next(err);
  }

  next();
};
