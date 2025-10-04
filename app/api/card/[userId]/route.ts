import { NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // مهم لو هتستخدم Buffer/Node APIs

// GET /api/card/:id  -> يرجّع كارت عضوية PDF
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  try {
    const db = getDB();
    const u = db
      .prepare(
        `SELECT id,name,email,phone,city,nationalId,role,avatar
         FROM users WHERE id = ?`
      )
      .get(id) as any;

    if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // إنشاء PDF بحجم قريب من A6 landscape
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([560, 380]); // عرض × ارتفاع
    const { width, height } = page.getSize();

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // خلفية
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

    // شريط علوي
    page.drawRectangle({
      x: 0,
      y: height - 60,
      width,
      height: 60,
      color: rgb(0.72, 0.60, 0.36), // #B89A5B تقريباً
    });

    page.drawText("بطاقة عضوية — منصة الكيانات الشبابية", {
      x: 40,
      y: height - 42,
      size: 18,
      font: bold,
      color: rgb(1, 1, 1),
    });

    // بيانات
    const startX = 40;
    let y = height - 100;
    const lineGap = 26;

    const drawRow = (label: string, value: string) => {
      page.drawText(`${label}:`, { x: startX, y, size: 13, font, color: rgb(0.42, 0.42, 0.42) });
      page.drawText(value || "—", { x: startX + 85, y, size: 14, font: bold, color: rgb(0.11, 0.11, 0.11) });
      y -= lineGap;
    };

    const roleLabel: Record<string, string> = {
      unionSupervisor: "مسؤول اتحاد الكيانات",
      entityManager: "مسؤول كيان",
      user: "عضو",
    };

    drawRow("الاسم", String(u.name || "—"));
    drawRow("الرقم القومي", String(u.nationalId || "—"));
    drawRow("البريد", String(u.email || "—"));
    drawRow("الهاتف", String(u.phone || "—"));
    drawRow("المدينة", String(u.city || "—"));
    drawRow("الصفة", roleLabel[u.role] || String(u.role || "—"));
    drawRow("رقم العضوية", String(u.id));


const bytes = await pdf.save();
const buffer = Buffer.from(bytes);

return new NextResponse(buffer, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="card-${u.id}.pdf"`,
    "Cache-Control": "no-store",
  },
});
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
