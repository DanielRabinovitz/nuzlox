/**
 * routes/bugs.js — Bug report submission.
 *
 * Requires authentication. Stores report to DB and creates a GitHub issue.
 *
 * @ref docs/legal/data-privacy.md (user_id stored, not email)
 */
'use strict';

const express     = require('express');
const router      = express.Router();
const { z }       = require('zod');
const requireAuth = require('../middleware/requireAuth');
const BugReport   = require('../models/BugReport');
const github      = require('../services/github');

const BugSchema = z.object({
  title:           z.string().min(5).max(255),
  description:     z.string().min(10).max(5000),
  url_reported_on: z.string().max(512)
    .refine(v => !v || v.startsWith('http://') || v.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    })
    .optional(),
});

router.get('/report', requireAuth, (req, res) => {
  const referer = req.headers.referer || '';
  const prefillUrl = referer.startsWith('http://') || referer.startsWith('https://')
    ? referer
    : '';
  res.render('bugs/report', {
    pageTitle: 'Report a Bug — Nuzlox',
    prefillUrl,
  });
});

router.post('/report', requireAuth, async (req, res, next) => {
  try {
    const parsed = BugSchema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', 'Please fill in all required fields correctly.');
      return res.redirect('/bugs/report');
    }

    const { title, description, url_reported_on } = parsed.data;
    const userId   = req.session.user.id;
    const username = req.session.user.username || req.session.user.email;

    const reportId = await BugReport.create({ userId, title, description, urlReportedOn: url_reported_on });

    const issueBody = `**Reported by:** ${username}\n**URL:** ${url_reported_on || '(not provided)'}\n\n${description}`;
    const issueUrl  = await github.createIssue({ title, body: issueBody });

    if (issueUrl) {
      await BugReport.setGithubUrl(reportId, issueUrl);
    }

    req.flash('success', 'Bug report submitted — thank you!');
    res.redirect('/');
  } catch (err) { next(err); }
});

module.exports = router;
