export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import path from "path";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";


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


function safeSegment(s?: string | null) {
  if (!s) return "";
  
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

export async function POST(req: NextRequest) {
  
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "لم تُرسل أي ملفات" }, { status: 400 });
    }

    
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "نوع الملف غير مسموح (صور PNG/JPEG/WEBP أو PDF)" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "حجم الملف كبير (الحد 15MB)" }, { status: 413 });
    }

    
    const baseDir = ensureUploadDir();

    
    const purpose = safeSegment(form?.get("purpose") as string | null);
    const targetDir = purpose ? path.join(baseDir, purpose) : baseDir;
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    
    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const ext = extFromMime(file.type);
    const fileName = `up_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
    const fullPath = path.join(targetDir, fileName);
    fs.writeFileSync(fullPath, buf);

    
    const publicPath = purpose ? `/uploads/${purpose}/${fileName}` : `/uploads/${fileName}`;

    return NextResponse.json(
      {
        ok: true,
        url: publicPath,
        mime: file.type,
        size: file.size,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذّر رفع الملف" }, { status: 500 });
  }
}
