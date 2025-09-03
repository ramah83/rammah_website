import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

let db: Database.Database | null = null;

function init(d: Database.Database) {
  d.exec(`
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
      type TEXT NOT NULL,
      title TEXT,
      description TEXT,
      entityId TEXT,
      status TEXT,
      meta TEXT,
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
      createdAt TEXT NOT NULL,
      createdBy TEXT
    );
  CREATE TABLE IF NOT EXISTS join_requests (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    userEmail TEXT NOT NULL,
    entityId TEXT NOT NULL,
    entityName TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL,            -- "pending" | "approved" | "rejected"
    createdAt TEXT NOT NULL,
    decidedAt TEXT,
    decidedBy TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_join_user   ON join_requests(userId);
  CREATE INDEX IF NOT EXISTS idx_join_entity ON join_requests(entityId);
  CREATE INDEX IF NOT EXISTS idx_join_status ON join_requests(status);

  CREATE INDEX IF NOT EXISTS idx_users_entityId ON users(entityId);
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      entityId TEXT,
      roleInEntity TEXT,
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
  `);

  try {
    const memberCols = d.prepare(`PRAGMA table_info(members)`).all() as any[];
    if (!memberCols.some(c => String(c?.name) === "roleInEntity")) {
      d.prepare(`ALTER TABLE members ADD COLUMN roleInEntity TEXT`).run();
    }
  } catch {}

  try {
    const entCols = d.prepare(`PRAGMA table_info(entities)`).all() as any[];
    if (!entCols.some(c => String(c?.name) === "createdBy")) {
      d.prepare(`ALTER TABLE entities ADD COLUMN createdBy TEXT`).run();
      d.prepare(`CREATE INDEX IF NOT EXISTS idx_entities_createdBy ON entities(createdBy)`).run();
    }
  } catch {}
  try {
  const userCols = d.prepare(`PRAGMA table_info(users)`).all() as any[];
  const has = (name: string) => userCols.some(c => String(c?.name) === name);

  if (!has("phone"))   d.prepare(`ALTER TABLE users ADD COLUMN phone TEXT`).run();
  if (!has("city"))    d.prepare(`ALTER TABLE users ADD COLUMN city TEXT`).run();
  if (!has("bio"))     d.prepare(`ALTER TABLE users ADD COLUMN bio TEXT`).run();
  if (!has("avatar"))  d.prepare(`ALTER TABLE users ADD COLUMN avatar TEXT`).run();
} catch {}

}

export function getDB() {
  if (db) return db;
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "app.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  init(db);
  return db;
}

export function ensureTables() { getDB(); }

export function uid() {
  try { return randomUUID(); }
  catch { return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
}
