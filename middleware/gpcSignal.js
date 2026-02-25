/**
 * middleware/gpcSignal.js — Global Privacy Control (GPC) signal handler.
 *
 * If the browser sends Sec-GPC: 1, treats the request as a CCPA opt-out of
 * data sale/sharing. Sets res.locals.gpc = true for template use and, for
 * authenticated users, persists gpc_opt_out = 1 in the users table.
 *
 * No ad data is shared regardless (no ad platform used), but this is logged
 * for regulatory documentation (CCPA/CPRA) and future-proofing.
 *
 * @ref docs/middleware/gpcSignal.md
 * @ref wallbreaker/docs/legal/data-privacy.md § CCPA/CPRA — GPC Signal
 */

'use strict';

const db = require('../config/database');

module.exports = async function gpcSignal(req, res, next) {
  const isGpc = req.headers['sec-gpc'] === '1';
  res.locals.gpc = isGpc;

  if (isGpc && req.session?.user?.id && !req.session.user.gpc_opt_out) {
    try {
      await db.run(
        'UPDATE users SET gpc_opt_out = 1 WHERE id = ?',
        [req.session.user.id]
      );
      req.session.user.gpc_opt_out = 1;
    } catch (err) {
      // Non-fatal: GPC flag update failure should not break the request.
      console.error('[gpc] Failed to persist GPC opt-out:', err.message);
    }
  }

  next();
};
