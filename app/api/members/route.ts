export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { listMembers, addMember } from "@/lib/server/data-store-server";

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

function canManageMembers(s: Session | null) {
  return !!s && (s.role === "systemAdmin" || s.role === "entityManager");
}

export async function GET() {
  return NextResponse.json(listMembers());
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!canManageMembers(s)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const b = await req.json();
  if (!b?.name || !b?.entityId) {
    return NextResponse.json({ error: "name و entityId مطلوبان" }, { status: 400 });
  }

  // entityManager لا يضيف إلا على كيانُه
  if (s!.role === "entityManager" && String(b.entityId) !== String(s!.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: لا يمكنك الإضافة خارج كيانك" }, { status: 403 });
  }

  const item = addMember({
    name: String(b.name),
    email: b?.email ? String(b.email) : undefined,
    phone: b?.phone ? String(b.phone) : undefined,
    entityId: String(b.entityId),
    roleInEntity: b?.roleInEntity ? String(b.roleInEntity) : undefined,
  });

  return NextResponse.json(item, { status: 201 });
}
