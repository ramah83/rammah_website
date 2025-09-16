import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const db = getDB();

  const url = new URL(req.url);
  const qUserId = url.searchParams.get("id");
  const session = await getSession(req);
  const userId = session?.id || qUserId;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  // join_requests → أحداث: إرسال طلب + قرار (إن وجد)
  const reqs = db.prepare(`
    SELECT jr.id, jr.userId, jr.entityId, COALESCE(e.name, jr.entityName) AS entityName, jr.status,
           jr.createdAt, jr.decidedAt, jr.decidedBy, jr.note
    FROM join_requests jr
    LEFT JOIN entities e ON e.id = jr.entityId
    WHERE jr.userId=?
    ORDER BY jr.createdAt DESC
  `).all(userId) as any[];

  const reqEvents = reqs.flatMap((r) => {
    const base = {
      id: `req_${r.id}`,
      userId,
      entityId: String(r.entityId),
      entityName: String(r.entityName || r.entityId),
      note: r.note ?? null,
    };
    const sent = { ...base, type: "join_request" as const, at: r.createdAt, status: r.status };
    const decision = (r.decidedAt && r.status !== "pending")
      ? [{
          ...base,
          id: `req_${r.id}_decision`,
          type: r.status === "approved" ? "join_approved" as const : "join_rejected" as const,
          at: r.decidedAt,
          status: r.status,
        }]
      : [];
    return [sent, ...decision];
  });

  // membership_events → left/removed
  const rawEvents = db.prepare(`
    SELECT id, userId, entityId, entityName, type, createdAt, meta
    FROM membership_events
    WHERE userId=?
    ORDER BY createdAt DESC
  `).all(userId) as any[];

  const leaveEvents = rawEvents.map((e) => ({
    id: `ev_${e.id}`,
    userId,
    entityId: String(e.entityId),
    entityName: String(e.entityName),
    type: e.type as "left" | "removed",
    at: e.createdAt,
    status: e.type,
    note: null as string | null,
  }));

  const timeline = [...reqEvents, ...leaveEvents].sort((a, b) => (a.at < b.at ? 1 : -1));

  return NextResponse.json({ ok: true, timeline });
}
