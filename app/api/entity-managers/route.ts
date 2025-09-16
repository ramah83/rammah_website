import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession, ensureRole } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  entityId: string | null;
  role: "entityManager";
  joinedAt: string | null;
  city: string | null;
  avatar: string | null;
};

function tableExists(db: any, name: string): boolean {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name);
  return !!row;
}

export async function GET(req: NextRequest) {
  // يسمح فقط لمسؤول الاتحاد أو مدير الكيان
  const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
  if (guard) return guard;

  const s = await getSession(req);
  const db = getDB();

  // فلتر اختياري ?entityId=
  const paramEntityId = req.nextUrl.searchParams.get("entityId") || null;

  // تقييد السكوب:
  // - entityManager: يرى فقط مديري كيانه (يتجاهل أي entityId آخر)
  // - unionSupervisor: يرى الكل أو حسب الفلتر
  const scopedEntityId =
    s?.role === "entityManager"
      ? String(s?.entityId || "")
      : paramEntityId
      ? String(paramEntityId)
      : "";

  // نحاول نجيب من جدول ربط لو موجود (entity_admins أو entity_managers),
  // وإلا fallback من users (اللي role='entityManager').
  const hasAdmins = tableExists(db, "entity_admins");
  const hasManagers = tableExists(db, "entity_managers");

  let rows: Row[] = [];

  if (hasAdmins) {
    const sql = `
      SELECT
        u.id               AS id,
        u.name             AS name,
        u.email            AS email,
        u.phone            AS phone,
        ea.entityId        AS entityId,
        'entityManager'    AS role,
        COALESCE(ea.assignedAt, u.createdAt) AS joinedAt,
        u.city             AS city,
        u.avatar           AS avatar
      FROM entity_admins ea
      JOIN users u ON u.id = ea.userId
      ${scopedEntityId ? `WHERE ea.entityId = ?` : ``}
    `;
    rows = scopedEntityId ? (db.prepare(sql).all(scopedEntityId) as Row[]) : (db.prepare(sql).all() as Row[]);
  } else if (hasManagers) {
    const sql = `
      SELECT
        u.id               AS id,
        u.name             AS name,
        u.email            AS email,
        u.phone            AS phone,
        em.entityId        AS entityId,
        'entityManager'    AS role,
        COALESCE(em.assignedAt, u.createdAt) AS joinedAt,
        u.city             AS city,
        u.avatar           AS avatar
      FROM entity_managers em
      JOIN users u ON u.id = em.userId
      ${scopedEntityId ? `WHERE em.entityId = ?` : ``}
    `;
    rows = scopedEntityId ? (db.prepare(sql).all(scopedEntityId) as Row[]) : (db.prepare(sql).all() as Row[]);
  } else {
    // Fallback: users به عمود entityId + role='entityManager'
    const sql = `
      SELECT
        u.id               AS id,
        u.name             AS name,
        u.email            AS email,
        u.phone            AS phone,
        ${scopedEntityId ? `?` : `u.entityId`} AS entityId,
        'entityManager'    AS role,
        u.createdAt        AS joinedAt,
        u.city             AS city,
        u.avatar           AS avatar
      FROM users u
      WHERE u.role = 'entityManager'
      ${scopedEntityId ? `AND u.entityId = ?` : ``}
    `;
    if (scopedEntityId) {
      rows = db.prepare(sql).all(scopedEntityId, scopedEntityId) as Row[];
    } else {
      rows = db.prepare(sql).all() as Row[];
    }
  }

  // تأمين إضافي: لو اللي طالب Entity Manager، فلتر كيانه فقط
  if (s?.role === "entityManager") {
    rows = rows.filter(r => String(r.entityId || "") === String(s.entityId || ""));
  }

  // ترتيب بالأحدث
  rows.sort((a, b) => (new Date(b.joinedAt || 0).getTime()) - (new Date(a.joinedAt || 0).getTime()));

  return NextResponse.json(rows);
}
