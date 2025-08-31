export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getDB } from '@/lib/server/sqlite';

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const patch = await req.json();

  const db = getDB();
  const row: any = db.prepare('SELECT * FROM entities WHERE id=?').get(id);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const updated = {
    ...row,
    ...patch,
    documents: JSON.stringify(
      patch.documents ?? (row.documents ? JSON.parse(row.documents) : [])
    ),
  };

  db.prepare(`
    UPDATE entities SET name=?, type=?, contactEmail=?, phone=?, location=?, documents=?
    WHERE id=?
  `).run(
    updated.name,
    updated.type ?? null,
    updated.contactEmail ?? null,
    updated.phone ?? null,
    updated.location ?? null,
    updated.documents,
    id
  );

  return NextResponse.json({
    ...row,
    ...patch,
    documents: JSON.parse(updated.documents),
  });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const db = getDB();
  db.prepare('DELETE FROM entities WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
