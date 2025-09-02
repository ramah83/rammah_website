export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { listEntities } from "@/lib/server/data-store-server";

export async function GET() {
  return NextResponse.json(listEntities());
}


export async function POST() {
  return NextResponse.json({ error: "إنشاء كيانات جديدة غير مسموح" }, { status: 405 });
}
