export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

/**
 * توحيد بنية الملفات المرفقة:
 * - يدعم شكل الكائن: { budgetPdf, miniPlanPdf, programPdf, briefPlanPdf }
 * - يدعم شكل المصفوفة: [{label,url}] مع التعرف على الكلمات المفتاحية (عربي/إنجليزي)
 */
function normalizeFiles(files: any) {
  // شكل كائن مباشر
  if (files && typeof files === "object" && !Array.isArray(files)) {
    return {
      budgetPdf: files.budgetPdf || null,
      miniPlanPdf: files.miniPlanPdf || null,
      programPdf: files.programPdf || null,
      briefPlanPdf: files.briefPlanPdf || null,
    };
  }

  // شكل مصفوفة [{label,url}]
  if (Array.isArray(files)) {
    const out: any = {};
    for (const it of files) {
      const label = String(it?.label || "");
      const url = it?.url ? String(it.url) : null;
      if (!url) continue;

      if (/ميزانية|budget/i.test(label)) out.budgetPdf = url;
      else if (/خطة\s*(?:النشاط|الترويج)?|plan/i.test(label)) out.miniPlanPdf = url; // خطة نشاط/Plan
      else if (/برنامج|program|timeline/i.test(label)) out.programPdf = url; // برنامج / Timeline
      else if (/ترويج|brief/i.test(label)) out.briefPlanPdf = url; // خطة ترويج مختصرة
    }
    return out;
  }

  return {};
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const ev = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id) as any;
  if (!ev) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // آخر نموذج طلب مرتبط بالفعالية (لجلب التفاصيل + الملفات)
  const reqRow = db.prepare(
    `SELECT payload, createdAt
       FROM event_requests
      WHERE eventId=?
      ORDER BY datetime(createdAt) DESC
      LIMIT 1`
  ).get(params.id) as any;

  let details: any = {};
  try {
    const raw = reqRow?.payload ? JSON.parse(reqRow.payload) : {};
    details = { ...raw, files: normalizeFiles(raw?.files) };
  } catch {
    details = {};
  }

  // عدد التقييمات
  const evalCountRow = db
    .prepare(`SELECT COUNT(*) AS c FROM event_evaluations WHERE eventId=?`)
    .get(params.id) as any;

  // اسم المنظم المعروض
  const organizerName = ev?.approvedByName || ev?.createdByName || "—";

  return NextResponse.json({
    ...ev,
    organizerName,
    details,
    evalCount: Number(evalCountRow?.c || 0),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s || !["unionSupervisor", "entityManager"].includes(s.role)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const db = getDB();
  const ex = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id) as any;
  if (!ex) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // مدير الكيان لا يعدّل إلا داخل كيانه
  if (s.role === "entityManager" && String(ex.entityId || "") !== String(s.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: تعديل داخل كيانك فقط" }, { status: 403 });
  }

  let b: any = {};
  try { b = await req.json(); } catch {}

  const allowed = ["requested", "draft", "approved", "rejected", "cancelled", "done", "evaluated"];
  const status = b?.status ? String(b.status) : ex.status;
  if (b?.status && !allowed.includes(status)) {
    return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
  }

  // لو مدير كيان: ممنوع نقل الفعالية لكيان آخر
  const nextEntityId =
    s.role === "unionSupervisor"
      ? (b?.entityId ?? ex.entityId)
      : ex.entityId;

  const next = {
    title:  b?.title  ?? ex.title,
    date:   b?.date   ?? ex.date,
    status,
    entityId: nextEntityId,
  };

  // حماية إضافية
  if (s.role === "entityManager" && String(next.entityId || "") !== String(ex.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: لا يمكنك نقل الفعالية لكيان آخر" }, { status: 403 });
  }

  // إن كانت موافقة جديدة من مسؤول الاتحاد: سجّل بيانات الموافقة
  const isApproving =
    ex.status !== "approved" &&
    status === "approved" &&
    s.role === "unionSupervisor";

  const sql = `
    UPDATE events
       SET title=?,
           date=?,
           status=?,
           entityId=?${isApproving ? `,
           approvedBy=?,
           approvedByName=?,
           approvedAt=datetime('now')` : ``}
     WHERE id=?`;

  const args: any[] = [next.title, next.date, next.status, next.entityId];
  if (isApproving) args.push(s.id, (s.name || s.email || "—"));
  args.push(params.id);

  db.prepare(sql).run(...args);

  const after = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id);

  // إرسال إشعارات لأعضاء الكيان عند التعديل أو الموافقة
  if (ex.entityId) {
    try {
      const { createNotification } = await import("@/lib/server/notifications");
      const entityName = db.prepare("SELECT name FROM entities WHERE id = ?").get(ex.entityId) as { name?: string } | undefined;
      
      // جلب جميع أعضاء الكيان
      const members = db.prepare(`
        SELECT DISTINCT userId FROM (
          SELECT userId FROM entity_members WHERE entityId = ?
          UNION
          SELECT userId FROM join_requests WHERE entityId = ? AND status = 'approved'
        )
      `).all(ex.entityId, ex.entityId) as { userId: string }[];

      let notifType: "event_approved" | "event_rejected" | "event_created" = "event_created";
      let notifTitle = "تم تحديث الفعالية";
      let notifMessage = `تم تحديث فعالية "${next.title}" في ${entityName?.name || "الكيان"}`;

      if (isApproving) {
        notifType = "event_approved";
        notifTitle = "تمت الموافقة على الفعالية";
        notifMessage = `تمت الموافقة على فعالية "${next.title}" في ${entityName?.name || "الكيان"}`;
      } else if (ex.status !== "rejected" && status === "rejected") {
        notifType = "event_rejected";
        notifTitle = "تم رفض الفعالية";
        notifMessage = `تم رفض فعالية "${next.title}" في ${entityName?.name || "الكيان"}`;
      }

      for (const member of members) {
        if (member.userId !== s.id) {
          createNotification({
            userId: member.userId,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            link: `/events/${params.id}`,
          });
        }
      }
    } catch (notifError) {
      console.error("Failed to send event update notifications:", notifError);
    }
  }

  return NextResponse.json(after);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s || !["unionSupervisor", "entityManager"].includes(s.role)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const db = getDB();
  const ex = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id) as any;
  if (!ex) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // مدير الكيان يحذف فقط داخل كيانه
  if (s.role === "entityManager" && String(ex.entityId || "") !== String(s.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: حذف داخل كيانك فقط" }, { status: 403 });
  }

  db.prepare(`DELETE FROM events WHERE id=?`).run(params.id);

  // إرسال إشعارات لأعضاء الكيان عند الحذف
  if (ex.entityId) {
    try {
      const { createNotification } = await import("@/lib/server/notifications");
      const entityName = db.prepare("SELECT name FROM entities WHERE id = ?").get(ex.entityId) as { name?: string } | undefined;
      
      // جلب جميع أعضاء الكيان
      const members = db.prepare(`
        SELECT DISTINCT userId FROM (
          SELECT userId FROM entity_members WHERE entityId = ?
          UNION
          SELECT userId FROM join_requests WHERE entityId = ? AND status = 'approved'
        )
      `).all(ex.entityId, ex.entityId) as { userId: string }[];

      for (const member of members) {
        if (member.userId !== s.id) {
          createNotification({
            userId: member.userId,
            type: "event_deleted",
            title: "تم حذف فعالية",
            message: `تم حذف فعالية "${ex.title}" من ${entityName?.name || "الكيان"}`,
            link: "/events",
          });
        }
      }
    } catch (notifError) {
      console.error("Failed to send event deletion notifications:", notifError);
    }
  }

  return NextResponse.json({ ok: true });
}
