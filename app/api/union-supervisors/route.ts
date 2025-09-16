import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { ensureRole } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  entityId: null;
  role: "unionSupervisor";
  joinedAt: string | null;
  city: string | null;
  avatar: string | null;
};

export async function GET(req: NextRequest) {
  // مسموح لمسؤول الاتحاد فقط (الفرونت أصلًا ما بيطلبها لمدير الكيان)
  const guard = await ensureRole(["unionSupervisor"], req);
  if (guard) return guard;

  const db = getDB();
  // كل من role = unionSupervisor
  const sql = `
    SELECT
      u.id             AS id,
      u.name           AS name,
      u.email          AS email,
      u.phone          AS phone,
      NULL             AS entityId,
      'unionSupervisor' AS role,
      u.createdAt      AS joinedAt,
      u.city           AS city,
      u.avatar         AS avatar
    FROM users u
    WHERE u.role = 'unionSupervisor'
  `;
  const rows = db.prepare(sql).all() as Row[];

  rows.sort((a, b) => (new Date(b.joinedAt || 0).getTime()) - (new Date(a.joinedAt || 0).getTime()));

  return NextResponse.json(rows);
}
