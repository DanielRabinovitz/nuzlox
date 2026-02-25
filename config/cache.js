/**
 * config/cache.js — Application-level in-process cache (node-cache).
 *
 * Stores short-lived computed values (ruleset lookups, team validation results)
 * that are expensive to recompute from the DB. Lost on process restart; caches
 * rebuild from MySQL/SQLite on the first request after restart.
 *
 * Key naming convention:  pk:<domain>:<discriminator>
 * Examples:
 *   pk:current_ruleset           — current ruleset version row
 *   pk:valid:<md5(team+version)> — team validation result
 *
 * TTLs are intentionally short — correctness matters more than cache efficiency.
 *
 * @ref docs/config/cache.md
 */

'use strict';

const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL:      3600,  // default 1-hour TTL
  checkperiod: 600,   // check for expired keys every 10 minutes
  useClones:   false, // return references for performance; callers must not mutate
});

module.exports = cache;
