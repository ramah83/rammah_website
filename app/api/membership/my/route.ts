// app/api/membership/my/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const db = getDB();
    const session = await getSession(req);

    if (!session?.id) {
      return NextResponse.json(
        { entityId: null, entityName: null, status: null },
        { status: 200 }
      );
    }

    const row = db
      .prepare(
        `
        SELECT em.entityId, e.name AS entityName
        FROM entity_members em
        LEFT JOIN entities e ON e.id = em.entityId
        WHERE em.userId = ?
        LIMIT 1
      `
      )
      .get(session.id) as any;

    if (!row) {
      return NextResponse.json(
        { entityId: null, entityName: null, status: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { entityId: row.entityId, entityName: row.entityName, status: "active" },
      { status: 200 }
    );
  } catch {
    // لا تكشف تفاصيل زيادة هنا
    return NextResponse.json(
      { entityId: null, entityName: null, status: null },
      { status: 200 }
    );
  }
}
