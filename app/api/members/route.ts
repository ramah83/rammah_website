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

// GET /api/members
export async function GET() {
  return NextResponse.json(listMembers());
}

// POST /api/members
export async function POST(req: Request) {
  const guard = await ensureRole(["systemAdmin", "entityManager"]);
  if (guard) return guard;

  const s = await getSession(); // نحتاج الكيان بتاعه لو كان Entity Manager

  const b = await req.json();
  const name = String(b?.name || "").trim();
  const entityId = String(b?.entityId || "").trim();

  if (!name || !entityId) {
    return NextResponse.json({ error: "name و entityId مطلوبان" }, { status: 400 });
  }

  // الـ Entity Manager يضيف داخل كيانُه فقط
  if (s!.role === "entityManager" && String(entityId) !== String(s!.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: لا يمكنك الإضافة خارج كيانك" }, { status: 403 });
  }

  const item = addMember({
    name,
    email: b?.email ? String(b.email) : undefined,
    phone: b?.phone ? String(b.phone) : undefined,
    entityId,
    roleInEntity: b?.roleInEntity ? String(b.roleInEntity) : undefined,
  });

  return NextResponse.json(item, { status: 201 });
}
