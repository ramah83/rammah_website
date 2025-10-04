export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import bcrypt from "bcryptjs";

export type UserRole = "unionSupervisor" | "entityManager" | "user";
const J = (v: any) => JSON.stringify(v ?? null);

function isNationalId(v?: string | null) {
  return !!v && /^\d{14}$/.test(v);
}
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
function isValidEmail(email: string) {
  // تحقّق بسيط ومقبول
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name, email, password, role, entityId,
      phone, city, bio, interests, avatar,
      reason,
      nationalId,
    } = body as {
      name?: string; email?: string; password?: string; role?: UserRole; entityId?: string | null;
      phone?: string | null; city?: string | null; bio?: string | null; interests?: string[]; avatar?: string | null;
      reason?: string | null;
      nationalId?: string | null;
    };

    // --------- تحققات أساسية ---------
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }
    const natId = (nationalId ?? "").toString().trim() || null;
    if (!natId) {
      return NextResponse.json({ error: "الرقم القومي مطلوب" }, { status: 400 });
    }
    if (!isNationalId(natId)) {
      return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });
    }

    const normEmail = normalizeEmail(email);
    if (!isValidEmail(normEmail)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    const db = getDB();

    // هل يوجد مسؤولو اتحاد حاليًا؟
    const adminsCount = (db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='unionSupervisor'`).get() as any)?.c ?? 0;
    const needsBootstrap = adminsCount === 0;

    // التحقق من فريدية الرقم القومي
    const natExists = db.prepare(`SELECT 1 FROM users WHERE nationalId=?`).get(natId);
    if (natExists) {
      return NextResponse.json({ error: "هذا الرقم القومي مسجّل بالفعل" }, { status: 400 });
    }

    // التحقق (اختياري) من تكرار البريد مسبقًا لإظهار رسالة أوضح (مع أن عندنا UNIQUE في الجدول)
    const emailExists = db.prepare(`SELECT 1 FROM users WHERE email=?`).get(normEmail);
    if (emailExists) {
      return NextResponse.json({ error: "البريد مسجّل من قبل" }, { status: 400 });
    }

    // --------- تحديد الدور والسيناريو ---------
    const allowed: UserRole[] = ["user", "entityManager", "unionSupervisor"];
    const requestedRole: UserRole = allowed.includes(role as any) ? (role as UserRole) : "user";

    const wantUnionSupervisor = requestedRole === "unionSupervisor";
    const wantEntityManager = requestedRole === "entityManager";

    if (wantEntityManager && !entityId) {
      return NextResponse.json({ error: "اختر الكيان الذي ستديره" }, { status: 400 });
    }

    // أول مسؤول اتحاد (Bootstrap Admin)
    const isBootstrapAdmin = wantUnionSupervisor && needsBootstrap;

    // الدور الذي سيتم إدخاله في users
    const insertRole: UserRole =
      isBootstrapAdmin ? "unionSupervisor"
      : wantEntityManager ? "user"                 // يطلب مدير —> ينشأ كمستخدم ويرفع طلب
      : wantUnionSupervisor ? "user"               // يطلب مسؤول —> ينشأ كمستخدم ويرفع طلب ترقية
      : requestedRole;                             // user

    // --------- إنشاء المستخدم ---------
    const id = uid();
    const hash = bcrypt.hashSync(password, 10);

    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, entityId, phone, city, bio, avatar, interests, nationalId)
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name.trim(),
        normEmail,
        hash,
        insertRole,
        phone?.toString().trim() || null,
        city?.toString().trim() || null,
        bio?.toString().trim() || null,
        avatar?.toString().trim() || null,
        Array.isArray(interests) ? J(interests) : J([]),
        natId
      );
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("UNIQUE constraint failed: users.email")) {
        return NextResponse.json({ error: "البريد مسجّل من قبل" }, { status: 400 });
      }
      if (msg.includes("UNIQUE constraint failed: users.nationalId")) {
        return NextResponse.json({ error: "هذا الرقم القومي مسجّل بالفعل" }, { status: 400 });
      }
      return NextResponse.json({ error: "تعذّر إنشاء المستخدم" }, { status: 500 });
    }

    // --------- طلبات مشتقة (ترقية/مدير) ---------
    let adminReqId: string | null = null;
    let managerReqId: string | null = null;

    // طلب ترقية لمسؤول اتحاد (لو مش الأول)
    if (wantUnionSupervisor && !isBootstrapAdmin) {
      adminReqId = uid();
      db.prepare(`
        INSERT INTO admin_promotion_requests (id, applicantUserId, status, createdAt)
        VALUES (?, ?, 'pending', datetime('now'))
      `).run(adminReqId, id);
    }

    // طلب مدير كيان
    if (wantEntityManager) {
      managerReqId = uid();
      db.prepare(`
        INSERT INTO manager_requests (id, entityId, applicantUserId, reason, status, createdAt)
        VALUES (?, ?, ?, ?, 'pending', datetime('now'))
      `).run(managerReqId, entityId, id, (reason || "").toString().slice(0, 500));
    }

    // --------- الاستجابة ---------
    const needsApproval =
      (!isBootstrapAdmin && wantUnionSupervisor) || wantEntityManager;

    return NextResponse.json({
      id,
      email: normEmail,
      name,
      role: insertRole,
      entityId: null,
      nationalId: natId,

      // إشارات للواجهة
      isBootstrapAdmin,         // اتسجّل كأول مسؤول؟
      needsBootstrap,           // مفيش مسؤولي اتحاد قبل التسجيل ده؟
      needsApproval,            // هل ينتظر موافقة لاحقة؟
      adminPromotionRequestId: adminReqId || undefined,
      managerRequestId: managerReqId || undefined,

      message:
        isBootstrapAdmin
          ? "تم إنشاء حسابك كمسؤول اتحاد الكيانات (أول مسؤول في المنصة)."
        : wantEntityManager
          ? "تم إنشاء حسابك كمستخدم عادي، وتم إرسال طلب تعيينك مديرًا للكيان إلى مسؤول الاتحاد للمراجعة."
        : wantUnionSupervisor
          ? "تم إنشاء حسابك كمستخدم عادي، وتم إرسال طلب ترقية إلى مسؤول الاتحاد للمراجعة."
          : undefined,
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
