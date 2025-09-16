export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";

export async function GET() {
  try {
    const db = getDB();
    const rows = db.prepare(`
      SELECT id, name
      FROM entities
      WHERE status = 'approved'
      ORDER BY name COLLATE NOCASE
    `).all() as { id: string; name: string }[];
    return NextResponse.json(rows ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
