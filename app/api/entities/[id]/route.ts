export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getEntity, listEntities, updateEntity, removeEntity } from "@/lib/server/data-store-server";

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
  } catch { return null }
}
async function ensureRole(allowed: UserRole[]) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "غير مصرح: لا توجد جلسة" }, { status: 401 });
  if (!allowed.includes(s.role)) return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const one = getEntity(ctx.params.id) || listEntities().find(e => e.id === ctx.params.id);
  if (!one) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(one);
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const guard = await ensureRole(["systemAdmin", "entityManager"]);
  if (guard) return guard;

  const { id } = ctx.params;
  const patch = await req.json();

  const updated = updateEntity(id, {
    name: patch?.name,
    type: patch?.type,
    contactEmail: patch?.contactEmail,
    phone: patch?.phone,
    location: patch?.location,
    documents: Array.isArray(patch?.documents) ? patch.documents.map(String) : undefined,
  });
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  // خلي الحذف للأدمن فقط
  const guard = await ensureRole(["systemAdmin"]);
  if (guard) return guard;

  removeEntity(ctx.params.id);
  return NextResponse.json({ ok: true });
}
