export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { listISO, addISO } from "@/lib/server/data-store-server";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

async function getSession(): Promise<Session | null> {
  try {
    const jar = await cookies();                      // ← استخدم await
    const rawCookie = jar.get("session")?.value;

    const hdrs = await headers();                     // ← استخدم await
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

export async function GET() {
  return NextResponse.json(listISO());
}

export async function POST(req: Request) {
  const guard = await ensureRole(["systemAdmin", "qualitySupervisor"]);
  if (guard) return guard;

  const b = await req.json();
  if (!b?.code || !b?.title || !b?.ownerEntityId) {
    return NextResponse.json({ error: "code/title/ownerEntityId مطلوبين" }, { status: 400 });
  }

  const item = addISO({
    code: String(b.code),
    title: String(b.title),
    status: (b.status ?? "draft") as "draft" | "submitted" | "review" | "approved" | "rejected",
    ownerEntityId: String(b.ownerEntityId),
  });

  return NextResponse.json(item, { status: 201 });
}
