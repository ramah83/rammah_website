// app/api/public/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getDB, uid } from "@/lib/server/sqlite";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 6 * 1024 * 1024;

function ensureUploadDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveFile(file: File, basename: string) {
  if (!ALLOWED_MIME.has(file.type)) throw new Error("نوع الملف غير مسموح (jpeg/png/webp فقط)");
  if (file.size > MAX_BYTES) throw new Error("حجم الصورة كبير (الحد 6MB)");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const dir = ensureUploadDir();
  const filename = `${basename}${ext}`;
  const full = path.join(dir, filename);
  fs.writeFileSync(full, buf);
  return `/data/uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  const db = getDB();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID_FORMDATA" }, { status: 400 });

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const phone = String(form.get("phone") || "").trim() || null;
  const entityId = String(form.get("entityId") || "").trim();

  const idFront = form.get("idFront") as File | null;
  const idBack = form.get("idBack") as File | null;

  if (!name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
  if (!entityId) return NextResponse.json({ error: "يجب اختيار كيان" }, { status: 400 });
  if (!idFront || !idBack) return NextResponse.json({ error: "صورة البطاقة (وجه/ظهر) مطلوبة" }, { status: 400 });

  const ent = db.prepare(`SELECT id, name FROM entities WHERE id=?`).get(entityId) as { id?: string; name?: string } | undefined;
  if (!ent?.id) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });

  let user = db.prepare(`SELECT id, email, name FROM users WHERE lower(email)=?`).get(email) as any;
  if (!user) {
    const newId = uid();
    db.prepare(`
      INSERT INTO users (id, name, email, password, role, interests, entityId, permissions, phone)
      VALUES (?, ?, ?, NULL, 'user', NULL, NULL, NULL, ?)
    `).run(newId, name, email, phone);
    user = { id: newId, name, email };
  } else {
    db.prepare(`UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id=?`).run(name || null, phone || null, user.id);
  }

  const pending = db
    .prepare(
      `
    SELECT id FROM join_requests
    WHERE entityId=? AND lower(userEmail)=? AND status='pending'
    LIMIT 1
  `
    )
    .get(entityId, email);
  if (pending) return NextResponse.json({ ok: true, message: "طلبك قيد المراجعة بالفعل" });

  let frontPath = "",
    backPath = "";
  try {
    const base = `jr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    frontPath = await saveFile(idFront, `${base}_front`);
    backPath = await saveFile(idBack, `${base}_back`);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "فشل حفظ الصور" }, { status: 400 });
  }

  const jrId = uid();
  db.prepare(`
    INSERT INTO join_requests (
      id, userId, userName, userEmail, entityId, entityName, note, status, createdAt, decidedAt, decidedBy,
      idFrontPath, idBackPath
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'pending', datetime('now'), NULL, NULL, ?, ?)
  `).run(jrId, user.id, name, email, ent.id, ent.name, frontPath, backPath);

  return NextResponse.json({ ok: true, requestId: jrId });
}
