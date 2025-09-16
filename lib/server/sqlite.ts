// lib/server/sqlite.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

let db: Database.Database | null = null;

function hasColumn(d: Database.Database, table: string, col: string) {
  try {
    const rows = d.prepare(`PRAGMA table_info(${table})`).all() as any[];
    return rows.some((r) => String(r.name) === col);
  } catch {
    return false;
  }
}
function tableInfo(d: Database.Database, table: string) {
  try {
    return d.prepare(`PRAGMA table_info(${table})`).all() as any[];
  } catch {
    return [];
  }
}
function hasTable(d: Database.Database, table: string) {
  try {
    const row = d.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table) as any;
    return !!row;
  } catch {
    return false;
  }
}

/** 🔧 تأكيد وجود nationalId في members مع الحفاظ على البيانات */
function ensureMembersHasNationalId(d: Database.Database) {
  if (hasColumn(d, "members", "nationalId")) return;
  try {
    d.exec(`ALTER TABLE members ADD COLUMN nationalId TEXT`);
  } catch {}
  if (hasColumn(d, "members", "nationalId")) return;

  d.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE IF NOT EXISTS members_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      entityId TEXT,
      joinedAt TEXT NOT NULL,
      nationalId TEXT
    );
    INSERT INTO members_new (id, name, email, phone, entityId, joinedAt)
      SELECT id, name, email, phone, entityId, joinedAt FROM members;
    DROP TABLE members;
    ALTER TABLE members_new RENAME TO members;
    PRAGMA foreign_keys=ON;
  `);

  try {
    d.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_members_entity_nationalId
      ON members(entityId, nationalId)
      WHERE nationalId IS NOT NULL;
    `);
  } catch {}
}

/** 🔧 توسعة iso */
function ensureIsoExtended(d: Database.Database) {
  if (!hasTable(d, "iso")) return;

  const addIfMissing = (name: string, def: string) => {
    if (!hasColumn(d, "iso", name)) {
      try {
        d.exec(`ALTER TABLE iso ADD COLUMN ${name} ${def}`);
      } catch {}
    }
  };

  addIfMissing("version", "TEXT");
  addIfMissing("tags", "TEXT");
  addIfMissing("description", "TEXT");
  addIfMissing("fileUrl", "TEXT");

  if (!hasColumn(d, "iso", "status")) {
    try {
      d.exec(`ALTER TABLE iso ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'`);
    } catch {}
  }

  try {
    d.exec(`CREATE INDEX IF NOT EXISTS idx_iso_owner   ON iso(ownerEntityId)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_iso_status  ON iso(status)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_iso_created ON iso(createdAt)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_iso_code    ON iso(code)`);
  } catch {}
}

/** 🔧 جداول الحوكمة */
function ensureGovernanceTables(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS governance (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      fileUrl TEXT,
      ownerEntityId TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS governance_audit (
      id TEXT PRIMARY KEY,
      govId TEXT NOT NULL,
      actorId TEXT NOT NULL,
      actorRole TEXT NOT NULL,
      action TEXT NOT NULL,
      fromStatus TEXT,
      toStatus TEXT,
      note TEXT,
      at TEXT NOT NULL
    );
  `);

  const addIfMissing = (name: string, def: string) => {
    if (!hasColumn(d, "governance", name)) {
      try {
        d.exec(`ALTER TABLE governance ADD COLUMN ${name} ${def}`);
      } catch {}
    }
  };
  addIfMissing("notes", "TEXT");
  addIfMissing("fileUrl", "TEXT");
  addIfMissing("ownerEntityId", "TEXT");
  if (!hasColumn(d, "governance", "status")) {
    try {
      d.exec(`ALTER TABLE governance ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'`);
    } catch {}
  }
  if (!hasColumn(d, "governance", "createdAt")) {
    try {
      d.exec(`ALTER TABLE governance ADD COLUMN createdAt TEXT NOT NULL DEFAULT (datetime('now'))`);
    } catch {}
  }
  if (!hasColumn(d, "governance", "updatedAt")) {
    try {
      d.exec(`ALTER TABLE governance ADD COLUMN updatedAt TEXT NOT NULL DEFAULT (datetime('now'))`);
    } catch {}
  }

  try {
    d.exec(`CREATE INDEX IF NOT EXISTS idx_gov_owner   ON governance(ownerEntityId)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_gov_status  ON governance(status)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_gov_type    ON governance(type)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_gov_created ON governance(createdAt)`);
  } catch {}
}

