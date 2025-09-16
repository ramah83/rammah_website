import { NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDB();
    const rows = db.prepare(`
      SELECT id, name, email
        FROM users
       WHERE role = 'unionSupervisor'
    ORDER BY lower(email)
    `).all() as { id: string; name: string | null; email: string }[];

    const admins = (rows || []).map(r => ({
      id: r.id,
      name: r.name || "مسؤول اتحاد الكيانات",
      email: r.email,
    }));

    return NextResponse.json({ admins }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed_to_load_admins" }, { status: 500 });
  }
}
