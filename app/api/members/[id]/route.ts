export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getDB } from "@/lib/server/sqlite";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

async function getSession(): Promise<Session | null> {
  try {
    const jar = await cookies();
    const rawCookie = jar.get("session")?.value;
    const hdrs = await headers();
    const rawHeader = hdrs.get("x-session");
    const raw = rawCookie ?? rawHeader ?? null;
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

async function ensureRole(allowed: UserRole[]) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "غير مصرح: لا توجد جلسة" }, { status: 401 });
  if (!allowed.includes(s.role)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }
  return null;
}

// PATCH /api/members/[id]
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const guard = await ensureRole(["systemAdmin", "entityManager"]);
  if (guard) return guard;

  const s = await getSession();
  const { id } = ctx.params;
  const patch = await req.json();
  const db = getDB();

  const row: any = db.prepare("SELECT * FROM members WHERE id=?").get(id);
  if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // الـ Entity Manager: يعدّل داخل كيانُه فقط ولا يغيّر الكيان
  if (s!.role === "entityManager") {
    const myEnt = String(s!.entityId || "");
    if (!myEnt || String(row.entityId || "") !== myEnt) {
      return NextResponse.json({ error: "غير مصرح: تعديل مسموح داخل كيانك فقط" }, { status: 403 });
    }
    if (patch?.entityId && String(patch.entityId) !== myEnt) {
      return NextResponse.json({ error: "غير مصرح: لا يمكنك نقل العضو لكيان آخر" }, { status: 403 });
    }
  }

  const fields: Record<string, any> = {};
  if (typeof patch?.name === "string")        fields.name = patch.name;
  if (typeof patch?.email === "string")       fields.email = patch.email || null;
  if (typeof patch?.phone === "string")       fields.phone = patch.phone || null;
  if (typeof patch?.roleInEntity === "string")fields.roleInEntity = patch.roleInEntity || null;
  if (typeof patch?.entityId === "string")    fields.entityId = patch.entityId; // الأدمن فقط عمليًا

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتعديل" }, { status: 400 });
  }

  const setSql = Object.keys(fields).map(k => `${k}=?`).join(", ");
  const values = Object.keys(fields).map(k => fields[k]);
  db.prepare(`UPDATE members SET ${setSql} WHERE id=?`).run(...values, id);

  const updated: any = db.prepare("SELECT * FROM members WHERE id=?").get(id);
  return NextResponse.json(updated);
}

// DELETE /api/members/[id]
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const guard = await ensureRole(["systemAdmin", "entityManager"]);
  if (guard) return guard;

  const s = await getSession();
  const { id } = ctx.params;
  const db = getDB();

  const row: any = db.prepare("SELECT * FROM members WHERE id=?").get(id);
  if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // الـ Entity Manager يحذف داخل كيانُه فقط
  if (s!.role === "entityManager" && String(row.entityId || "") !== String(s!.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: حذف مسموح داخل كيانك فقط" }, { status: 403 });
  }

  db.prepare("DELETE FROM members WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