function init(d: Database.Database) {
  d.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;`);
ensureMembersHasRoleInEntity(d);

  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      passwordHash TEXT,
      role TEXT NOT NULL,
      interests TEXT,
      entityId TEXT,
      permissions TEXT,
      phone TEXT,
      city TEXT,
      bio TEXT,
      avatar TEXT,
      nationalId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_entityId ON users(entityId);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_users_nationalId ON users(nationalId) WHERE nationalId IS NOT NULL;

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      contactEmail TEXT,
      phone TEXT,
      location TEXT,
      documents TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      createdBy TEXT,
      managerUserId TEXT,
      status TEXT NOT NULL DEFAULT 'approved'
    );
    CREATE INDEX IF NOT EXISTS idx_entities_createdBy ON entities(createdBy);
    CREATE INDEX IF NOT EXISTS idx_entities_manager   ON entities(managerUserId);

    CREATE TABLE IF NOT EXISTS entity_requests (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      targetEntityId TEXT,
      payload TEXT,
      status TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      createdByRole TEXT NOT NULL,
      approverRole TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      decidedAt TEXT,
      decidedBy TEXT,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ereq_status       ON entity_requests(status);
    CREATE INDEX IF NOT EXISTS idx_ereq_approver     ON entity_requests(approverRole);
    CREATE INDEX IF NOT EXISTS idx_ereq_targetEntity ON entity_requests(targetEntityId);

    CREATE TABLE IF NOT EXISTS manager_requests (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,
      applicantUserId TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      decidedAt TEXT,
      decidedBy TEXT,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mreq_entity   ON manager_requests(entityId);
    CREATE INDEX IF NOT EXISTS idx_mreq_user     ON manager_requests(applicantUserId);
    CREATE INDEX IF NOT EXISTS idx_mreq_status   ON manager_requests(status);

    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      entityId TEXT NOT NULL,
      entityName TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      decidedAt TEXT,
      decidedBy TEXT,
      idFrontPath TEXT,
      idBackPath  TEXT,
      phone TEXT,
      position TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_join_user      ON join_requests(userId);
    CREATE INDEX IF NOT EXISTS idx_join_entity    ON join_requests(entityId);
    CREATE INDEX IF NOT EXISTS idx_join_status    ON join_requests(status);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_join_active
      ON join_requests(userId, entityId)
      WHERE status IN ('pending','approved');

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      entityId TEXT,
      joinedAt TEXT NOT NULL
      -- nationalId هيتضاف بالمَيجرَيْشن تحت
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT,
      status TEXT NOT NULL,
      entityId TEXT
    );
    -- جدول طلبات الفعاليات ضروري قبل أي تحديث يعتمد عليه
    CREATE TABLE IF NOT EXISTS event_requests (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      entityId TEXT,
      createdBy TEXT,
      payload TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evreq_event ON event_requests(eventId);

    CREATE TABLE IF NOT EXISTS event_evaluations (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      entityId TEXT,
      submittedBy TEXT,
      payload TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eveval_event ON event_evaluations(eventId);

    -- جدول ISO (بالأعمدة الموسعة الجديدة)
    CREATE TABLE IF NOT EXISTS iso (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      ownerEntityId TEXT,
      version TEXT,
      tags TEXT,
      description TEXT,
      fileUrl TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_iso_owner   ON iso(ownerEntityId);
    CREATE INDEX IF NOT EXISTS idx_iso_status  ON iso(status);
    CREATE INDEX IF NOT EXISTS idx_iso_created ON iso(createdAt);
    CREATE INDEX IF NOT EXISTS idx_iso_code    ON iso(code);

    CREATE TABLE IF NOT EXISTS entity_members (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,
      userId TEXT NOT NULL,
      joinedAt TEXT NOT NULL,
      UNIQUE(entityId, userId)
    );
    CREATE INDEX IF NOT EXISTS idx_em_entity ON entity_members(entityId);
    CREATE INDEX IF NOT EXISTS idx_em_user   ON entity_members(userId);

    CREATE TABLE IF NOT EXISTS admin_promotion_requests (
      id TEXT PRIMARY KEY,
      applicantUserId TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      decidedAt TEXT,
      decidedBy TEXT,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_apr_status ON admin_promotion_requests(status);
    CREATE INDEX IF NOT EXISTS idx_apr_user   ON admin_promotion_requests(applicantUserId);
  `);

  // 🔄 إصلاح ربط event_requests بالـ events (لو كانت موجودة بيانات قديمة بدون eventId)
  try {
    d.exec(`
      UPDATE event_requests
      SET eventId = (
        SELECT e.id FROM events e
        WHERE e.entityId = event_requests.entityId
          AND (json_extract(event_requests.payload, '$.name') = e.title
               OR json_extract(event_requests.payload, '$.title') = e.title)
        ORDER BY ABS(
          julianday(COALESCE(e.date, '1970-01-01')) -
          julianday(COALESCE(json_extract(event_requests.payload, '$.date'), '1970-01-01'))
        ) ASC
        LIMIT 1
      )
      WHERE eventId IS NULL;
    `);
  } catch {}

  // جداول إضافية
  if (!hasTable(d, "membership_events")) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS membership_events (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        entityId TEXT NOT NULL,
        entityName TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('left','removed')),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        meta TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_me_user   ON membership_events(userId);
      CREATE INDEX IF NOT EXISTS idx_me_entity ON membership_events(entityId);
      CREATE INDEX IF NOT EXISTS idx_me_type   ON membership_events(type);
      CREATE INDEX IF NOT EXISTS idx_me_date   ON membership_events(createdAt);
    `);
  }

  // users migrations
  if (!hasColumn(d, "users", "passwordHash")) {
    try { d.exec(`ALTER TABLE users ADD COLUMN passwordHash TEXT`); } catch {}
  }
  if (!hasColumn(d, "users", "nationalId")) {
    try { d.exec(`ALTER TABLE users ADD COLUMN nationalId TEXT`); } catch {}
    try { d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ux_users_nationalId ON users(nationalId) WHERE nationalId IS NOT NULL`); } catch {}
  }
  if (!hasColumn(d, "users", "createdAt")) {
    try { d.exec(`ALTER TABLE users ADD COLUMN createdAt TEXT NOT NULL DEFAULT (datetime('now'))`); } catch {}
  }
  try {
    const info = tableInfo(d, "users");
    const emailInfo = info.find(r => String(r.name) === "email");
    if (emailInfo && Number(emailInfo.notnull) === 1) {
      d.exec(`
        PRAGMA foreign_keys=OFF;
        CREATE TABLE IF NOT EXISTS users_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          password TEXT,
          passwordHash TEXT,
          role TEXT NOT NULL,
          interests TEXT,
          entityId TEXT,
          permissions TEXT,
          phone TEXT,
          city TEXT,
          bio TEXT,
          avatar TEXT,
          nationalId TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO users_new
          (id,name,email,password,passwordHash,role,interests,entityId,permissions,phone,city,bio,avatar,nationalId,createdAt)
        SELECT id,name,email,password,passwordHash,role,interests,entityId,permissions,phone,city,bio,avatar,nationalId,
               COALESCE(createdAt, datetime('now')) FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_entityId ON users(entityId);
        CREATE UNIQUE INDEX IF NOT EXISTS ux_users_nationalId ON users(nationalId) WHERE nationalId IS NOT NULL;
        PRAGMA foreign_keys=ON;
      `);
    }
  } catch {}

  // entities migrations
  if (!hasColumn(d, "entities", "status")) {
    try { d.exec(`ALTER TABLE entities ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`); } catch {}
  }
  try {
    const info = tableInfo(d, "entities");
    const createdAtInfo = info.find(r => String(r.name) === "createdAt");
    if (createdAtInfo && !String(createdAtInfo.dflt_value || "").toLowerCase().includes("datetime('now')")) {
      d.exec(`
        PRAGMA foreign_keys=OFF;
        CREATE TABLE IF NOT EXISTS entities_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT,
          contactEmail TEXT,
          phone TEXT,
          location TEXT,
          documents TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          createdBy TEXT,
          managerUserId TEXT,
          status TEXT NOT NULL DEFAULT 'approved'
        );
        INSERT OR IGNORE INTO entities_new
          (id,name,type,contactEmail,phone,location,documents,createdAt,createdBy,managerUserId,status)
        SELECT id,name,type,contactEmail,phone,location,documents,COALESCE(createdAt, datetime('now')),createdBy,managerUserId,status
        FROM entities;
        DROP TABLE entities;
        ALTER TABLE entities_new RENAME TO entities;
        CREATE INDEX IF NOT EXISTS idx_entities_createdBy ON entities(createdBy);
        CREATE INDEX IF NOT EXISTS idx_entities_manager   ON entities(managerUserId);
        PRAGMA foreign_keys=ON;
      `);
    }
  } catch {}

  // members migration: تأكيد وجود nationalId + الإندكس
  ensureMembersHasNationalId(d);
  try {
    d.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_members_entity_nationalId
      ON members(entityId, nationalId)
      WHERE nationalId IS NOT NULL;
    `);
  } catch {}

  // entity_members قيود إضافية (اختياري)
  try { d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ux_em_one_entity_per_user ON entity_members(userId)`); } catch {}
  try { d.exec(`DROP INDEX IF EXISTS ux_join_active_user`); } catch {}

  // ملفات الرفع
  try {
    const upDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(upDir)) fs.mkdirSync(upDir, { recursive: true });
  } catch {}

  // seed entities
  try {
    const row = d.prepare(`SELECT COUNT(*) AS c FROM entities`).get() as any;
    const c = row?.c ?? 0;
    if (!c) {
      const ins = d.prepare(
        "INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, createdAt, createdBy, managerUserId, status) " +
        "VALUES (?, ?, NULL, NULL, NULL, NULL, '[]', datetime('now'), 'seed', NULL, 'approved')"
      );
      const NAMES = [
        "كيان سند شباب الصعيد","كيان اتحاد شباب الاقصر","كيان رواد التطوير و التنميه الشبابيه بمحافظه","كيان المصريون الشباب",
        "كيان اراده شباب مصر","كيان شباب بحري","رواد المحافظات الحدوديه","كيان الجبهه الدبلوماسيه المصريه","كيان كوادر شباب مصر",
        "كيان اتحاد طلاب مصر","كيان سند شباب الدلتا","كيان الجيل الشبابي الصاعد","كيان الشباب بناة المستقبل","كيان قيادات شباب مصر",
        "كيان مشروع وطن","كيان اتحاد شباب كفر الشيخ","كيان الاتحاد الشبابي لدعم مصر","كيان إرادة شباب مصر بالغربية","كيان شباب مستدام",
        "كيان رحلة شباب الجمهورية الجديدة","كيان أكاديمية الكوري بسوهاج","كيان أتحاد شباب الوطن بسوهاج","كيان حلم مصر بسوهاج",
        "كيان تيم القمه بسوهاج","كيان تيم الشيمي بسوهاج","كيان جيل قادر بسوهاج","كيان مراكز شباب مصر","كيان فكرة","الاتحاد الوطني للقيادات الشبابية",
        "كيان فن إدارة الحياة","كيان تنمية وطن","كيان حكاية إشارة","كيان رموز شباب مصر","كيان شباب يبني وطن","كيان صناع الفرص","كيان شباب مراكز مصر",
        "كيان مهندسون من أجل مصر المستدامة","كيان شباب قادرون"
      ];
      const tx = (d as any).transaction(() => {
        for (const nm of NAMES) ins.run(randomUUID(), nm);
      });
      tx();
    }
  } catch {}

  // 👈 توسعة iso لو كان موجود قديمًا بدون الأعمدة الجديدة
  ensureIsoExtended(d);

  // 👈 إنشاء/ترقية جداول الحوكمة
  ensureGovernanceTables(d);
