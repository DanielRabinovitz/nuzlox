/**
 * config/database.js — Database connection abstraction.
 *
 * In development (DB_DRIVER=sqlite or NODE_ENV=development), uses SQLite via
 * better-sqlite3 for zero-config local development. In production
 * (DB_DRIVER=mysql or NODE_ENV=production), uses mysql2 connection pooling.
 *
 * Both drivers expose the same async interface:
 *   db.all(sql, params)  → Promise<row[]>
 *   db.get(sql, params)  → Promise<row | undefined>
 *   db.run(sql, params)  → Promise<{ lastId, changes }>
 *
 * @ref docs/config/database.md
 */

'use strict';

const path = require('path');

const driver = process.env.DB_DRIVER ||
  (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite');

let db;

if (driver === 'sqlite') {
  // ── SQLite (development) ──────────────────────────────────────────────────
  const Database = require('better-sqlite3');
  const dbPath   = path.resolve(
    process.env.DB_SQLITE_PATH || 'data/dev.sqlite3'
  );
  const sqlite   = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = {
    driver: 'sqlite',
    _sqlite: sqlite,

    all(sql, params = []) {
      return Promise.resolve(sqlite.prepare(sql).all(params));
    },

    get(sql, params = []) {
      return Promise.resolve(sqlite.prepare(sql).get(params));
    },

    run(sql, params = []) {
      const result = sqlite.prepare(sql).run(params);
      return Promise.resolve({
        lastId:  result.lastInsertRowid,
        changes: result.changes,
      });
    },
  };

  console.log(`[db] SQLite connected: ${dbPath}`);
} else {
  // ── MySQL (production) ────────────────────────────────────────────────────
  const mysql = require('mysql2/promise');
  const pool  = mysql.createPool({
    host:               process.env.DB_HOST || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306', 10),
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           '+00:00',
  });

  db = {
    driver: 'mysql',
    _pool:  pool,

    async all(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },

    async get(sql, params = []) {
      const [rows] = await pool.execute(sql, params);
      return rows[0];
    },

    async run(sql, params = []) {
      const [result] = await pool.execute(sql, params);
      return {
        lastId:  result.insertId,
        changes: result.affectedRows,
      };
    },
  };

  console.log(`[db] MySQL pool created: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
}

module.exports = db;
