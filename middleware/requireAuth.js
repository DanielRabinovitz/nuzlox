/**
 * middleware/requireAuth.js — Session authentication gate.
 *
 * Redirects unauthenticated requests for page routes to /login.
 * Returns HTTP 401 JSON for unauthenticated API requests.
 *
 * @ref docs/middleware/requireAuth.md
 */

'use strict';

module.exports = function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  req.flash('error', 'Please log in to access that page.');
  res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
};
