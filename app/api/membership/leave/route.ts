export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

/**
 * POST /api/membership/leave
 * body: { reason?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const session = await getSession(req);
    if (!session?.id) {
      return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

    // عضوية المستخدم الحالية
    const membership = db.prepare(`
      SELECT em.id AS emId, em.entityId, e.name AS entityName, e.managerUserId
      FROM entity_members em
      LEFT JOIN entities e ON e.id = em.entityId
      WHERE em.userId = ?
      LIMIT 1
    `).get(session.id) as any;

    if (!membership?.emId) {
      return NextResponse.json({ ok: false, error: "لا توجد عضوية حالية" }, { status: 400 });
    }

    const entityId = String(membership.entityId);

    // منع تكرار طلب pending لنفس (userId, entityId)
    const existing = db.prepare(`
      SELECT id FROM entity_requests
      WHERE action='leave_membership'
        AND status='pending'
        AND targetEntityId = ?
        AND json_extract(payload,'$.userId') = ?
      LIMIT 1
    `).get(entityId, String(session.id)) as any;

    if (existing?.id) {
      return NextResponse.json(
        { ok: false, error: "لديك طلب مغادرة قيد المراجعة لهذا الكيان.", requestId: String(existing.id) },
        { status: 409 }
      );
    }

    // ✅ تحديد ما إذا كان للكيان مدير (سواء في entities.managerUserId أو جدول entity_managers)
    const hasManagerDirect = !!membership.managerUserId;
    const hasManagerInBridge = !!db.prepare(
      `SELECT 1 FROM entity_managers WHERE entityId=? LIMIT 1`
    ).get(entityId);
    const hasAnyManager = hasManagerDirect || hasManagerInBridge;

    const approverRole: "entityManager" | "unionSupervisor" =
      hasAnyManager ? "entityManager" : "unionSupervisor";

    // cc للطرف الآخر
    const ccRoles: Array<"entityManager" | "unionSupervisor"> =
      approverRole === "entityManager" ? ["unionSupervisor"] : ["entityManager"];

    const requestId = uid();
    const payload = { userId: String(session.id), reason, ccRoles };

    db.prepare(`
      INSERT INTO entity_requests
        (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt, note)
      VALUES
        (?, 'leave_membership', ?, json(?), 'pending', ?, ?, ?, datetime('now'), ?)
    `).run(
      requestId,
      entityId,
      JSON.stringify(payload),
      session.id,
      session.role || "user",
      approverRole,
      reason
    );

    // لوج اختياري
    db.prepare(`
      INSERT INTO entity_events
        (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
      VALUES
        (?, ?, 'leave_requested', NULL, NULL, ?, ?, ?, ?, datetime('now'))
    `).run(
      uid(),
      entityId,
      reason,
      session.id,
      session.name || session.email || "مستخدم",
      session.role || "user"
    );

    return NextResponse.json({
      ok: true,
      requestId,
      approverRole,
      ccRoles,
      message:
        approverRole === "entityManager"
          ? "تم إرسال طلب المغادرة إلى مدير الكيان للمراجعة (ومنسّق للمشرف)."
          : "تم إرسال طلب المغادرة إلى مسؤول الاتحاد للمراجعة (ومنسّق للمدير إن وُجد).",
    }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
