export const dynamic = 'force-dynamic'      
export const revalidate = 0                  

import { NextResponse } from 'next/server'
import { getDB } from '@/lib/server/sqlite'

export async function GET() {
  const db = getDB()
  const entities = (db.prepare('SELECT COUNT(*) AS c FROM entities').get() as any).c ?? 0
  const members  = (db.prepare('SELECT COUNT(*) AS c FROM members').get()  as any).c ?? 0
  const events   = (db.prepare('SELECT COUNT(*) AS c FROM events').get()   as any).c ?? 0
  const iso      = (db.prepare('SELECT COUNT(*) AS c FROM iso').get()      as any).c ?? 0

  return NextResponse.json({ entities, members, events, iso }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' } 
  })
}
