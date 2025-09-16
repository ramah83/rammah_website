// lib/server/members.ts
import "server-only";
import { getDB, uid } from "@/lib/server/sqlite";

export type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
export type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

export type Member = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  roleInEntity?: string | null;
  entityId?: string | null;
  joinedAt: string;
  nationalId?: string | null;
};

// === helpers ===
const nowSql = () => new Date().toISOString().slice(0, 19).replace("T", " ");

function canRead(session: Session, memberEntityId: string | null) {
  if (session.role === "systemAdmin") return true;
  if (session.role === "qualitySupervisor") return true; // read-only
  if (session.role === "entityManager") return !!session.entityId && session.entityId === memberEntityId;
  return false; // youth
}

function canWrite(session: Session, memberEntityId: string | null) {
  if (session.role === "systemAdmin") return true;
  if (session.role === "entityManager") return !!session.entityId && session.entityId === memberEntityId;
  return false;
}

const toMember = (r: any): Member => ({
  id: r.id,
  name: r.name,
  email: r.email ?? null,
  phone: r.phone ?? null,
  roleInEntity: r.roleInEntity ?? null,
  entityId: r.entityId ?? null,
  joinedAt: r.joinedAt,
  nationalId: r.nationalId ?? null,
});

// === queries ===
export function listMembers(session: Session): Member[] {
  const db = getDB();
  if (session.role === "systemAdmin" || session.role === "qualitySupervisor") {
    const rows = db.prepare(`SELECT * FROM members ORDER BY name`).all() as any[];
    return rows.map(toMember);
  }
  if (session.role === "entityManager") {
    if (!session.entityId) return [];
    const rows = db.prepare(`SELECT * FROM members WHERE entityId=? ORDER BY name`).all(session.entityId) as any[];
    return rows.map(toMember);
  }
  return []; // youth
}

export function getMember(session: Session, id: string) {
  const db = getDB();
  const r: any = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  if (!r) return { ok: false as const, error: "العضو غير موجود" };
  if (!canRead(session, r.entityId ?? null)) return { ok: false as const, error: "غير مصرح" };
  return { ok: true as const, member: toMember(r) };
}

/** إنشاء user تلقائيًا بكلمة سر ثابتة لو فيه إيميل */
function ensureUserForMember(input: { name: string; email?: string | null; entityId: string | null }) {
  if (!input.email) return; // بدون إيميل مش هنعمل يوزر
  const db = getDB();
  const exists: any = db.prepare(`SELECT id FROM users WHERE email=?`).get(input.email);
  if (exists) return;

  const newId = uid();
  const defaultPassword = "user12345"; // المطلوب
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, entityId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    input.name,
    input.email,
    defaultPassword,
    "youth",                 // المستخدم الافتراضي عضو عادي
    input.entityId,
    nowSql()
  );
}

export function createMember(session: Session, input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  roleInEntity?: string | null;
  entityId?: string | null;       // للـ systemAdmin فقط مسموح يحدد كيان مختلف
  nationalId?: string | null;
}) {
  const db = getDB();

  const targetEntityId =
    session.role === "systemAdmin"
      ? (input.entityId ?? session.entityId ?? null)
      : session.role === "entityManager"
        ? (session.entityId ?? null)
        : null;

  if (!targetEntityId) return { ok: false as const, error: "لا يوجد كيان محدّد" };
  if (!canWrite(session, targetEntityId)) return { ok: false as const, error: "غير مصرح" };
  if (!input.name?.trim()) return { ok: false as const, error: "اسم العضو مطلوب" };

  // تحقق الرقم القومي داخل نفس الكيان (لو مرّرته)
  if (input.nationalId) {
    const dupe = db.prepare(`SELECT 1 FROM members WHERE entityId=? AND nationalId=?`).get(targetEntityId, input.nationalId);
    if (dupe) return { ok: false as const, error: "الرقم القومي مسجّل لهذا الكيان" };
  }

  const id = uid();
  db.prepare(`
    INSERT INTO members (id, name, email, phone, entityId, joinedAt, nationalId, roleInEntity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name.trim(),
    input.email ?? null,
    input.phone ?? null,
    targetEntityId,
    nowSql(),
    input.nationalId ?? null,
    input.roleInEntity ?? null
  );

  // إنشاء يوزر بكلمة سر ثابتة لو فيه إيميل ومافيش يوزر سابق
  ensureUserForMember({ name: input.name.trim(), email: input.email ?? null, entityId: targetEntityId });

  const created = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  return { ok: true as const, member: toMember(created) };
}

export function updateMember(session: Session, id: string, patch: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  roleInEntity?: string | null;
  nationalId?: string | null;
  entityId?: string | null; // مسموح تغيير كيان العضو: فقط systemAdmin
}) {
  const db = getDB();
  const r: any = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  if (!r) return { ok: false as const, error: "العضو غير موجود" };

  // تحديد الكيان الهدف بعد التعديل
  let newEntityId = r.entityId as string | null;
  if (patch.entityId && session.role === "systemAdmin") {
    newEntityId = String(patch.entityId);
  }

  // لازم يكون عنده صلاحية على الكيان الحالي AND الكيان بعد التغيير
  if (!canWrite(session, r.entityId ?? null)) return { ok: false as const, error: "غير مصرح" };
  if (!canWrite(session, newEntityId)) return { ok: false as const, error: "غير مصرح على الكيان الهدف" };

  // uniqueness للرقم القومي داخل الكيان
  const nextNatId = patch.nationalId ?? r.nationalId ?? null;
  if (nextNatId) {
    const dupe = db.prepare(`SELECT 1 FROM members WHERE entityId=? AND nationalId=? AND id<>?`).get(newEntityId, nextNatId, id);
    if (dupe) return { ok: false as const, error: "الرقم القومي مسجّل لهذا الكيان" };
  }

  const name = patch.name ?? r.name;
  const email = patch.email ?? r.email ?? null;
  const phone = patch.phone ?? r.phone ?? null;
  const roleInEntity = patch.roleInEntity ?? r.roleInEntity ?? null;

  db.prepare(`
    UPDATE members
       SET name=?, email=?, phone=?, roleInEntity=?, nationalId=?, entityId=?
     WHERE id=?
  `).run(name, email, phone, roleInEntity, nextNatId, newEntityId, id);

  const updated = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  return { ok: true as const, member: toMember(updated) };
}

export function deleteMember(session: Session, id: string) {
  const db = getDB();
  const r: any = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  if (!r) return { ok: false as const, error: "العضو غير موجود" };
  if (!canWrite(session, r.entityId ?? null)) return { ok: false as const, error: "غير مصرح" };
  db.prepare(`DELETE FROM members WHERE id=?`).run(id);
  return { ok: true as const };
}
