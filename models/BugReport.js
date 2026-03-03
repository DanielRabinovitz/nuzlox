/**
 * models/BugReport.js — Bug report data access.
 *
 * @ref docs/legal/data-privacy.md (user_id links to PII — handle per GDPR)
 */
'use strict';

const db = require('../config/database');

async function create({ userId, title, description, urlReportedOn }) {
  const { lastId } = await db.run(
    `INSERT INTO nuzlox_bug_reports (user_id, title, description, url_reported_on)
     VALUES (?, ?, ?, ?)`,
    [userId, title, description, urlReportedOn || null]
  );
  return lastId;
}

async function setGithubUrl(id, githubIssueUrl) {
  await db.run(
    'UPDATE nuzlox_bug_reports SET github_issue_url = ? WHERE id = ?',
    [githubIssueUrl, id]
  );
}

// TODO: used by future admin queue view — route must use requireAdmin middleware
//       as this JOIN exposes username (PII-linked).
async function getAll({ limit = 50, offset = 0 } = {}) {
  return db.all(
    `SELECT br.*, u.username
       FROM nuzlox_bug_reports br
       JOIN users u ON u.id = br.user_id
      ORDER BY br.created_at DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

module.exports = { create, setGithubUrl, getAll };
