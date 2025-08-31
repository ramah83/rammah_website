export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { listISO, addISO } from "@/lib/server/data-store-server";

export async function GET() {
  return NextResponse.json(listISO());
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.code || !b?.title || !b?.ownerEntityId) {
    return NextResponse.json(
      { error: "code/title/ownerEntityId مطلوبين" },
      { status: 400 }
    );
  }

  const item = addISO({
    code: String(b.code),
    title: String(b.title),
    status: (b.status ?? "draft") as "draft" | "submitted" | "review" | "approved" | "rejected",
    ownerEntityId: String(b.ownerEntityId),
  });

  return NextResponse.json(item, { status: 201 });
}
