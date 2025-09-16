// app/api/iso/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getDB } from "@/lib/server/sqlite";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type ISOStatus = "draft" | "submitted" | "review" | "approved" | "rejected";

type Session = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entityId?: string | null;
};

function decodeB64(b64?: string | null) {
  if (!b64) return "";
  try { return Buffer.from(b64, "base64").toString("utf8"); } catch { return ""; }
}
async function getSession(): Promise<Session | null> {
  try {
    const jar = await cookies();
    const rawCookie = jar.get("session")?.value || null;
    const hdrs = await headers();
    const b64Header = hdrs.get("x-session-b64");
    const legacyRawHeader = hdrs.get("x-session");
    const raw = b64Header ? decodeB64(b64Header) : (rawCookie ?? legacyRawHeader ?? null);
    return raw ? (JSON.parse(raw) as Session) : null;
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
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_owner ON iso(ownerEntityId)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_status ON iso(status)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_iso_code ON iso(code)`).run();
  return db;
}

function serialize(row: any) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    ownerEntityId: row.ownerEntityId ?? null,
    status: row.status,
    version: row.version ?? "",
    tags: row.tags ? String(row.tags).split(",").filter(Boolean) : [],
    description: row.description ?? "",
    fileUrl: row.fileUrl ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const ALLOWED: ISOStatus[] = ["draft", "submitted", "review", "approved", "rejected"];
const CAN_TRANSITION: Record<ISOStatus, ISOStatus[]> = {
  draft:     ["submitted"],
  submitted: ["review"],
  review:    ["approved", "rejected"],
  approved:  [],
  rejected:  [],
};

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const db = ensureISOTables();
    const row = db.prepare(`SELECT * FROM iso WHERE id=?`).get(ctx.params.id);
    if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const db = ensureISOTables();
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "غير مصرح: لا توجد جلسة" }, { status: 401 });

    const { id } = ctx.params;
    const before = db.prepare("SELECT * FROM iso WHERE id=?").get(id) as any;
    if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const isSupervisor = s.role === "unionSupervisor";
    const isEntityMgr = s.role === "entityManager" && String(before.ownerEntityId || "") === String(s.entityId || "");

    if (!(isSupervisor || isEntityMgr)) {
      return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
    }

    const body = await req.json();

    const fields: Record<string, any> = {};
    if (typeof body?.title === "string") fields.title = body.title.trim();
    if (typeof body?.code === "string") fields.code = body.code.trim();
    if (typeof body?.version === "string") fields.version = body.version.trim();
    if (typeof body?.tags !== "undefined") {
      const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(",");
      fields.tags = tags.map((t: any) => String(t).trim()).filter(Boolean).join(",");
    }
    if (typeof body?.description === "string") fields.description = body.description.trim();
    if (typeof body?.fileUrl === "string") fields.fileUrl = body.fileUrl.trim();
    if (typeof body?.ownerEntityId === "string") {
      // فقط المشرف العام يقدر ينقل الملكية
      if (!isSupervisor) {
        return NextResponse.json({ error: "غير مصرح: لا يمكنك تغيير الكيان المالك" }, { status: 403 });
      }
      fields.ownerEntityId = body.ownerEntityId.trim();
    }
    if (typeof body?.status === "string") {
      const next = body.status as ISOStatus;
      if (!ALLOWED.includes(next)) return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
      // entityManager لا يغيّر إلا ضمن السلسلة المسموحة
      if (isEntityMgr) {
        const allowedNext = new Set(CAN_TRANSITION[before.status as ISOStatus] || []);
        if (!allowedNext.has(next)) {
          return NextResponse.json({ error: "انتقال حالة غير مسموح" }, { status: 400 });
        }
      }
      fields.status = next;
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "لا توجد حقول صالحة للتعديل" }, { status: 400 });
    }

    fields.updatedAt = new Date().toISOString();
    const setSql = Object.keys(fields).map(k => `${k}=?`).join(", ");
    const values = Object.keys(fields).map(k => fields[k]);
    db.prepare(`UPDATE iso SET ${setSql} WHERE id=?`).run(...values, id);

    // سجل تدقيق عند تغيير الحالة أو العنوان/الملكية/النسخة/الملف
    const changedStatus = typeof fields.status !== "undefined";
    const noteParts: string[] = [];
    ["title", "code", "version", "tags", "description", "fileUrl", "ownerEntityId"].forEach(k => {
      if (typeof fields[k] !== "undefined") noteParts.push(k);
    });
    if (changedStatus || noteParts.length) {
      db.prepare(`
        INSERT INTO iso_audit (id, isoId, actorId, actorRole, action, fromStatus, toStatus, note, at)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        s.id,
        s.role,
        changedStatus ? "status_change" : "update",
        before.status || null,
        fields.status || before.status || null,
        noteParts.join(", ") || null,
        new Date().toISOString()
      );
    }

    const updated = db.prepare("SELECT * FROM iso WHERE id=?").get(id);
    return NextResponse.json(serialize(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const db = ensureISOTables();
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "غير مصرح: لا توجد جلسة" }, { status: 401 });

    const { id } = ctx.params;
    const row = db.prepare("SELECT * FROM iso WHERE id=?").get(id) as any;
    if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const isSupervisor = s.role === "unionSupervisor";
    const isEntityMgr = s.role === "entityManager" && String(row.ownerEntityId || "") === String(s.entityId || "");
    if (!(isSupervisor || isEntityMgr)) {
      return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
    }

    db.prepare("DELETE FROM iso WHERE id=?").run(id);
    db.prepare("INSERT INTO iso_audit (id, isoId, actorId, actorRole, action, fromStatus, toStatus, note, at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, s.id, s.role, "delete", row.status, null, null, new Date().toISOString());

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
