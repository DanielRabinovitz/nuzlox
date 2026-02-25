/**
 * routes/forum.js — Forum page routes.
 *
 * Reading is open to guests. Creating topics and replies requires auth.
 * Moderation scan is triggered asynchronously after reply creation.
 *
 * @ref docs/routes/forum.md
 * @ref wallbreaker/docs/legal/online-safety-and-content-moderation.md
 * @ref wallbreaker/docs/accessibility/WCAG/04-robust.md §4.1.3 (aria-live on submission result)
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const Forum        = require('../models/Forum');
const Moderation   = require('../models/Moderation');
const moderationSvc = require('../services/moderation');
const requireAuth  = require('../middleware/requireAuth');
const { z }        = require('zod');

// ── Forum index ───────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const forums = await Forum.getAllForums();
    // Build parent→children hierarchy.
    const parents  = forums.filter(f => !f.parent_id);
    const children = forums.filter(f =>  f.parent_id);
    const tree     = parents.map(p => ({
      ...p,
      subForums: children.filter(c => c.parent_id === p.id),
    }));
    res.render('forum/index', { pageTitle: 'Debate Forum — Nuzlox', tree });
  } catch (err) { next(err); }
});

// ── New topic form ────────────────────────────────────────────────────────────

router.get('/new', requireAuth, async (req, res, next) => {
  try {
    const forums = await Forum.getAllForums();
    res.render('forum/new-topic', { pageTitle: 'New Topic — Nuzlox', forums });
  } catch (err) { next(err); }
});

router.post('/new', requireAuth, async (req, res, next) => {
  const schema = z.object({
    forum_id: z.string().regex(/^\d+$/),
    title:    z.string().min(5).max(255),
    content:  z.string().min(10).max(10000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    req.flash('error', 'Please provide a topic title (5–255 chars) and opening post (10–10,000 chars).');
    return res.redirect('/forum/new');
  }

  try {
    const { forum_id, title, content } = parsed.data;
    const slug     = await Forum.uniqueSlug(title);
    const topicId  = await Forum.createTopic({
      forumId: parseInt(forum_id, 10),
      userId:  req.session.user.id,
      title,
      slug,
    });
    // First reply is the opening post.
    const replyId = await Forum.createReply({
      topicId,
      userId:  req.session.user.id,
      content,
    });
    // Async scan — does not block response.
    setImmediate(() => moderationSvc.scan({
      contentId:   replyId,
      contentType: 'reply',
      userId:      req.session.user.id,
      content,
    }));

    res.redirect(`/forum/${slug}`);
  } catch (err) { next(err); }
});

// ── Topic view ────────────────────────────────────────────────────────────────

router.get('/:slug', async (req, res, next) => {
  try {
    const topic = await Forum.getTopicBySlug(req.params.slug);
    if (!topic) return res.status(404).render('error', { pageTitle: 'Not Found', status: 404, message: 'Topic not found.' });

    const replies = await Forum.getRepliesByTopic(topic.id);

    // Filter out blocked users' posts if the viewer is logged in.
    let blockedIds = [];
    if (req.session.user) {
      blockedIds = await Moderation.getBlockedIds(req.session.user.id);
    }
    const filteredReplies = replies.filter(r => !blockedIds.includes(r.user_id));

    res.render('forum/topic', {
      pageTitle: `${topic.title} — Nuzlox`,
      topic,
      replies: filteredReplies,
    });
  } catch (err) { next(err); }
});

// ── Reply ─────────────────────────────────────────────────────────────────────

router.post('/:slug/reply', requireAuth, async (req, res, next) => {
  const schema = z.object({ content: z.string().min(3).max(10000) });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    req.flash('error', 'Reply must be between 3 and 10,000 characters.');
    return res.redirect(`/forum/${req.params.slug}`);
  }

  try {
    const topic = await Forum.getTopicBySlug(req.params.slug);
    if (!topic || topic.status === 'closed') {
      req.flash('error', 'This topic is closed.');
      return res.redirect(`/forum/${req.params.slug}`);
    }
    const replyId = await Forum.createReply({
      topicId: topic.id,
      userId:  req.session.user.id,
      content: parsed.data.content,
    });
    setImmediate(() => moderationSvc.scan({
      contentId:   replyId,
      contentType: 'reply',
      userId:      req.session.user.id,
      content:     parsed.data.content,
    }));

    res.redirect(`/forum/${req.params.slug}#reply-${replyId}`);
  } catch (err) { next(err); }
});

module.exports = router;
