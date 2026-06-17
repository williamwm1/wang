'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'staff',   -- 'admin' | 'staff'
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One pickup record. Linked to a Square invoice. Holds the line items that
-- were picked up in this event, plus signature and who handled it.
CREATE TABLE IF NOT EXISTS pickups (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id     TEXT NOT NULL,
  invoice_number TEXT,
  order_id       TEXT,
  customer_name  TEXT,
  items_json     TEXT NOT NULL,          -- [{uid,name,qty,...}]
  picked_by_name TEXT NOT NULL,          -- name of person collecting goods
  signature      TEXT,                   -- data:image/png;base64,...
  picked_at      TEXT NOT NULL,          -- ISO timestamp of pickup
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id),
  created_by_name TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pickups_invoice ON pickups(invoice_id);

-- Returns / exchanges.
CREATE TABLE IF NOT EXISTS returns (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id     TEXT,
  invoice_number TEXT,
  type           TEXT NOT NULL DEFAULT 'return',  -- 'return' | 'exchange'
  customer_name  TEXT,
  items_json     TEXT NOT NULL,
  reason         TEXT,
  handled_by_name TEXT NOT NULL,
  created_by     INTEGER REFERENCES users(id),
  created_by_name TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_returns_invoice ON returns(invoice_id);

-- Audit trail of every change so the whole store can see who did what.
CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  user_name   TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function logActivity(user, action, detail) {
  db.prepare(
    'INSERT INTO activity_log (user_id, user_name, action, detail) VALUES (?,?,?,?)'
  ).run(user ? user.id : null, user ? user.name : null, action, detail || null);
}

module.exports = { db, logActivity };
