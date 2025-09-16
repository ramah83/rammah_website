export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import path from "path";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 15 * 1024 * 1024; 

function ensureUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extFromMime(mt: string) {
  if (mt === "application/pdf") return ".pdf";
  if (mt === "image/png") return ".png";
  if (mt === "image/webp") return ".webp";
  return ".jpg"; 
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch(() => null);
    const f = form?.get("file") as File | null;
    if (!f) {
      return NextResponse.json({ error: "لم تُرسل أي ملفات" }, { status: 400 });
    }

    if (!ALLOWED.has(f.type)) {
      return NextResponse.json({ error: "نوع الملف غير مسموح (صور/PDF)" }, { status: 415 });
    }

    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "حجم الملف كبير (الحد 15MB)" }, { status: 413 });
    }

    const buf = Buffer.from(await f.arrayBuffer());
    const dir = ensureUploadDir();
    const filename = `up_${Date.now()}_${Math.random().toString(16).slice(2)}${extFromMime(f.type)}`;
    const full = path.join(dir, filename);
    fs.writeFileSync(full, buf);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر رفع الملف" }, { status: 500 });
  }
}
