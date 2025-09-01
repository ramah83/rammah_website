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

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const guard = await ensureRole(["systemAdmin", "qualitySupervisor"]);
  if (guard) return guard;

  const { id } = ctx.params;
  const body = await req.json();

  const fields: Record<string, any> = {};
  if (typeof body?.title === "string") fields.title = body.title;
  if (typeof body?.code === "string") fields.code = body.code;
  if (typeof body?.ownerEntityId === "string") fields.ownerEntityId = body.ownerEntityId;
  if (typeof body?.status === "string") {
    const allowed = ["draft", "submitted", "review", "approved", "rejected"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
    }
    fields.status = body.status;
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول صالحة للتعديل" }, { status: 400 });
  }

  const db = getDB();
  const row: any = db.prepare("SELECT * FROM iso WHERE id=?").get(id);
  if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const setSql = Object.keys(fields).map(k => `${k}=?`).join(", ");
  const values = Object.keys(fields).map(k => fields[k]);
  db.prepare(`UPDATE iso SET ${setSql} WHERE id=?`).run(...values, id);

  const updated: any = db.prepare("SELECT * FROM iso WHERE id=?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const guard = await ensureRole(["systemAdmin", "qualitySupervisor"]);
  if (guard) return guard;

  const { id } = ctx.params;
  const db = getDB();
  db.prepare("DELETE FROM iso WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
