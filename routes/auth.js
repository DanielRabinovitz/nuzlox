/**
 * routes/auth.js — Registration, login, logout, and email verification.
 *
 * Age gate is enforced server-side in models/User.create().
 * Marketing consent checkbox is separate from the ToS checkbox.
 *
 * @ref docs/routes/auth.md
 * @ref wallbreaker/docs/legal/child-safety.md § COPPA — Age Gate
 * @ref wallbreaker/docs/legal/data-privacy.md § Consent Management
 */

'use strict';

const express      = require('express');
const crypto       = require('crypto');
const { z }        = require('zod');
const router       = express.Router();
const User         = require('../models/User');
const emailSvc     = require('../services/email');
const db           = require('../config/database');
const { authLimiter } = require('../middleware/rateLimiter');

// ── Register ──────────────────────────────────────────────────────────────────

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/register', { pageTitle: 'Create Account' });
});

router.post('/register', authLimiter, async (req, res) => {
  const schema = z.object({
    email:           z.string().email(),
    password:        z.string().min(8).max(128),
    dob_year:        z.string().regex(/^\d{4}$/),
    dob_month:       z.string().regex(/^\d{1,2}$/),
    dob_day:         z.string().regex(/^\d{1,2}$/),
    tos:             z.literal('1'),
    marketing_opt_in: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    req.flash('error', 'Please fill in all required fields correctly.');
    return res.redirect('/register');
  }

  const { email, password, dob_year, dob_month, dob_day, marketing_opt_in } = parsed.data;
  const dob = `${dob_year}-${String(dob_month).padStart(2,'0')}-${String(dob_day).padStart(2,'0')}`;

  // Hash IP for consent record — never store raw IP.
  const ipHash = crypto.createHash('sha256')
    .update(req.ip || '').digest('hex');

  try {
    const { id, isMinor } = await User.create({
      email:           email.toLowerCase().trim(),
      password,
      dob,
      marketingOptIn:  marketing_opt_in === '1',
      ipHash,
      consentVersion:  '1.0',
      consentText:     'I agree to the Terms of Service and Privacy Policy.',
    });

    // Send email verification.
    const token = crypto.randomBytes(32).toString('hex');
    await db.run(
      'UPDATE users SET email_verify_token = ? WHERE id = ?',
      [token, id]
    );
    await emailSvc.sendVerification(email, token);

    req.flash('success', 'Account created! Please check your email to verify your address.');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', err.message || 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

// ── Verify email ──────────────────────────────────────────────────────────────

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/login');

  const user = await db.get(
    'SELECT * FROM users WHERE email_verify_token = ?',
    [token]
  );
  if (!user) {
    req.flash('error', 'Invalid or expired verification link.');
    return res.redirect('/login');
  }

  await db.run(
    'UPDATE users SET email_verified = 1, email_verify_token = NULL WHERE id = ?',
    [user.id]
  );
  req.flash('success', 'Email verified! You can now log in.');
  res.redirect('/login');
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  const next = req.query.next || '/';
  res.render('auth/login', { pageTitle: 'Log In', next });
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password, next = '/' } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/login');
  }

  const user = await User.findByEmail(email);
  if (!user || !(await User.verifyPassword(password, user.password_hash))) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/login');
  }
  if (!user.email_verified) {
    req.flash('error', 'Please verify your email before logging in.');
    return res.redirect('/login');
  }

  req.session.user = {
    id:            user.id,
    email:         user.email,
    username:      user.username,
    role:          user.role,
    is_minor:      user.is_minor,
    gpc_opt_out:   user.gpc_opt_out,
  };

  // Regenerate session ID on login to prevent session fixation.
  req.session.regenerate((err) => {
    if (err) { req.flash('error', 'Login error.'); return res.redirect('/login'); }
    req.session.user = {
      id:          user.id,
      email:       user.email,
      username:    user.username,
      role:        user.role,
      is_minor:    user.is_minor,
      gpc_opt_out: user.gpc_opt_out,
    };
    const safeNext = next.startsWith('/') ? next : '/';
    res.redirect(safeNext);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
