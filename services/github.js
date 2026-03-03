/**
 * services/github.js — GitHub Issues API integration.
 *
 * Uses Node v22 native fetch. Requires GITHUB_TOKEN, GITHUB_REPO_OWNER,
 * GITHUB_REPO_NAME env vars.
 */
'use strict';

async function createIssue({ title, body }) {
  const { GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
    console.warn('[github] Missing env vars — skipping issue creation');
    return null;
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body, labels: ['bug', 'user-report'] }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[github] Issue creation failed (${res.status}): ${text}`);
    return null;
  }

  const json = await res.json();
  return json.html_url;
}

module.exports = { createIssue };
