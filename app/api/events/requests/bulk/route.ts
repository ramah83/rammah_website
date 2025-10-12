// /app/api/events/requests/bulk/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function POST(req: NextRequest){
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error:"غير مصرح" },{ status:401 });

  let body:any={};
  try{ body = await req.json(); }catch{}
  const rows:any[] = Array.isArray(body?.rows)? body.rows : [];
  if (!rows.length) return NextResponse.json({ error:"لا توجد صفوف" },{ status:400 });

  const db = getDB();
  const results:any[] = [];

  const tx = (db as any).transaction((items:any[])=>{
    for (let i=0;i<items.length;i++){
      const r = items[i];
      try{
        const title = String(r.name||r.title||"").trim();
        if (!title) throw new Error("الاسم مطلوب");
        const date  = r.date ? String(r.date) : null;
        const entityId = r.public ? null : (r.entityId ? String(r.entityId) : (s.role==="entityManager" ? String(s.entityId||"") : null));
        const id = uid();
        const createdBy = String(s.id);
        const createdByName = String(s.name||s.email||"مستخدم");
        const createdByRole = s.role;
        const payload = {
          name: title,
          date,
          attendeesTarget: Number(r.attendeesTarget||0),
          venue: r.venue||"",
          goals: r.goals||"",
          audience: r.audience||"",
          speakers: r.speakers||"",
          supportType: r.supportType||"",
          files: Array.isArray(r.files)? r.files.filter(Boolean) : []
        };

        db.prepare(`
          INSERT INTO events (id,title,date,status,entityId,createdBy,createdByName,createdByRole,createdAt)
          VALUES (?,?,?,?,?,?,?,?,datetime('now'))
        `).run(id, title, date, "requested", entityId, createdBy, createdByName, createdByRole);

        db.prepare(`
          INSERT INTO event_requests (id,eventId,payload,createdAt)
          VALUES (?,?,?,datetime('now'))
        `).run(uid(), id, JSON.stringify(payload));

        results.push({ index:i, ok:true, id });
      }catch(e:any){
        results.push({ index:i, ok:false, error:e?.message||"خطأ غير معروف" });
      }
    }
  });
  tx(rows);

  return NextResponse.json({ ok:true, results });
}
