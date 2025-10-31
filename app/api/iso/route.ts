export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getDB, uid } from "@/lib/server/sqlite";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type ISOStatus = "draft" | "submitted" | "review" | "approved" | "rejected";

type Session = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entityId?: string | null;
};

type DBRow = {
  id: string;
  code: string;
  title: string;
  ownerEntityId: string | null; // قد تكون 'all'
  status: string;
  version: string | null;
  tags: string | null;
  description: string | null;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

function ok(data: any, status = 200) { return NextResponse.json(data, { status }); }
function err(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

function decodeB64(s?: string | null) {
  if (!s) return "";
  try { return Buffer.from(s, "base64").toString("utf8"); } catch { return ""; }
}
async function getSession(): Promise<Session | null> {
  try {
    const hdrs = await headers();
    const b64 = hdrs.get("x-session-b64");
    if (b64) {
      const raw = decodeB64(b64);
      if (raw) return JSON.parse(raw) as Session;
    }
    const jar = await cookies();
    const rawCookie = jar.get("session")?.value;
    return rawCookie ? (JSON.parse(rawCookie) as Session) : null;
  } catch { return null; }
}

function ensureISOTables() {
  const db = getDB();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS iso (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      ownerEntityId TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      version TEXT,
      tags TEXT,
      description TEXT,
      fileUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS iso_audit (
      id TEXT PRIMARY KEY,
      isoId TEXT NOT NULL,
      actorId TEXT NOT NULL,
      actorRole TEXT NOT NULL,
      action TEXT NOT NULL,
      fromStatus TEXT,
      toStatus TEXT,
      note TEXT,
      at TEXT NOT NULL
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_owner   ON iso(ownerEntityId)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_status  ON iso(status)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_created ON iso(createdAt)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_code    ON iso(code)`).run();
  return db;
}

function serialize(r: DBRow) {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    ownerEntityId: r.ownerEntityId ?? null,
    status: r.status || "draft",
    version: r.version ?? "",
    tags: r.tags ? String(r.tags).split(",").filter(Boolean) : [],
    description: r.description ?? "",
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// يجيب كيان العضو من الجلسة أو من جدول عضوية اختياري
function getUserEntityId(db: ReturnType<typeof getDB>, s: Session | null): string | null {
  if (!s) return null;
  if (s.entityId) return String(s.entityId);
  try {
    const row = db.prepare(`SELECT entityId FROM entity_members WHERE userId=? LIMIT 1`).get(s.id) as { entityId?: string } | undefined;
    return row?.entityId ? String(row.entityId) : null;
  } catch { return null; }
}

// ===================== LIST =====================
export async function GET(req: Request) {
  try {
    const ses = await getSession();
    const db = ensureISOTables();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const entityIdParam = searchParams.get("entityId");
    const statusRaw = searchParams.get("status");

    const where: string[] = [];
    const params: any[] = [];

    if (!ses) {
      // زائر: لا شيء (غير مسجّل)
      return ok([]);
    } else if (ses.role === "user") {
      // العضو: فقط المعتمد + على كيانه أو العام
      const userEntityId = getUserEntityId(db, ses);
      if (!userEntityId) return ok([]);
      where.push(`status = 'approved'`);
      where.push(`(ownerEntityId = 'all' OR ownerEntityId = ?)`); // كيانه + العام
      params.push(userEntityId);
      // يتم تجاهل entityId/status من الكويري للمستخدم العادي
    } else if (ses.role === "entityManager") {
      // مدير كيان: كيانه + العام، مع فلتر حالة اختياري
      where.push(`(ownerEntityId = ? OR ownerEntityId = 'all')`);
      params.push(String(ses.entityId || ""));
      const allowed = new Set(["draft","submitted","review","approved","rejected"]);
      if (statusRaw && statusRaw !== "all" && allowed.has(statusRaw)) {
        where.push(`status = ?`);
        params.push(statusRaw);
      }
      // نتجاهل entityId حتى لا يخرج من نطاقه
    } else {
      // unionSupervisor: يرى الكل مع فلاتر entity/status
      if (entityIdParam && entityIdParam !== "all") {
        where.push(`ownerEntityId = ?`);
        params.push(entityIdParam);
      }
      const allowed = new Set(["draft","submitted","review","approved","rejected"]);
      if (statusRaw && statusRaw !== "all" && allowed.has(statusRaw)) {
        where.push(`status = ?`);
        params.push(statusRaw);
      }
    }

    // البحث داخل نطاق الرؤية فقط
    if (q) {
      where.push(`(code LIKE ? OR title LIKE ? OR COALESCE(tags,'') LIKE ? OR COALESCE(description,'') LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    let sql = `SELECT * FROM iso`;
    if (where.length) sql += ` WHERE ` + where.join(" AND ");
    sql += ` ORDER BY datetime(createdAt) DESC`;

    const rows = db.prepare(sql).all(...params) as DBRow[];
    return ok(rows.map(serialize));
  } catch (e: any) {
    return err(e?.message || "Server error", 500);
  }
}

// ===================== CREATE =====================
export async function POST(req: Request) {
  try {
    const db = ensureISOTables();
    const ses = await getSession();
    if (!ses) return err("غير مصرح", 401);
    if (!(ses.role === "unionSupervisor" || ses.role === "entityManager")) return err("صلاحيات غير كافية", 403);

    const b = await req.json();
    const code = String(b?.code || "").trim();
    const title = String(b?.title || "").trim();
    const version = String(b?.version || "").trim();
    const tagsArr = Array.isArray(b?.tags) ? b.tags : String(b?.tags || "").split(",");
    const tags = tagsArr.map((t: any) => String(t).trim()).filter(Boolean).join(",");
    const description = String(b?.description || "").trim();
    const fileUrl = b?.fileUrl ? String(b.fileUrl) : null;

    let ownerEntityId: string | null = null;
    if (ses.role === "unionSupervisor") {
      // المشرف: يقدر يختار 'all' أو كيان معيّن
      ownerEntityId = b?.ownerEntityId ? String(b.ownerEntityId) : (ses?.entityId ?? null);
    } else {
      // مدير الكيان: على كيانه فقط
      ownerEntityId = String(ses.entityId || "");
    }

    const statusStr = String(b?.status || "draft");
    const allowed: ISOStatus[] = ["draft","submitted","review","approved","rejected"];
    const status: ISOStatus =
      ses.role === "entityManager"
        ? (["draft","submitted"].includes(statusStr) ? (statusStr as ISOStatus) : "draft")
        : (allowed.includes(statusStr as ISOStatus) ? (statusStr as ISOStatus) : "draft");

    if (!code) return err("كود النموذج مطلوب", 400);
    if (!title) return err("عنوان النموذج مطلوب", 400);
    if (!ownerEntityId) return err("الكيان المالك مطلوب", 400);

    if (ses.role === "entityManager" && String(ownerEntityId) !== String(ses.entityId || "")) {
      return err("غير مصرح: يمكنك الإضافة على كيانك فقط", 403);
    }

    // منع تكرار الكود داخل نفس الكيان (يشمل 'all')
    const dup = db.prepare(`SELECT 1 FROM iso WHERE code = ? AND ownerEntityId = ? LIMIT 1`).get(code, ownerEntityId);
    if (dup) return err("الكود مستخدم مسبقًا داخل نفس الكيان", 409);

    const now = new Date().toISOString();
    const row: DBRow = {
      id: uid(),
      code,
      title,
      ownerEntityId,
      status,
      version: version || null,
      tags: tags || null,
      description: description || null,
      fileUrl,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO iso (id, code, title, ownerEntityId, status, version, tags, description, fileUrl, createdAt, updatedAt)
      VALUES (@id, @code, @title, @ownerEntityId, @status, @version, @tags, @description, @fileUrl, @createdAt, @updatedAt)
    `).run(row);

    db.prepare(`
      INSERT INTO iso_audit (id, isoId, actorId, actorRole, action, fromStatus, toStatus, note, at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'create', NULL, ?, NULL, ?)
    `).run(row.id, ses.id, ses.role, row.status, now);

    return ok(serialize(row), 201);
  } catch (e: any) {
    return err(e?.message || "Server error", 500);
  }
}
