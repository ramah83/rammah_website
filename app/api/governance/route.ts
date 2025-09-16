export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getDB, uid } from "@/lib/server/sqlite";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type GovStatus = "draft" | "submitted" | "review" | "approved" | "rejected";

type Session = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entityId?: string | null;
};

type DBRow = {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  fileUrl: string | null;
  ownerEntityId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function ok(data:any, status=200) { return NextResponse.json(data, { status }); }
function err(message:string, status=400) { return NextResponse.json({ error: message }, { status }); }

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

function ensureTables() {
  const db = getDB();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS governance (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      fileUrl TEXT,
      ownerEntityId TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();
  db.prepare(`
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
    )
  `).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gov_owner ON governance(ownerEntityId)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gov_status ON governance(status)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gov_created ON governance(createdAt)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_gov_type ON governance(type)`).run();
  return db;
}

function serialize(r: DBRow) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    notes: r.notes ?? "",
    fileUrl: r.fileUrl ?? null,
    ownerEntityId: r.ownerEntityId ?? null,
    status: r.status || "draft",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function GET(req: Request) {
  try {
    const ses = await getSession();
    const db = ensureTables();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const entityIdParam = searchParams.get("entityId");
    const statusRaw = searchParams.get("status");
    const typeRaw = searchParams.get("type");
    const scope = searchParams.get("scope") || "all"; // all | mine | public

    const where: string[] = [];
    const params: any[] = [];

    // رؤية حسب الدور
    if (!ses) {
      where.push(`status = 'approved'`);
    } else if (ses.role === "user") {
      const row = db.prepare(`SELECT entityId FROM entity_members WHERE userId=? LIMIT 1`).get(ses.id) as { entityId?: string } | undefined;
      const userEntityId = row?.entityId || (ses.entityId ? String(ses.entityId) : null);
      if (!userEntityId) return ok([]);
      where.push(`status = 'approved'`);
      where.push(`ownerEntityId = ?`); params.push(String(userEntityId));
    } else if (ses.role === "entityManager") {
      where.push(`ownerEntityId = ?`); params.push(String(ses.entityId || ""));
    } // unionSupervisor يرى الكل

    // فلتر كيان (للمشرف فقط)
    if (entityIdParam && entityIdParam !== "all" && ses?.role === "unionSupervisor") {
      where.push(`ownerEntityId = ?`); params.push(entityIdParam);
    }

    // فلتر حالة
    const allowedStatus = new Set(["draft","submitted","review","approved","rejected"]);
    if (statusRaw && statusRaw !== "all" && allowedStatus.has(statusRaw)) {
      where.push(`status = ?`); params.push(statusRaw);
    }

    // فلتر النوع
    const allowedTypes = new Set(["policy","procedure","minutes","decision","inquiry","response"]);
    if (typeRaw && typeRaw !== "all" && allowedTypes.has(typeRaw)) {
      where.push(`type = ?`); params.push(typeRaw);
    }

    // scope
    if (scope === "mine" && ses?.role && ses.role !== "unionSupervisor") {
      where.push(`ownerEntityId = ?`); params.push(String(ses?.entityId || ""));
    } else if (scope === "public") {
      where.push(`status = 'approved'`);
    }

    // بحث
    if (q) {
      where.push(`(title LIKE ? OR COALESCE(notes,'') LIKE ? OR COALESCE(type,'') LIKE ?)`); 
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    let sql = `SELECT * FROM governance`;
    if (where.length) sql += ` WHERE ` + where.join(" AND ");
    sql += ` ORDER BY datetime(createdAt) DESC`;

    const rows = db.prepare(sql).all(...params) as DBRow[];
    return ok(rows.map(serialize));
  } catch (e:any) {
    return err(e?.message || "Server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const db = ensureTables();
    const ses = await getSession();
    if (!ses) return err("غير مصرح", 401);
    if (!(ses.role === "unionSupervisor" || ses.role === "entityManager")) return err("صلاحيات غير كافية", 403);

    const b = await req.json();
    const type = String(b?.type || "").trim();
    const title = String(b?.title || "").trim();
    const notes = String(b?.notes || "").trim();
    const fileUrl = b?.fileUrl ? String(b.fileUrl) : null;

    const allowedTypes = new Set(["policy","procedure","minutes","decision","inquiry","response"]);
    if (!allowedTypes.has(type)) return err("نوع السجل غير صالح", 400);
    if (!title) return err("العنوان مطلوب", 400);

    let ownerEntityId: string | null = null;
    if (ses.role === "unionSupervisor") {
      ownerEntityId = b?.ownerEntityId ? String(b.ownerEntityId) : (ses?.entityId ?? null);
    } else {
      ownerEntityId = String(ses.entityId || "");
    }
    if (!ownerEntityId) return err("الكيان المالك مطلوب", 400);
    if (ses.role === "entityManager" && String(ownerEntityId) !== String(ses.entityId || "")) {
      return err("غير مصرح: يمكنك الإضافة على كيانك فقط", 403);
    }

    const statusStr = String(b?.status || "draft") as GovStatus;
    const allowedStatus: GovStatus[] = ["draft","submitted","review","approved","rejected"];
    const status: GovStatus =
      ses.role === "entityManager"
        ? (["draft","submitted"].includes(statusStr) ? statusStr : "draft")
        : (allowedStatus.includes(statusStr) ? statusStr : "draft");

    const now = new Date().toISOString();
    const row: DBRow = {
      id: uid(),
      type,
      title,
      notes: notes || null,
      fileUrl,
      ownerEntityId,
      status,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO governance (id, type, title, notes, fileUrl, ownerEntityId, status, createdAt, updatedAt)
      VALUES (@id, @type, @title, @notes, @fileUrl, @ownerEntityId, @status, @createdAt, @updatedAt)
    `).run(row);

    db.prepare(`
      INSERT INTO governance_audit (id, govId, actorId, actorRole, action, fromStatus, toStatus, note, at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'create', NULL, ?, NULL, ?)
    `).run(row.id, ses.id, ses.role, row.status, now);

    return ok(serialize(row), 201);
  } catch (e:any) {
    return err(e?.message || "Server error", 500);
  }
}
