/**
 * server.js — Express application entry point.
 *
 * Sets up middleware, mounts route groups, and starts the HTTP server.
 * Designed for Hostinger Phusion Passenger: always binds to process.env.PORT.
 *
 * @ref docs/server.md
 * @ref wallbreaker/docs/legal/data-privacy.md § Lawful Basis for Processing
 * @ref wallbreaker/docs/accessibility/WCAG/02-operable.md §2.4.1 (skip-link present in main layout)
 */

'use strict';

require('dotenv').config();

const express        = require('express');
const path           = require('path');
const morgan         = require('morgan');
const ejsLayouts     = require('express-ejs-layouts');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');

const { sessionStore, sessionOptions } = require('./config/session');
const gpcSignal      = require('./middleware/gpcSignal');
const csrfProtection = require('./middleware/csrfProtection');
const mountRoutes    = require('./routes/index');
const cron           = require('./services/cron');

const app = express();

// ── View engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.use(ejsLayouts);

// ── Static files ─────────────────────────────────────────────────────────────
// Hostinger Nginx proxies to Express; Express serves public/ directly.
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}));

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({ ...sessionOptions, store: sessionStore }));

// ── Flash messages ────────────────────────────────────────────────────────────
app.use(flash());

// ── Global Privacy Control ────────────────────────────────────────────────────
// @ref wallbreaker/docs/legal/data-privacy.md § CCPA/CPRA — GPC Signal
app.use(gpcSignal);

// ── CSRF protection ───────────────────────────────────────────────────────────
app.use(csrfProtection);

// ── Template locals ───────────────────────────────────────────────────────────
// Inject common variables available in all EJS templates.
app.use((req, res, next) => {
  res.locals.currentUser  = req.session.user || null;
  res.locals.isAdmin      = req.session.user?.role === 'admin';
  res.locals.flash        = req.flash();
  res.locals.csrfToken    = req.csrfToken();
  res.locals.siteUrl      = process.env.SITE_URL || 'http://localhost:3000';
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
mountRoutes(app);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', { pageTitle: 'Page Not Found', status: 404, message: 'Page not found.' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).render('error', { pageTitle: 'Error', status, message: err.message || 'An unexpected error occurred.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Nuzlox running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  cron.start();
});

module.exports = app; // exported for testing
