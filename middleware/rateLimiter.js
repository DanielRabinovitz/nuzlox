/**
 * middleware/rateLimiter.js — express-rate-limit presets.
 *
 * Three presets for different sensitivity levels:
 *   authLimiter    — login/register (15 req / 15 min per IP)
 *   reportLimiter  — content reports from guests (10 req / 10 min per IP)
 *   apiLimiter     — general API calls (100 req / min per IP)
 *
 * @ref docs/middleware/rateLimiter.md
 */

'use strict';

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      15,
  message:  { error: 'Too many attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max:      10,
  message:  { error: 'Too many reports submitted. Please wait before submitting another.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { authLimiter, reportLimiter, apiLimiter };
