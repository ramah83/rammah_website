export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession, ensureRole } from "@/lib/server/session";

// وظيفة لتحويل البريد الإلكتروني إلى null إذا كان غير صالح
function toNullEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (!s || !s.includes("@") || s.length < 5) return null;
  return s;
}

// تحديث بيانات العضو
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
    if (guard) return guard;

    const s = await getSession(req);
    const db = getDB();
    const id = params.id;

    // التحقق من وجود العضو
    const original = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as any;
    if (!original) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    // التحقق من صلاحية الكيان إذا كان المستخدم مدير كيان
    if (s?.role === "entityManager" && String(original.entityId || "") !== String(s.entityId || "")) {
      return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });
    }

    // استخراج البيانات من الطلب
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.warn("فشل تحليل JSON من الطلب:", e);
    }

    // معالجة البيانات الواردة مع الحفاظ على القيم الأصلية إذا لم يتم توفير قيم جديدة
    const name = body?.name != null ? String(body.name).trim() : original.name;
    const email = body?.email === null ? null : body?.email != null ? toNullEmail(body.email) : original.email;
    const phone = body?.phone === null ? null : body?.phone != null ? String(body.phone).trim() : original.phone;
    const nationalId = body?.nationalId === null ? null : body?.nationalId != null ? String(body.nationalId).trim() : original.nationalId;
    const entityId = body?.entityId != null ? String(body.entityId).trim() : String(original.entityId || "");
    const city = body?.city != null ? String(body.city).trim() : null;

    // التحقق من القيم الإلزامية
    if (!name) {
      return NextResponse.json({ error: "name مطلوب" }, { status: 400 });
    }
    if (nationalId && !/^\d{14}$/.test(nationalId)) {
      return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });
    }

    // التحقق من تكرار الرقم القومي ضمن نفس الكيان
    if (nationalId) {
      const dup = db.prepare(`SELECT 1 FROM members WHERE id <> ? AND entityId = ? AND nationalId = ? LIMIT 1`).get(id, entityId, nationalId);
      if (dup) {
        return NextResponse.json({ error: "يوجد عضو بنفس الرقم القومي داخل هذا الكيان" }, { status: 409 });
      }
    }

    // تحديث جدول members
    db.prepare(
      `UPDATE members SET name = ?, email = ?, phone = ?, entityId = ?, nationalId = ?, city = ? WHERE id = ?`
    ).run(name, email, phone, entityId, nationalId, city, id);

    // تحديث جدول users إذا كان هناك بيانات إضافية (city أو phone)
    if (city !== null || phone !== null) {
      const byNid = nationalId || original.nationalId;
      const byEmail = (email || original.email || "") as string;

      if (byNid) {
        db.prepare(
          `UPDATE users SET city = COALESCE(?, city), phone = COALESCE(?, phone) WHERE nationalId = ?`
        ).run(city, phone, byNid);
      } else if (byEmail) {
        db.prepare(
          `UPDATE users SET city = COALESCE(?, city), phone = COALESCE(?, phone) WHERE lower(email) = lower(?)`
        ).run(city, phone, byEmail);
      }
    }

    // استرجاع البيانات المحدثة
    const updatedRow = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
    return NextResponse.json(updatedRow || {}, { status: 200 });

  } catch (error) {
    console.error("خطأ غير متوقع في PATCH:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}

// حذف العضو
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
    if (guard) return guard;

    const s = await getSession(req);
    const db = getDB();
    const id = params.id;

    // التحقق من وجود العضو
    const original = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id) as any;
    if (!original) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    // التحقق من صلاحية الكيان إذا كان المستخدم مدير كيان
    if (s?.role === "entityManager" && String(original.entityId || "") !== String(s.entityId || "")) {
      return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });
    }

    // البحث عن السجل في جدول users للحذف من entity_members
    const userRow =
      (original?.nationalId && db.prepare(`SELECT * FROM users WHERE nationalId = ?`).get(original.nationalId)) ||
      (original?.email && db.prepare(`SELECT * FROM users WHERE lower(email) = lower(?)`).get(String(original.email).toLowerCase())) ||
      null;

    if (userRow?.id) {
      db.prepare(`DELETE FROM entity_members WHERE userId = ?`).run(userRow.id);
    }

    // حذف العضو من جدول members
    db.prepare(`DELETE FROM members WHERE id = ?`).run(id);

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error("خطأ غير متوقع في DELETE:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}