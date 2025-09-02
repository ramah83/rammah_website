export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { updateEvent, deleteEvent } from "@/lib/server/data-store-server";

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
  } catch { return null; }
}

function canManageEvents(s: Session | null) {
  return !!s && (s.role === "systemAdmin" || s.role === "entityManager");
}


export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const s = await getSession();
  if (!canManageEvents(s)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const { id } = ctx.params;
  const b = await req.json();
  const allowed = ["draft", "approved", "cancelled", "done"];
  if (b?.status && !allowed.includes(b.status)) {
    return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
  }

  
  if (s!.role === "entityManager" && b?.entityId && String(b.entityId) !== String(s!.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: تعديل داخل كيانك فقط" }, { status: 403 });
  }

  const updated = updateEvent(id, {
    title: b?.title,
    date: b?.date,
    status: b?.status,
    entityId: b?.entityId,
  });

  if (!updated) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(updated);
}


export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const s = await getSession();
  if (!canManageEvents(s)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const { id } = ctx.params;
  const result = deleteEvent(id);
  return NextResponse.json(result);
}
