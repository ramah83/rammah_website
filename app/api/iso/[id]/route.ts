export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const body = await req.json();
  const next: string | undefined = body?.status;

  const allowed = ["draft", "submitted", "review", "approved", "rejected"];
  if (!next || !allowed.includes(next)) {
    return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
  }

  const db = getDB();
  const row: any = db.prepare("SELECT * FROM iso WHERE id=?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  db.prepare("UPDATE iso SET status=? WHERE id=?").run(next, id);
  const updated: any = db.prepare("SELECT * FROM iso WHERE id=?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const db = getDB();
  db.prepare("DELETE FROM iso WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
