export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";

// Initialize contact_messages table
function ensureTable() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      createdAt TEXT NOT NULL,
      respondedAt TEXT,
      respondedBy TEXT,
      response TEXT
    )
  `);
}

// GET: Fetch all contact messages (for admins/managers)
export async function GET(req: NextRequest) {
  try {
    ensureTable();
    const db = getDB();
    
    // Check session
    const sessionHeader = req.headers.get("x-session-b64") || "";
    let session: any = null;
    
    if (sessionHeader) {
      try {
        const decoded = Buffer.from(sessionHeader, "base64").toString("utf-8");
        session = JSON.parse(decoded);
      } catch {}
    }

    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const myMessages = searchParams.get("myMessages") === "true";
    const email = searchParams.get("email");
    const status = searchParams.get("status") || "all";

    let query = "SELECT * FROM contact_messages";
    const params: any[] = [];
    const conditions: string[] = [];

    // If regular user, only show their messages
    if (session.role === "user" || myMessages) {
      if (!email) {
        return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
      }
      conditions.push("email = ?");
      params.push(email);
    } else if (!["unionSupervisor", "entityManager"].includes(session.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Add status filter for admins
    if (status !== "all" && ["unionSupervisor", "entityManager"].includes(session.role)) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY createdAt DESC LIMIT 200";

    const messages = db.prepare(query).all(...params);

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a new contact message
export async function POST(req: NextRequest) {
  try {
    ensureTable();
    const db = getDB();
    
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const id = uid();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO contact_messages (id, name, email, subject, message, status, createdAt)
      VALUES (?, ?, ?, ?, ?, 'unread', ?)
    `).run(id, name, email, subject, message, createdAt);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update message status or add response
export async function PATCH(req: NextRequest) {
  try {
    ensureTable();
    const db = getDB();
    
    // Check session
    const sessionHeader = req.headers.get("x-session-b64") || "";
    let session: any = null;
    
    if (sessionHeader) {
      try {
        const decoded = Buffer.from(sessionHeader, "base64").toString("utf-8");
        session = JSON.parse(decoded);
      } catch {}
    }

    if (!session || !["unionSupervisor", "entityManager"].includes(session.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, response } = body;

    if (!id) {
      return NextResponse.json({ error: "معرف الرسالة مطلوب" }, { status: 400 });
    }

    if (status) {
      db.prepare("UPDATE contact_messages SET status = ? WHERE id = ?").run(status, id);
    }

    if (response) {
      // Get the original message details
      const message: any = db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(id);
      
      if (!message) {
        return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
      }

      const respondedAt = new Date().toISOString();
      db.prepare(`
        UPDATE contact_messages 
        SET response = ?, respondedAt = ?, respondedBy = ?, status = 'responded'
        WHERE id = ?
      `).run(response, respondedAt, session.id, id);

      // Send email notification to the user
      try {
        const { sendEmail, createContactResponseEmail } = await import("@/lib/server/email");
        
        const emailContent = createContactResponseEmail({
          userName: message.name,
          userEmail: message.email,
          originalSubject: message.subject,
          originalMessage: message.message,
          response: response,
          responderName: session.name || "فريق الدعم",
        });

        await sendEmail({
          to: message.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
