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
    const row = d
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(table) as any;
    return !!row;
  } catch {
    return false;
  }
}

function ensureMembersHasRoleInEntity(d: Database.Database) {
  try {
    const has = d.prepare(`PRAGMA table_info(members)`).all() as any[];
    if (!has.some((r) => String(r.name) === "roleInEntity")) {
      d.exec(`ALTER TABLE members ADD COLUMN roleInEntity TEXT`);
    }
  } catch {}
}

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
      nationalId TEXT,
      roleInEntity TEXT
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
      status TEXT NOT NULL DEFAULT 'approved',
      imageUrl TEXT
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
    CREATE INDEX IF NOT EXISTS idx_ereq_status        ON entity_requests(status);
    CREATE INDEX IF NOT EXISTS idx_ereq_approver      ON entity_requests(approverRole);
    CREATE INDEX IF NOT EXISTS idx_ereq_targetEntity  ON entity_requests(targetEntityId);
    CREATE INDEX IF NOT EXISTS idx_ereq_createdBy     ON entity_requests(createdBy);
    CREATE INDEX IF NOT EXISTS idx_ereq_createdAt     ON entity_requests(createdAt);

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
    CREATE INDEX IF NOT EXISTS idx_mreq_entity ON manager_requests(entityId);
    CREATE INDEX IF NOT EXISTS idx_mreq_user   ON manager_requests(applicantUserId);
    CREATE INDEX IF NOT EXISTS idx_mreq_status ON manager_requests(status);

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
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT,
      status TEXT NOT NULL,
      entityId TEXT,
      createdBy TEXT,
      createdByName TEXT,
      createdByRole TEXT,
      approvedBy TEXT,
      approvedByName TEXT,
      approvedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS entity_admins (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,
      userId TEXT NOT NULL,
      assignedAt TEXT NOT NULL DEFAULT (datetime('now')),
      joinedAt   TEXT,
      UNIQUE(entityId, userId)
    );
    CREATE INDEX IF NOT EXISTS idx_ea_entity ON entity_admins(entityId);
    CREATE INDEX IF NOT EXISTS idx_ea_user   ON entity_admins(userId);

    CREATE TABLE IF NOT EXISTS entity_managers (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,
      userId TEXT NOT NULL,
      assignedAt TEXT NOT NULL DEFAULT (datetime('now')),
      joinedAt   TEXT,
      UNIQUE(entityId, userId)
    );
    CREATE INDEX IF NOT EXISTS idx_emg_entity ON entity_managers(entityId);
    CREATE INDEX IF NOT EXISTS idx_emg_user   ON entity_managers(userId);

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

  if (!hasColumn(d, "events", "createdAt")) {
    try {
      d.exec(`ALTER TABLE events ADD COLUMN createdAt TEXT NOT NULL DEFAULT (datetime('now'))`);
    } catch {}
  }
  try {
    d.exec(`CREATE INDEX IF NOT EXISTS idx_events_createdAt ON events(createdAt)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entityId)`);
    d.exec(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
  } catch {}

  d.exec(`
    CREATE TABLE IF NOT EXISTS entity_events (
      id           TEXT PRIMARY KEY,
      entityId     TEXT NOT NULL,
      action       TEXT NOT NULL,
      fromStatus   TEXT,
      toStatus     TEXT,
      reason       TEXT,
      actorId      TEXT,
      actorName    TEXT,
      actorRole    TEXT,
      createdAt    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_entity_events_entity ON entity_events(entityId);
    CREATE INDEX IF NOT EXISTS idx_entity_events_action ON entity_events(action);
  `);

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

  if (!hasColumn(d, "users", "passwordHash")) {
    try {
      d.exec(`ALTER TABLE users ADD COLUMN passwordHash TEXT`);
    } catch {}
  }
  if (!hasColumn(d, "users", "nationalId")) {
    try {
      d.exec(`ALTER TABLE users ADD COLUMN nationalId TEXT`);
    } catch {}
    try {
      d.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS ux_users_nationalId ON users(nationalId) WHERE nationalId IS NOT NULL`
      );
    } catch {}
  }
  if (!hasColumn(d, "users", "createdAt")) {
    try {
      d.exec(`ALTER TABLE users ADD COLUMN createdAt TEXT NOT NULL DEFAULT (datetime('now'))`);
    } catch {}
  }

  try {
    const info = tableInfo(d, "users");
    const emailInfo = info.find((r) => String(r.name) === "email");
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

  if (!hasColumn(d, "entities", "status")) {
    try {
      d.exec(`ALTER TABLE entities ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`);
    } catch {}
  }
  if (!hasColumn(d, "entities", "imageUrl")) {
    try {
      d.exec(`ALTER TABLE entities ADD COLUMN imageUrl TEXT`);
    } catch {}
  }
  try {
    const info = tableInfo(d, "entities");
    const createdAtInfo = info.find((r) => String(r.name) === "createdAt");
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
          status TEXT NOT NULL DEFAULT 'approved',
          imageUrl TEXT
        );
        INSERT OR IGNORE INTO entities_new
          (id,name,type,contactEmail,phone,location,documents,createdAt,createdBy,managerUserId,status,imageUrl)
        SELECT id,name,type,contactEmail,phone,location,documents,
               COALESCE(createdAt, datetime('now')) AS createdAt,
               createdBy,managerUserId,status,imageUrl
        FROM entities;
        DROP TABLE entities;
        ALTER TABLE entities_new RENAME TO entities;
        CREATE INDEX IF NOT EXISTS idx_entities_createdBy ON entities(createdBy);
        CREATE INDEX IF NOT EXISTS idx_entities_manager   ON entities(managerUserId);
        PRAGMA foreign_keys=ON;
      `);
    }
  } catch {}

  ensureMembersHasNationalId(d);
  try {
    d.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_members_entity_nationalId
      ON members(entityId, nationalId)
      WHERE nationalId IS NOT NULL;
    `);
  } catch {}

  try {
    d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ux_em_one_entity_per_user ON entity_members(userId)`);
  } catch {}

  try {
    d.exec(`DROP INDEX IF EXISTS ux_join_active_user`);
  } catch {}

  try {
    const upDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(upDir)) fs.mkdirSync(upDir, { recursive: true });
  } catch {}

  try {
    const row = d.prepare(`SELECT COUNT(*) AS c FROM entities`).get() as any;
    const c = row?.c ?? 0;
    if (!c) {
      const ins = d.prepare(
        "INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, createdAt, createdBy, managerUserId, status) " +
          "VALUES (?, ?, NULL, NULL, NULL, NULL, '[]', datetime('now'), 'seed', NULL, 'approved')"
      );
      const NAMES = [
        "كيان جيل قادر",
        "اتحاد بشبابها",
        "اتحاد شباب الأقصر",
        "رواد المحافظات الحدودية",
        "مهندسون من أجل مصر المستدامة",
        "اتحاد شباب يبني وطن",
        "اتحاد طلاب تحيا مصر",
        "رحلة شباب الجمهورية الجديدة",
        "الاتحاد الشبابي لدعم مصر",
        "اتحاد شباب كفر الشيخ",
        "شباب الوطن للريادة والتنمية",
        "الجيل الشبابي الصاعد",
        "شباب مصر احنا معاكوا",
        "الشباب بناة المستقبل",
        "سند شباب الدلتا",
        "انتماء شباب مصر",
        "حكاية إشارة",
        "رواد التطوير والتنمية الشبابية",
        "رموز شباب مصر",
        "إرادة شباب مصر",
        "الجبهة الدبلوماسية المصرية",
        "شباب مصر 2030",
        "قيادات شباب مصر",
        "كوادر شباب مصر",
        "شباب قادرون",
        "تنمية وطن",
        "اتحاد شباب البحيرة",
        "الاتحاد العام لمراكز شباب مصر",
        "سواعد شباب مصر",
        "سند شباب الصعيد",
        "مشروع وطن",
        "فكرة",
        "طاقة شباب مصر",
        "المصريون الشباب",
        "شباب مستدام",
        "صناع الفرص",
        "شباب بحري",
        "صوت شباب مصر",
        "فن إدارة الحياة",
        "الاتحاد الوطني للقيادات الشبابية"
      ];
      const tx = (d as any).transaction(() => {
        for (const nm of NAMES) ins.run(randomUUID(), nm);
      });
      tx();
    }
  } catch {}

  ensureIsoExtended(d);
  ensureGovernanceTables(d);

  try {
    d.exec(`
      INSERT INTO members (id, name, email, phone, entityId, nationalId, joinedAt)
      SELECT
        lower(hex(randomblob(16))),
        COALESCE(u.name,'—'),
        u.email,
        u.phone,
        em.entityId,
        u.nationalId,
        COALESCE(em.joinedAt, datetime('now'))
      FROM entity_members em
      JOIN users u ON u.id = em.userId
      WHERE NOT EXISTS (
        SELECT 1 FROM members m
        WHERE m.entityId = em.entityId
          AND m.nationalId = u.nationalId
      );
    `);
  } catch {}

  if (!hasTable(d, "event_attendance")) {
    try {
      d.exec(`
        CREATE TABLE IF NOT EXISTS event_attendance (
          eventId TEXT NOT NULL,
          userId  TEXT NOT NULL,
          attended INTEGER NOT NULL DEFAULT 1,
          checkedAt TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (eventId, userId)
        );
      `);
    } catch {}
  }

  d.exec(`PRAGMA foreign_keys = ON; PRAGMA recursive_triggers = OFF;`);
}

export function getDB() {
  if (db) {
    try {
      init(db);
    } catch {}
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
  try {
    return randomUUID();
  } catch {
    return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