try {
  // نزّل أي أعضاء من entity_members مش موجودين في members
  d.exec(`
    INSERT INTO members (id, name, email, phone, entityId, nationalId, joinedAt)
    SELECT
      lower(hex(randomblob(16)))               AS id,
      COALESCE(u.name,'—')                     AS name,
      u.email,
      u.phone,
      em.entityId,
      u.nationalId,
      COALESCE(em.joinedAt, datetime('now'))   AS joinedAt
    FROM entity_members em
    JOIN users u ON u.id = em.userId
    WHERE NOT EXISTS (
      SELECT 1 FROM members m
      WHERE m.entityId = em.entityId
        AND m.nationalId = u.nationalId
    );
  `);
} catch {}
  d.exec(`PRAGMA foreign_keys = ON; PRAGMA recursive_triggers = OFF;`);

}

export function getDB() {
  if (db) {
    try { init(db); } catch {}
    return db;
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "app.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  init(db);
  return db;
}

export function uid() {
  try { return randomUUID(); }
  catch { return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
}
function ensureMembersHasRoleInEntity(d: Database.Database) {
  try {
    const has = d.prepare(`PRAGMA table_info(members)`).all() as any[];
    if (!has.some((r) => String(r.name) === "roleInEntity")) {
      d.exec(`ALTER TABLE members ADD COLUMN roleInEntity TEXT`);
    }
  } catch {}
}