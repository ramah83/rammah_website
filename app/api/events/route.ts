
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { listEvents, addEvent } from "@/lib/server/data-store-server";

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

export async function GET() {
  try {
    return NextResponse.json(listEvents());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "فشل تحميل الفعاليات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!canManageEvents(s)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const b = await req.json();
  if (!b?.title || !b?.entityId) {
    return NextResponse.json({ error: "title و entityId مطلوبان" }, { status: 400 });
  }

  const allowed = ["draft", "approved", "cancelled", "done"];
  const status = String(b.status ?? "draft");
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
  }

  const item = addEvent({
    title: String(b.title),
    date: b?.date ? String(b.date) : null,
    status: status as any,
    entityId: String(b.entityId),
  });

  return NextResponse.json(item, { status: 201 });
}
