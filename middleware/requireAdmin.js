/**
 * middleware/requireAdmin.js — Admin role gate.
 *
 * Must be used after requireAuth. Returns 403 for non-admin users.
 *
 * @ref docs/middleware/requireAdmin.md
 */

'use strict';

module.exports = function requireAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  res.status(403).render('error', { pageTitle: 'Access Denied', status: 403, message: 'Admin access required.' });
};
