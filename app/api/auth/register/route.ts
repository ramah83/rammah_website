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

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const natId = (nationalId ?? "").toString().trim() || null;
    if (!natId) {
      return NextResponse.json({ error: "الرقم القومي مطلوب" }, { status: 400 });
    }
    if (!/^\d{14}$/.test(natId)) {
      return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });
    }

    const db = getDB();

    if (natId) {
      const exists = db.prepare(`SELECT 1 FROM users WHERE nationalId=?`).get(natId);
      if (exists) {
        return NextResponse.json({ error: "هذا الرقم القومي مسجّل بالفعل" }, { status: 400 });
      }
    }

    const allowed: UserRole[] = ["user", "entityManager", "unionSupervisor"];
    const requestedRole: UserRole = allowed.includes(role as any) ? (role as UserRole) : "user";

    const wantUnionSupervisor = requestedRole === "unionSupervisor";
    const wantEntityManager = requestedRole === "entityManager";

    if (wantEntityManager && !entityId) {
      return NextResponse.json({ error: "اختر الكيان الذي ستديره" }, { status: 400 });
    }

    const adminsCount = (db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='unionSupervisor'`).get() as any)?.c ?? 0;
    const isBootstrapAdmin = wantUnionSupervisor && adminsCount === 0;

    const insertRole: UserRole =
      isBootstrapAdmin ? "unionSupervisor"
      : wantEntityManager ? "user"
      : wantUnionSupervisor ? "user"
      : requestedRole;

    const id = uid();
    const hash = bcrypt.hashSync(password, 10);

    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, entityId, phone, city, bio, avatar, interests, nationalId)
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name.trim(),
        email.trim().toLowerCase(),
        hash, // تخزين الهاش فقط
        insertRole,
        phone?.trim() || null,
        city?.trim() || null,
        bio?.trim() || null,
        avatar?.trim() || null,
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

    let adminReqId: string | null = null;
    let managerReqId: string | null = null;

    if (wantUnionSupervisor && !isBootstrapAdmin) {
      adminReqId = uid();
      db.prepare(`
        INSERT INTO admin_promotion_requests (id, applicantUserId, status, createdAt)
        VALUES (?, ?, 'pending', datetime('now'))
      `).run(adminReqId, id);
    }

    if (wantEntityManager) {
      managerReqId = uid();
      db.prepare(`
        INSERT INTO manager_requests (id, entityId, applicantUserId, reason, status, createdAt)
        VALUES (?, ?, ?, ?, 'pending', datetime('now'))
      `).run(managerReqId, entityId, id, (reason || "").toString().slice(0, 500));
    }

    return NextResponse.json({
      id,
      email: email.trim().toLowerCase(),
      name,
      role: insertRole,
      entityId: null,
      nationalId: natId,
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
