import { NextResponse } from "next/server"
import { seedIfEmpty } from "@/lib/server/data-store-server"

export async function GET() {
  seedIfEmpty()                    
  return NextResponse.json({ ok: true })
}
