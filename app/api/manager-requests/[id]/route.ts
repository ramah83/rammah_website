// /app/api/manager-requests/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const s = await getSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "unionSupervisor")
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });

  const id = String(params?.id || "");
  if (!id) return NextResponse.json({ error: "معرّف الطلب مفقود" }, { status: 400 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const decision = String(body?.decision ?? body?.action ?? "").trim().toLowerCase();
  const note: string | null = body?.note ? String(body.note) : null;

  const db = getDB();

  // احضر الطلب وتأكد أنه معلّق
  const reqRow = db.prepare(`SELECT * FROM manager_requests WHERE id=?`).get(id) as
    | {
        id: string;
        entityId: string;
        applicantUserId: string;
        status: "pending" | "approved" | "rejected";
      }
    | undefined;

  if (!reqRow || reqRow.status !== "pending") {
    return NextResponse.json(
      { error: "الطلب غير موجود أو غير مُعلّق" },
      { status: 404 }
    );
  }

  if (decision === "reject") {
    db.prepare(
      `UPDATE manager_requests
          SET status='rejected', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(?, note)
        WHERE id=?`
    ).run(s.id, note, id);

    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (decision !== "approve") {
    return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
  }

  try {
    const tx = (db as any).transaction(() => {
      // اعتمد الطلب
      db.prepare(
        `UPDATE manager_requests
            SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(?, note)
          WHERE id=?`
      ).run(s.id, note, id);

      // رقّي المستخدم إلى مسؤول كيان واربطه بالكيان
      db.prepare(
        `UPDATE users SET role='entityManager', entityId=? WHERE id=?`
      ).run(reqRow.entityId, reqRow.applicantUserId);

      // لو الكيان ملوش مدير، عيّن المتقدّم كمدير
      const current = db
        .prepare(`SELECT managerUserId FROM entities WHERE id=?`)
        .get(reqRow.entityId) as { managerUserId?: string } | undefined;

      if (!current?.managerUserId) {
        db.prepare(`UPDATE entities SET managerUserId=? WHERE id=?`).run(
          reqRow.applicantUserId,
          reqRow.entityId
        );
      }
    });
    tx();

    return NextResponse.json({ ok: true, status: "approved" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "تعذر تطبيق القرار" },
      { status: 500 }
    );
  }
}
