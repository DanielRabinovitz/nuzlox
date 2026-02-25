/**
 * scripts/db-migrate.js — Run database migrations.
 *
 * Usage: node scripts/db-migrate.js
 *
 * Reads DB_DRIVER from .env and runs the appropriate SQL migration file.
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * @ref docs/scripts/db-migrate.md
 */

'use strict';

require('dotenv').config();

const path = require('path');
const fs   = require('fs');

const driver = process.env.DB_DRIVER ||
  (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite');

async function migrate() {
  const sqlFile = path.join(
    __dirname, '..', 'migrations', driver, '001_initial_schema.sql'
  );

  if (!fs.existsSync(sqlFile)) {
    console.error(`Migration file not found: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log(`[migrate] Running schema for driver: ${driver}`);

  if (driver === 'sqlite') {
    const Database = require('better-sqlite3');
    const dbPath   = path.resolve(process.env.DB_SQLITE_PATH || 'data/dev.sqlite3');
    // Ensure data/ directory exists.
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(sql);
    db.close();
    console.log(`[migrate] SQLite schema applied: ${dbPath}`);
  } else {
    const mysql = require('mysql2/promise');
    const conn  = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT || '3306', 10),
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });
    await conn.query(sql);
    await conn.end();
    console.log('[migrate] MySQL schema applied.');
  }
}

migrate().catch(err => {
  console.error('[migrate] Error:', err.message);
  process.exit(1);
});
