import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function POST(req: NextRequest, { params }: { params: { id: string }}) {
  const db = getDB();
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));

  const isMember = db
    .prepare(`SELECT 1 FROM entity_members WHERE entityId=? AND userId=?`)
    .get(params.id, session.id);
  if (!isMember) return NextResponse.json({ error: "ONLY_MEMBERS_CAN_REQUEST" }, { status: 403 });

  const dup = db.prepare(`
      SELECT id FROM manager_requests
       WHERE entityId=? AND applicantUserId=? AND status='pending'
    `).get(params.id, session.id);
  if (dup) return NextResponse.json({ ok: true, message: "طلبك قيد المراجعة بالفعل" });

  db.prepare(`
    INSERT INTO manager_requests (id, entityId, applicantUserId, reason, status, createdAt)
    VALUES (?, ?, ?, ?, 'pending', datetime('now'))
  `).run(uid(), params.id, session.id, reason || null);

  return NextResponse.json({ ok: true });
}
