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
    const rows = listEvents();
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (e: any) {
    console.error("GET /api/events failed:", e);
    return NextResponse.json({ error: "DB error", detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!canManageEvents(s)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  try {
    const b = await req.json();
    if (!b?.title || !b?.status) {
      return NextResponse.json({ error: "title & status مطلوبان" }, { status: 400 });
    }

    const allowed = ["draft", "approved", "cancelled", "done"] as const;
    if (!allowed.includes(b.status)) {
      return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
    }

    if (s!.role === "entityManager") {
      const myEnt = String(s!.entityId || "");
      const targetEnt = String(b?.entityId || "");
      if (!myEnt || !targetEnt || myEnt !== targetEnt) {
        return NextResponse.json({ error: "غير مصرح: الإنشاء مسموح داخل كيانك فقط" }, { status: 403 });
      }
    }

    const ev = addEvent({
      title: String(b.title),
      status: b.status,
      entityId: b?.entityId ? String(b.entityId) : null,
    });

    return NextResponse.json(ev, { status: 201 });
  } catch (e) {
    console.error("POST /api/events failed:", e);
    return NextResponse.json({ error: "failed to create event" }, { status: 500 });
  }
}
