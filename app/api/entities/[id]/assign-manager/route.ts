import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "unionSupervisor") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { managerUserId } = await req.json().catch(() => ({}));
  if (!managerUserId) return NextResponse.json({ error: "managerUserId مطلوب" }, { status: 400 });

  const db = getDB();
  const ok = db.prepare(`SELECT id FROM users WHERE id=?`).get(managerUserId);
  if (!ok) return NextResponse.json({ error:"manager not found" }, { status:404 });

  const ent = db.prepare(`SELECT id, status FROM entities WHERE id=?`).get(params.id) as any;
  if (!ent) return NextResponse.json({ error:"entity not found" }, { status:404 });
  if (ent.status !== "approved") return NextResponse.json({ error:"لا يمكن التعيين قبل اعتماد الكيان" }, { status:409 });

  db.prepare(`UPDATE entities SET managerUserId=? WHERE id=?`).run(managerUserId, params.id);
  db.prepare(`
    INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
    VALUES (?, ?, ?, datetime('now'))
  `).run(uid(), params.id, managerUserId);

  return NextResponse.json({ ok:true });
}
