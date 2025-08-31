import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

let db: Database.Database | null = null

function init(db: Database.Database) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      role TEXT NOT NULL,
      interests TEXT,
      entityId TEXT,
      permissions TEXT
    );

    CREATE TABLE IF NOT EXISTS governance (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,           -- complaint | suggestion | policy | incident | kpi
      title TEXT,
      description TEXT,
      entityId TEXT,
      status TEXT,                  -- open | in_review | resolved | closed
      meta TEXT,                    -- JSON as TEXT
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gov_entity ON governance(entityId);
    CREATE INDEX IF NOT EXISTS idx_gov_status ON governance(status);

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      contactEmail TEXT,
      phone TEXT,
      location TEXT,
      documents TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      entityId TEXT,
      joinedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT,
      status TEXT NOT NULL,
      entityId TEXT
    );

    CREATE TABLE IF NOT EXISTS iso (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT,
      status TEXT NOT NULL,
      ownerEntityId TEXT
    );
  `)
}

export function getDB() {
  if (db) return db
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const file = path.join(dataDir, 'app.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  init(db)
  return db
}

export function ensureTables() { getDB() }

export function uid() {
  try { return randomUUID() }
  catch { return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36) }
}
