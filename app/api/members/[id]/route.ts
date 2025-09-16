export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession, ensureRole } from "@/lib/server/session";

function toNullEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (!s || !s.includes("@") || s.length < 5) return null;
  return s;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
  if (guard) return guard;

  const s = await getSession(req);
  const db = getDB();
  const id = params.id;

  const original = db.prepare(`SELECT * FROM members WHERE id=?`).get(id) as any;
  if (!original) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });

  if (s?.role === "entityManager" && String(original.entityId || "") !== String(s.entityId || ""))
    return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });

  let b: any = {};
  try { b = await req.json(); } catch {}

  const name = b?.name != null ? String(b.name).trim() : original.name;
  const email = b?.email === null ? null : b?.email != null ? toNullEmail(b.email) : original.email;
  const phone = b?.phone === null ? null : b?.phone != null ? String(b.phone).trim() : original.phone;
  const nationalId = b?.nationalId === null ? null : b?.nationalId != null ? String(b.nationalId).trim() : original.nationalId;
  const entityId = b?.entityId != null ? String(b.entityId).trim() : String(original.entityId || "");
  const city = b?.city != null ? String(b.city).trim() : null;

  if (!name) return NextResponse.json({ error: "name مطلوب" }, { status: 400 });
  if (nationalId && !/^\d{14}$/.test(nationalId)) return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });

  if (nationalId) {
    const dup = db.prepare(`SELECT 1 FROM members WHERE id<>? AND entityId=? AND nationalId=? LIMIT 1`).get(id, entityId, nationalId);
    if (dup) return NextResponse.json({ error: "يوجد عضو بنفس الرقم القومي داخل هذا الكيان" }, { status: 409 });
  }

  db.prepare(`UPDATE members SET name=?, email=?, phone=?, entityId=?, nationalId=? WHERE id=?`).run(name, email, phone, entityId, nationalId, id);

  if (city || phone) {
    const byNid = nationalId || original.nationalId;
    const byEmail = (email || original.email || "") as string;
    if (byNid) {
      db.prepare(`UPDATE users SET city=COALESCE(?, city), phone=COALESCE(?, phone) WHERE nationalId=?`).run(city, phone, byNid);
    } else if (byEmail) {
      db.prepare(`UPDATE users SET city=COALESCE(?, city), phone=COALESCE(?, phone) WHERE lower(email)=lower(?)`).run(city, phone, byEmail);
    }
  }

  const row = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  return NextResponse.json(row || {});
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
  if (guard) return guard;

  const s = await getSession(req);
  const db = getDB();
  const id = params.id;

  const original = db.prepare(`SELECT * FROM members WHERE id=?`).get(id) as any;
  if (!original) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });

  if (s?.role === "entityManager" && String(original.entityId || "") !== String(s.entityId || ""))
    return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });

  const userRow =
    (original?.nationalId && db.prepare(`SELECT * FROM users WHERE nationalId=?`).get(original.nationalId)) ||
    (original?.email && db.prepare(`SELECT * FROM users WHERE email=?`).get(String(original.email).toLowerCase())) ||
    null;

  if (userRow?.id) db.prepare(`DELETE FROM entity_members WHERE userId=?`).run(userRow.id);

  db.prepare(`DELETE FROM members WHERE id=?`).run(id);
  return NextResponse.json({ ok: true });
}
