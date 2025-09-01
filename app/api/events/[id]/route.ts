export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getEvent, updateEvent, removeEvent } from "@/lib/server/data-store-server";

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
  const current = getEvent(id);
  if (!current) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const patch = await req.json();

  if (s!.role === "entityManager") {
    const myEnt = String(s!.entityId || "");
    const currEnt = String(current.entityId || "");
    const nextEnt = patch?.entityId ? String(patch.entityId) : currEnt;
    if (!myEnt || currEnt !== myEnt || nextEnt !== myEnt) {
      return NextResponse.json({ error: "غير مصرح: تعديل مسموح داخل كيانك فقط" }, { status: 403 });
    }
  }

  if (patch?.status) {
    const allowed = ["draft", "approved", "cancelled", "done"] as const;
    if (!allowed.includes(patch.status)) {
      return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
    }
  }

  const updated = updateEvent(id, {
    title: typeof patch?.title === "string" ? patch.title : undefined,
    status: patch?.status,
    entityId: patch?.entityId ? String(patch.entityId) : (patch?.entityId === null ? null : undefined),
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const s = await getSession();
  if (!canManageEvents(s)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const { id } = ctx.params;
  const current = getEvent(id);
  if (!current) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (s!.role === "entityManager") {
    if (String(current.entityId || "") !== String(s!.entityId || "")) {
      return NextResponse.json({ error: "غير مصرح: حذف مسموح داخل كيانك فقط" }, { status: 403 });
    }
  }

  removeEvent(id);
  return NextResponse.json({ ok: true });
}
