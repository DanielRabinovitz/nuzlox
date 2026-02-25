/**
 * routes/account.js — Account settings, DSR portal, and reports.
 *
 * @ref docs/routes/account.md
 * @ref wallbreaker/docs/legal/data-privacy.md § DSR Portal
 */

'use strict';

const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/requireAuth');
const User        = require('../models/User');
const Consent     = require('../models/Consent');
const DSR         = require('../models/DSR');
const Moderation  = require('../models/Moderation');
const exportSvc   = require('../services/export');
const { z }       = require('zod');

router.use(requireAuth);

router.get('/settings', (req, res) => {
  res.render('account/settings', {
    pageTitle: 'Account Settings — Nuzlox',
    user:       req.session.user,
  });
});

router.post('/settings', async (req, res, next) => {
  const schema = z.object({
    username:            z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    youtube_channel_url: z.string().url().optional().or(z.literal('')),
    marketing_opt_in:    z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    req.flash('error', 'Invalid settings. Username must be 3–50 alphanumeric characters.');
    return res.redirect('/account/settings');
  }
  try {
    await User.update(req.session.user.id, {
      username:            parsed.data.username || undefined,
      youtube_channel_url: parsed.data.youtube_channel_url || null,
      marketing_opt_in:    parsed.data.marketing_opt_in === '1' ? 1 : 0,
    });
    if (parsed.data.marketing_opt_in !== '1') {
      await Consent.withdrawMarketing(req.session.user.id);
    }
    // Refresh session username.
    if (parsed.data.username) req.session.user.username = parsed.data.username;
    req.flash('success', 'Settings saved.');
    res.redirect('/account/settings');
  } catch (err) { next(err); }
});

// ── DSR Portal ────────────────────────────────────────────────────────────────

router.get('/privacy', async (req, res, next) => {
  try {
    const requests = await DSR.getByUser(req.session.user.id);
    res.render('account/privacy', {
      pageTitle: 'Privacy & Data — Nuzlox',
      requests,
    });
  } catch (err) { next(err); }
});

router.post('/privacy/request', async (req, res, next) => {
  const schema = z.object({
    request_type: z.enum(['access','deletion','correction','portability','deindex']),
    description:  z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    req.flash('error', 'Invalid request type.');
    return res.redirect('/account/privacy');
  }
  try {
    await DSR.create({
      userId:      req.session.user.id,
      email:       req.session.user.email,
      requestType: parsed.data.request_type,
      description: parsed.data.description,
    });
    req.flash('success', 'Your request has been received. We will respond within 30 days.');
    res.redirect('/account/privacy');
  } catch (err) { next(err); }
});

// ── My Reports ────────────────────────────────────────────────────────────────

router.get('/reports', async (req, res, next) => {
  try {
    const reports = await Moderation.getReportsByUser(req.session.user.id);
    res.render('account/reports', {
      pageTitle: 'My Reports — Nuzlox',
      reports,
    });
  } catch (err) { next(err); }
});

// ── Appeal ────────────────────────────────────────────────────────────────────

router.get('/appeal/:actionId(\\d+)', (req, res) => {
  res.render('account/appeal', {
    pageTitle: 'Appeal Moderation Action — Nuzlox',
    actionId:  req.params.actionId,
  });
});

router.post('/appeal/:actionId(\\d+)', async (req, res, next) => {
  const schema = z.object({ reason: z.string().min(10).max(5000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    req.flash('error', 'Please provide a reason for your appeal (10–5,000 characters).');
    return res.redirect(`/account/appeal/${req.params.actionId}`);
  }
  try {
    await Moderation.createAppeal({
      actionId: parseInt(req.params.actionId, 10),
      userId:   req.session.user.id,
      reason:   parsed.data.reason,
    });
    req.flash('success', 'Your appeal has been submitted and will be reviewed by a human moderator.');
    res.redirect('/account/privacy');
  } catch (err) { next(err); }
});

module.exports = router;
