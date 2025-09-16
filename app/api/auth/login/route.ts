export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import bcrypt from "bcryptjs";

type UserRole = "unionSupervisor" | "entityManager" | "user";

type UserRow = {
  id: string;
  email: string;
  name: string;
  password: string | null;       // قد يحتوي Plain أو Bcrypt في أنظمة قديمة
  passwordHash: string | null;   // الحقل المعتمد الحالي
  role: string;
  entityId?: string | null;
  permissions?: string | null;
  nationalId?: string | null;
};

function isNationalId(v?: string | null) {
  return !!v && /^\d{14}$/.test(v);
}

function isBcryptHash(v?: string | null) {
  return !!v && /^\$2[aby]\$\d{2}\$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
    }

    const { identifier, email, nationalId, password } = (await req.json().catch(() => ({}))) as {
      identifier?: string;
      email?: string;
      nationalId?: string;
      password?: string;
    };

    const loginId = (identifier ?? email ?? nationalId ?? "").toString().trim();
    if (!loginId || !password) {
      return NextResponse.json({ error: "أدخل المُعرّف (الإيميل أو الرقم القومي) وكلمة المرور" }, { status: 400 });
    }

    const db = getDB();

    let user: UserRow | undefined;
    if (isNationalId(loginId)) {
      user = db.prepare(`SELECT * FROM users WHERE nationalId=?`).get(loginId) as UserRow | undefined;
    } else {
      user = db.prepare(`SELECT * FROM users WHERE lower(email)=?`).get(loginId.toLowerCase()) as UserRow | undefined;
    }

    // التحقق من كلمة المرور مع دعم الترحيل
    let ok = false;
    if (user) {
      // الحالة الطبيعية: عندنا passwordHash
      if (user.passwordHash && bcrypt.compareSync(password, user.passwordHash)) {
        ok = true;
      } else if (!user.passwordHash && user.password) {
        // نظام قديم: ممكن password يكون Bcrypt أو Plain
        if (isBcryptHash(user.password)) {
          // password يحتوي Bcrypt — نقارن ونهاجره لـ passwordHash
          if (bcrypt.compareSync(password, user.password)) {
            ok = true;
            db.prepare(`UPDATE users SET passwordHash=?, password=NULL WHERE id=?`).run(user.password, user.id);
            user.passwordHash = user.password;
            user.password = null;
          }
        } else {
          // password Plain — قارن نصيًا ثم هاش وهاجر
          if (password === user.password) {
            ok = true;
            const newHash = bcrypt.hashSync(password, 10);
            db.prepare(`UPDATE users SET passwordHash=?, password=NULL WHERE id=?`).run(newHash, user.id);
            user.passwordHash = newHash;
            user.password = null;
          }
        }
      }
    }

    if (!user || !ok) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const parsedPerms: any[] = (() => {
      try { return user.permissions ? JSON.parse(user.permissions) : []; }
      catch { return []; }
    })();

    let notice:
      | { type: "approved" | "rejected" | "pending"; text: string; requestId?: string }
      | undefined;

    // ترقية لمسؤول اتحاد الكيانات
    try {
      const pr = db.prepare(
        `SELECT id, status FROM admin_promotion_requests
         WHERE applicantUserId=? ORDER BY createdAt DESC LIMIT 1`
      ).get(user.id) as { id: string; status: "pending"|"approved"|"rejected" } | undefined;

      if (pr?.status === "approved" && user.role !== "unionSupervisor") {
        db.prepare(`UPDATE users SET role='unionSupervisor' WHERE id=?`).run(user.id);
        user.role = "unionSupervisor";
        notice = { type: "approved", text: "تمت الموافقة على ترقيتك كمسؤول اتحاد الكيانات.", requestId: pr.id };
      } else if (pr?.status === "rejected") {
        notice = { type: "rejected", text: "تم رفض طلب الترقية كمسؤول اتحاد الكيانات.", requestId: pr.id };
      } else if (pr?.status === "pending") {
        notice = { type: "pending", text: "طلب الترقية كمسؤول اتحاد الكيانات مازال قيد المراجعة.", requestId: pr.id };
      }
    } catch {}

    // تعيين مدير كيان
    try {
      const mr = db.prepare(
        `SELECT id, entityId, status FROM manager_requests
         WHERE applicantUserId=? ORDER BY createdAt DESC LIMIT 1`
      ).get(user.id) as { id: string; entityId: string; status: "pending"|"approved"|"rejected" } | undefined;

      if (mr?.status === "approved" && (user.role !== "entityManager" || user.entityId !== mr.entityId)) {
        const tx = (db as any).transaction(() => {
          db.prepare(`UPDATE users SET role='entityManager', entityId=? WHERE id=?`).run(mr.entityId, user.id);
          const current = db.prepare(`SELECT managerUserId FROM entities WHERE id=?`).get(mr.entityId) as { managerUserId?: string } | undefined;
          if (!current?.managerUserId) {
            db.prepare(`UPDATE entities SET managerUserId=? WHERE id=?`).run(user.id, mr.entityId);
          }
        });
        tx();

        user.role = "entityManager";
        user.entityId = mr.entityId;
        notice = { type: "approved", text: "تمت الموافقة على تعيينك مديرًا للكيان.", requestId: mr.id };
      } else if (mr?.status === "rejected") {
        notice = { type: "rejected", text: "تم رفض طلب تعيينك مديرًا للكيان.", requestId: mr.id };
      } else if (mr?.status === "pending") {
        notice = { type: "pending", text: "طلب تعيينك مديرًا للكيان قيد المراجعة.", requestId: mr.id };
      }
    } catch {}

    // تطبيع الدور
    const rawRole = (user.role as string) || "user";
    const normalizedRole: UserRole =
      rawRole === "youth" ? "user"
      : rawRole === "systemAdmin" ? "unionSupervisor"
      : rawRole === "qualitySupervisor" ? "unionSupervisor"
      : (["unionSupervisor", "entityManager", "user"].includes(rawRole) ? (rawRole as UserRole) : "user");

    const normalizedEntityId = normalizedRole === "unionSupervisor" ? null : (user.entityId ?? null);

    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
      entityId: normalizedEntityId,
      nationalId: user.nationalId ?? null,
    };

    const uiPermissions = normalizedRole === "unionSupervisor" ? ["*"] : parsedPerms;

    const res = NextResponse.json({
      ...session,
      permissions: uiPermissions,
      notice,
      session,
    });

    res.cookies.set("session", JSON.stringify(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
