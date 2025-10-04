// /app/api/membership/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const db = getDB();
  const session = await getSession(req);
  if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role =
    session.role === "unionSupervisor" ? "unionSupervisor" :
    session.role === "entityManager" ? "entityManager" : "user";

  // ---- عضويتي/كياني ----
  let myEntityId: string | null = null;
  let myEntityName: string | null = null;
  let myEntityStatus: string | null = null;

  try {
    const my = db.prepare(`
      SELECT m.entityId, COALESCE(e.name, m.entityId) AS entityName, e.status
      FROM entity_members m
      LEFT JOIN entities e ON e.id = m.entityId
      WHERE m.userId = ?
      ORDER BY m.joinedAt DESC
      LIMIT 1
    `).get(session.id) as any;

    if (my) {
      myEntityId = String(my.entityId);
      myEntityName = String(my.entityName || my.entityId);
      myEntityStatus = my.status ? String(my.status) : null;
    }
  } catch {}

  if (role === "entityManager" && !myEntityId) {
    const row = db.prepare(`
      SELECT e.id, e.name, e.status
      FROM entities e
      WHERE e.managerUserId = ?
      ORDER BY e.createdAt DESC
      LIMIT 1
    `).get(session.id) as any;

    if (row) {
      myEntityId = String(row.id);
      myEntityName = String(row.name || row.id);
      myEntityStatus = row.status ? String(row.status) : null;
    }
  }

  // -------- Timeline: join requests + membership events --------
  const timeline = ((): any[] => {
    try {
      const reqs = db.prepare(`
        SELECT jr.id, jr.userId, jr.entityId, COALESCE(e.name, jr.entityId) AS entityName, jr.status, jr.createdAt, jr.decidedAt, jr.note,
               u.name AS userName
        FROM join_requests jr
        LEFT JOIN entities e ON e.id = jr.entityId
        LEFT JOIN users u ON u.id = jr.userId
        ${role === "unionSupervisor" ? "" :
          role === "entityManager" ? `WHERE jr.entityId = ?` :
          `WHERE jr.userId = ?`
        }
        ORDER BY jr.createdAt DESC
        LIMIT 200
      `).all(role==="unionSupervisor"?[]: [role==="entityManager"? myEntityId : session.id]) as any[];

      const reqEvents = reqs.flatMap((r) => {
        const base = {
          id: `req_${r.id}`,
          userId: String(r.userId),
          userName: r.userName || null,
          entityId: String(r.entityId),
          entityName: String(r.entityName || r.entityId),
          note: r.note ?? null
        };
        const sent = { ...base, type: "join_request" as const, at: r.createdAt, status: r.status };
        const decision = (r.decidedAt && r.status !== "pending")
          ? [{ ...base, id: `req_${r.id}_decision`, type: r.status === "approved" ? "join_approved" as const : "join_rejected" as const, at: r.decidedAt, status: r.status }]
          : [];
        return [sent, ...decision];
      });

      const mem = db.prepare(`
        SELECT me.id, me.userId, u.name AS userName, me.entityId, me.entityName, me.type, me.createdAt
        FROM membership_events me
        LEFT JOIN users u ON u.id = me.userId
        ${role === "unionSupervisor" ? "" :
          role === "entityManager" ? `WHERE me.entityId = ?` :
          `WHERE me.userId = ?`
        }
        ORDER BY me.createdAt DESC
        LIMIT 200
      `).all(role==="unionSupervisor"?[]: [role==="entityManager"? myEntityId : session.id]) as any[];

      const leaveEvents = mem.map(e => ({
        id: `ev_${e.id}`,
        userId: String(e.userId),
        userName: e.userName || null,
        entityId: String(e.entityId),
        entityName: String(e.entityName),
        type: e.type as "left" | "removed",
        at: e.createdAt,
        status: e.type,
        note: null as string | null,
      }));

      return [...reqEvents, ...leaveEvents].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 200);
    } catch { return []; }
  })();

  // -------- Unified module events --------
  const limit = 200;
  type ModEv = { id: string; kind: string; title: string; entityId?: string; entityName?: string; status?: string|null; at: string; actorName?: string|null; reason?: string|null };
  const moduleEvents: ModEv[] = [];

  const whereByEntity = (tableAlias: string, col: string = "entityId") => {
    if (role === "unionSupervisor") return { clause: "", params: [] as any[] };
    return { clause: `WHERE ${tableAlias}.${col} = ?`, params: [myEntityId] as any[] };
  };

  // entity_events
  try {
    const { clause, params } = whereByEntity("ee");
    const rows = db.prepare(`
      SELECT ee.id, ee.entityId, COALESCE(e.name, ee.entityId) AS entityName, ee.action, ee.fromStatus, ee.toStatus, ee.reason,
             ee.actorName, ee.actorRole, ee.createdAt
      FROM entity_events ee
      LEFT JOIN entities e ON e.id = ee.entityId
      ${clause}
      ORDER BY ee.createdAt DESC
      LIMIT ${limit}
    `).all(...params) as any[];

    for (const r of rows) {
      moduleEvents.push({
        id: `entity_${r.id}`,
        kind: "entity_event",
        title: eventActionTitle(r),
        entityId: String(r.entityId),
        entityName: String(r.entityName || r.entityId),
        status: r.toStatus ?? null,
        at: r.createdAt,
        actorName: r.actorName || r.actorRole || null,
        reason: r.reason ?? null,
      });
    }
  } catch {}

  // event_requests
  try {
    const { clause, params } = whereByEntity("er");
    const rows = db.prepare(`
      SELECT er.id, er.entityId, COALESCE(e.name, er.entityId) AS entityName, er.createdAt
      FROM event_requests er
      LEFT JOIN entities e ON e.id = er.entityId
      ${clause}
      ORDER BY er.createdAt DESC
      LIMIT ${limit}
    `).all(...params) as any[];

    for (const r of rows) {
      moduleEvents.push({
        id: `evreq_${r.id}`,
        kind: "event_request",
        title: `طلب فعالية`,
        entityId: String(r.entityId),
        entityName: String(r.entityName || r.entityId),
        at: r.createdAt,
      });
    }
  } catch {}

  // events
  try {
    const { clause, params } = whereByEntity("ev");
    const rows = db.prepare(`
      SELECT ev.id, ev.entityId, COALESCE(en.name, ev.entityId) AS entityName, ev.title, ev.date, ev.status
      FROM events ev
      LEFT JOIN entities en ON en.id = ev.entityId
      ${clause}
      ORDER BY COALESCE(ev.date, ev.rowid) DESC
      LIMIT ${limit}
    `).all(...params) as any[];

    for (const r of rows) {
      moduleEvents.push({
        id: `event_${r.id}`,
        kind: "event",
        title: `فعالية: ${r.title || "بدون عنوان"}`,
        entityId: String(r.entityId),
        entityName: String(r.entityName || r.entityId),
        status: r.status || null,
        at: r.date || new Date().toISOString(),
      });
    }
  } catch {}

  // iso
  try {
    const { clause, params } = role === "unionSupervisor"
      ? { clause: "", params: [] as any[] }
      : { clause: `WHERE i.ownerEntityId = ?`, params: [myEntityId] as any[] };

    const rows = db.prepare(`
      SELECT i.id, i.ownerEntityId AS entityId, COALESCE(e.name, i.ownerEntityId) AS entityName,
             i.title, i.code, i.status, i.updatedAt, i.createdAt
      FROM iso i
      LEFT JOIN entities e ON e.id = i.ownerEntityId
      ${clause}
      ORDER BY COALESCE(i.updatedAt, i.createdAt) DESC
      LIMIT ${limit}
    `).all(...params) as any[];

    for (const r of rows) {
      moduleEvents.push({
        id: `iso_${r.id}`,
        kind: "iso",
        title: `ISO: ${r.title || r.code || r.id}`,
        entityId: String(r.entityId),
        entityName: String(r.entityName || r.entityId),
        status: r.status || null,
        at: r.updatedAt || r.createdAt,
      });
    }
  } catch {}

  // governance
  try {
    const { clause, params } = role === "unionSupervisor"
      ? { clause: "", params: [] as any[] }
      : { clause: `WHERE g.ownerEntityId = ?`, params: [myEntityId] as any[] };

    const rows = db.prepare(`
      SELECT g.id, g.ownerEntityId AS entityId, COALESCE(e.name, g.ownerEntityId) AS entityName,
             g.type, g.title, g.status, g.updatedAt, g.createdAt
      FROM governance g
      LEFT JOIN entities e ON e.id = g.ownerEntityId
      ${clause}
      ORDER BY COALESCE(g.updatedAt, g.createdAt) DESC
      LIMIT ${limit}
    `).all(...params) as any[];

    for (const r of rows) {
      moduleEvents.push({
        id: `gov_${r.id}`,
        kind: "governance",
        title: `حوكمة: ${r.type?.toUpperCase?.()} – ${r.title}`,
        entityId: String(r.entityId),
        entityName: String(r.entityName || r.entityId),
        status: r.status || null,
        at: r.updatedAt || r.createdAt,
      });
    }
  } catch {}

  moduleEvents.sort((a, b) => (a.at < b.at ? 1 : -1));

  // ---- آخر تعليق لو الكيان موقوف ----
  let suspension: { at: string; reason?: string|null; actor?: string|null } | null = null;
  if ((role === "entityManager" || role === "user") && myEntityId && myEntityStatus === "suspended") {
    try {
      const row = db.prepare(`
        SELECT reason, actorName, actorRole, createdAt
        FROM entity_events
        WHERE entityId = ? AND action = 'suspended'
        ORDER BY createdAt DESC
        LIMIT 1
      `).get(myEntityId) as any;
      if (row) {
        suspension = {
          at: row.createdAt,
          reason: row.reason ?? null,
          actor: row.actorName || row.actorRole || null,
        };
      }
    } catch {}
  }

  let review: {
    joinPending?: number;
    eventRequests?: number;
    isoSubs?: number;
    govSubs?: number;
    managerReqs?: number;
    entityReqs?: number;
  } = {};

  try {
    if (role === "unionSupervisor") {
      review = {
        joinPending:   (db.prepare(`SELECT COUNT(*) AS c FROM join_requests WHERE status='pending'`).get() as any).c,
        eventRequests: (db.prepare(`SELECT COUNT(*) AS c FROM event_requests`).get() as any).c,
        isoSubs:       (db.prepare(`SELECT COUNT(*) AS c FROM iso WHERE status IN ('submitted','pending','under_review')`).get() as any).c,
        govSubs:       (db.prepare(`SELECT COUNT(*) AS c FROM governance WHERE status IN ('submitted','pending','under_review')`).get() as any).c,
        managerReqs:   (db.prepare(`SELECT COUNT(*) AS c FROM manager_requests WHERE status='pending'`).get() as any).c,
        entityReqs:    (db.prepare(`SELECT COUNT(*) AS c FROM entity_requests WHERE status='pending'`).get() as any).c,
      };
    } else if (role === "entityManager" && myEntityId) {
      review = {
        joinPending:   (db.prepare(`SELECT COUNT(*) AS c FROM join_requests  WHERE entityId=? AND status='pending'`).get(myEntityId) as any).c,
        eventRequests: (db.prepare(`SELECT COUNT(*) AS c FROM event_requests WHERE entityId=?`).get(myEntityId) as any).c,
        isoSubs:       (db.prepare(`SELECT COUNT(*) AS c FROM iso         WHERE ownerEntityId=? AND status IN ('submitted','pending','under_review')`).get(myEntityId) as any).c,
        govSubs:       (db.prepare(`SELECT COUNT(*) AS c FROM governance  WHERE ownerEntityId=? AND status IN ('submitted','pending','under_review')`).get(myEntityId) as any).c,
        managerReqs:   (db.prepare(`SELECT COUNT(*) AS c FROM manager_requests WHERE entityId=? AND status='pending'`).get(myEntityId) as any).c,
        entityReqs:    0,
      };
    } else {
      review = {};
    }
  } catch {
    review = {};
  }

  const activity: {
    recentJoins?: any[];
    recentLeaves?: any[];
  } = {};

  // ------------- Leave Flows (سير طلبات الخروج) -------------
  let scopeClause = "";
  const scopeParams: any[] = [];
  if (role === "unionSupervisor") {
    scopeClause = "";
  } else if (role === "entityManager" && myEntityId) {
    scopeClause = "AND r.targetEntityId = ?";
    scopeParams.push(myEntityId);
  } else {
    scopeClause = "AND (r.createdBy = ? OR json_extract(r.payload,'$.userId') = ?)";
    scopeParams.push(session.id, session.id);
  }

  const reqRows = db.prepare(`
    SELECT
      r.id            AS requestId,
      r.status        AS status,
      r.note          AS note,
      r.approverRole  AS approverRole,
      r.createdAt     AS createdAt,
      r.decidedAt     AS decidedAt,
      r.decidedBy     AS decidedBy,
      r.targetEntityId AS entityId,
      e.name          AS entityName,
      COALESCE(json_extract(r.payload,'$.userId'), r.createdBy) AS userId,
      u.name          AS userName,
      u.email         AS userEmail
    FROM entity_requests r
    LEFT JOIN entities e ON e.id = r.targetEntityId
    LEFT JOIN users    u ON u.id = COALESCE(json_extract(r.payload,'$.userId'), r.createdBy)
    WHERE r.action = 'leave_membership'
      ${scopeClause}
    ORDER BY datetime(r.createdAt) ASC
  `).all(...scopeParams) as any[];

  const leftRows = db.prepare(`
    SELECT userId, entityId, createdAt
    FROM membership_events
    WHERE type = 'left'
  `).all() as any[];

  const leftMap = new Map<string,string>();
  for (const r of leftRows) {
    if (!r?.userId || !r?.entityId) continue;
    leftMap.set(`${r.entityId}:${r.userId}`, String(r.createdAt));
  }

  type LeaveFlowStep = {
    requestId: string;
    stage: "requested" | "manager_approved" | "manager_rejected" | "escalated" | "supervisor_approved" | "supervisor_rejected" | "left";
    approverRole?: "entityManager" | "unionSupervisor" | null;
    status: "pending" | "approved" | "rejected" | "done";
    note?: string | null;
    decidedBy?: string | null;
    decidedAt?: string | null;
    createdAt: string;
  };
  type LeaveFlow = {
    key: string;
    entityId: string;
    entityName?: string | null;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    steps: LeaveFlowStep[];
    finalLeftAt?: string | null;
  };

  const flowsMap = new Map<string, LeaveFlow>();

  for (const r of reqRows) {
    const entityId = String(r.entityId || "");
    const userId   = String(r.userId || "");
    if (!entityId || !userId) continue;

    const key = `${entityId}:${userId}`;
    if (!flowsMap.has(key)) {
      flowsMap.set(key, {
        key,
        entityId,
        entityName: r.entityName || null,
        userId,
        userName: r.userName || null,
        userEmail: r.userEmail || null,
        steps: [],
        finalLeftAt: leftMap.get(key) || null,
      });
    }
    const flow = flowsMap.get(key)!;

    let stage: LeaveFlowStep["stage"] = "requested";
    if (r.approverRole === "entityManager") {
      if (r.status === "approved") stage = "manager_approved";
      else if (r.status === "rejected") stage = "manager_rejected";
      else stage = "requested";
    } else {
      if (r.status === "approved") stage = "supervisor_approved";
      else if (r.status === "rejected") stage = "supervisor_rejected";
      else stage = "escalated";
    }

    flow.steps.push({
      requestId: String(r.requestId),
      stage,
      approverRole: r.approverRole,
      status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
      note: r.note ?? null,
      decidedBy: r.decidedBy ?? null,
      decidedAt: r.decidedAt ?? null,
      createdAt: r.createdAt,
    });

    if (flow.finalLeftAt && !flow.steps.find(s => s.stage === "left")) {
      flow.steps.push({
        requestId: String(r.requestId),
        stage: "left",
        approverRole: null,
        status: "done",
        note: null,
        decidedBy: null,
        decidedAt: flow.finalLeftAt,
        createdAt: flow.finalLeftAt,
      });
    }
  }

  const leaveFlows = Array.from(flowsMap.values()).map(f => ({
    ...f,
    steps: f.steps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }));

  // ------------- Join Flows (سير طلبات الانضمام) -------------
  let joinScopeClause = "";
  const joinScopeParams: any[] = [];
  if (role === "unionSupervisor") {
    joinScopeClause = "";
  } else if (role === "entityManager" && myEntityId) {
    joinScopeClause = "AND jr.entityId = ?";
    joinScopeParams.push(myEntityId);
  } else {
    joinScopeClause = "AND jr.userId = ?";
    joinScopeParams.push(session.id);
  }

  const joinReqRows = db.prepare(`
    SELECT
      jr.id           AS requestId,
      jr.status       AS status,
      jr.note         AS note,
      jr.createdAt    AS createdAt,
      jr.decidedAt    AS decidedAt,
      jr.decidedBy    AS decidedBy,
      jr.entityId     AS entityId,
      e.name          AS entityName,
      e.managerUserId AS managerUserId,
      jr.userId       AS userId,
      u.name          AS userName,
      u.email         AS userEmail
    FROM join_requests jr
    LEFT JOIN entities e ON e.id = jr.entityId
    LEFT JOIN users    u ON u.id = jr.userId
    WHERE 1=1
      ${joinScopeClause}
    ORDER BY datetime(jr.createdAt) ASC
  `).all(...joinScopeParams) as any[];

  const joinedRows = db.prepare(`
    SELECT userId, entityId, createdAt
    FROM membership_events
    WHERE type = 'joined'
  `).all() as any[];

  const joinedMap = new Map<string,string>();
  for (const r of joinedRows) {
    if (!r?.userId || !r?.entityId) continue;
    joinedMap.set(`${r.entityId}:${r.userId}`, String(r.createdAt));
  }

  type JoinFlowStep = {
    requestId: string;
    stage: "join_requested" | "manager_approved" | "manager_rejected" | "unionSupervisor_approved" | "unionSupervisor_rejected" | "joined";
    status: "pending" | "approved" | "rejected" | "done";
    note?: string | null;
    decidedBy?: string | null;
    decidedAt?: string | null;
    createdAt: string;
  };
  type JoinFlow = {
    key: string;
    entityId: string;
    entityName?: string | null;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    steps: JoinFlowStep[];
    finalJoinedAt?: string | null;
  };

  const joinFlowsMap = new Map<string, JoinFlow>();

  for (const r of joinReqRows) {
    const entityId = String(r.entityId || "");
    const userId   = String(r.userId || "");
    if (!entityId || !userId) continue;

    const key = `${entityId}:${userId}`;
    if (!joinFlowsMap.has(key)) {
      joinFlowsMap.set(key, {
        key,
        entityId,
        entityName: r.entityName || null,
        userId,
        userName: r.userName || null,
        userEmail: r.userEmail || null,
        steps: [],
        finalJoinedAt: joinedMap.get(key) || null,
      });
    }
    const flow = joinFlowsMap.get(key)!;

    const hasManager = !!r.managerUserId;

    let stage: JoinFlowStep["stage"] = "join_requested";
    if (r.status === "approved") {
      stage = hasManager ? "manager_approved" : "unionSupervisor_approved";
    } else if (r.status === "rejected") {
      stage = hasManager ? "manager_rejected" : "unionSupervisor_rejected";
    } else {
      stage = "join_requested";
    }

    flow.steps.push({
      requestId: String(r.requestId),
      stage,
      status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
      note: r.note ?? null,
      decidedBy: r.decidedBy ?? null,
      decidedAt: r.decidedAt ?? null,
      createdAt: r.createdAt,
    });

    if (flow.finalJoinedAt && !flow.steps.find(s => s.stage === "joined")) {
      flow.steps.push({
        requestId: String(r.requestId),
        stage: "joined",
        status: "done",
        note: null,
        decidedBy: null,
        decidedAt: flow.finalJoinedAt,
        createdAt: flow.finalJoinedAt,
      });
    }
  }

  const joinFlows = Array.from(joinFlowsMap.values()).map(f => ({
    ...f,
    steps: f.steps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }));

  // ---------- تقديم (كروت جاهزة للعرض) لرحلات الخروج/الانضمام ----------
  const statusLabel = (s: "pending"|"approved"|"rejected"|"done") =>
    s === "pending" ? "قيد المراجعة" : s === "approved" ? "مقبول" : s === "rejected" ? "مرفوض" : "تم التنفيذ";

  const presentLeave = leaveFlows.map(f => {
    // مراحل مرتبة كما في الشكل المطلوب
    const requested   = f.steps.find(s => s.stage === "requested");
    const mApproved   = f.steps.find(s => s.stage === "manager_approved");
    const mRejected   = f.steps.find(s => s.stage === "manager_rejected");
    const escalated   = f.steps.find(s => s.stage === "escalated");
    const sApproved   = f.steps.find(s => s.stage === "supervisor_approved");
    const sRejected   = f.steps.find(s => s.stage === "supervisor_rejected");
    const left        = f.steps.find(s => s.stage === "left");

    const managerStep = mApproved || mRejected || (requested ? { ...requested, status: "pending" as const } : undefined);
    const superStep   = sApproved || sRejected || (escalated ? { ...escalated, status: "pending" as const } : undefined);

    return {
      key: f.key,
      userId: f.userId,
      userName: f.userName,
      userEmail: f.userEmail,
      entityId: f.entityId,
      entityName: f.entityName,
      // العناوين + التفاصيل
      title: "طلبات الخروج وسير المراجعة",
      subtitle: "رحلة طلب الخروج الخاص بك حتى التنفيذ النهائي.",
      stages: [
        requested && {
          stageKey: "request",
          title: "طلب خروج",
          startedAt: requested.createdAt,
          lastActionAt: requested.decidedAt || requested.createdAt,
          by: requested.decidedBy || null,
          status: requested.status,
          statusLabel: statusLabel(requested.status),
        },
        managerStep && {
          stageKey: "manager",
          title: "قرار مدير الكيان",
          startedAt: requested?.createdAt || managerStep.createdAt,
          lastActionAt: managerStep.decidedAt || managerStep.createdAt,
          by: managerStep.decidedBy || null,
          status: managerStep.status,
          statusLabel: statusLabel(managerStep.status),
        },
        superStep && {
          stageKey: "supervisor",
          title: "قرار مسؤول الاتحاد",
          startedAt: (escalated?.createdAt || managerStep?.decidedAt || managerStep?.createdAt || requested?.createdAt) || superStep.createdAt,
          lastActionAt: superStep.decidedAt || superStep.createdAt,
          by: superStep.decidedBy || null,
          status: superStep.status,
          statusLabel: statusLabel(superStep.status),
        },
        left && {
          stageKey: "execute",
          title: "تنفيذ الخروج",
          startedAt: left.createdAt,
          lastActionAt: left.decidedAt || left.createdAt,
          by: null,
          status: "done" as const,
          statusLabel: statusLabel("done"),
        },
      ].filter(Boolean),
      // ملخص نهائي أعلى الكارت
      finalNote: left ? `تم الخروج نهائيًا في ${left.decidedAt || left.createdAt}` : null,
    };
  });

  const presentJoin = joinFlows.map(f => {
    // ملاحظة: الانضمام عندك بقرار واحد فقط (مدير الكيان إن وُجد، وإلا مسؤول الاتحاد)
    const requested = f.steps.find(s => s.stage === "join_requested");
    const mApproved = f.steps.find(s => s.stage === "manager_approved");
    const mRejected = f.steps.find(s => s.stage === "manager_rejected");
    const sApproved = f.steps.find(s => s.stage === "unionSupervisor_approved");
    const sRejected = f.steps.find(s => s.stage === "unionSupervisor_rejected");
    const joined    = f.steps.find(s => s.stage === "joined");

    const decision  = mApproved || mRejected || sApproved || sRejected || (requested ? { ...requested, status: "pending" as const } : undefined);
    const decisionIsManager   = !!(mApproved || mRejected);
    const decisionIsSupervisor= !!(sApproved || sRejected);

    return {
      key: f.key,
      userId: f.userId,
      userName: f.userName,
      userEmail: f.userEmail,
      entityId: f.entityId,
      entityName: f.entityName,
      title: "طلبات الانضمام وسير المراجعة",
      subtitle: "رحلة طلب الانضمام الخاص بك حتى التنفيذ النهائي.",
      stages: [
        requested && {
          stageKey: "request",
          title: "طلب انضمام",
          startedAt: requested.createdAt,
          lastActionAt: requested.decidedAt || requested.createdAt,
          by: requested.decidedBy || null,
          status: requested.status,
          statusLabel: statusLabel(requested.status),
        },
        decision && {
          stageKey: "decision",
          title: decisionIsManager ? "قرار مدير الكيان" : (decisionIsSupervisor ? "قرار مسؤول الاتحاد" : "قرار الجهة المسؤولة"),
          startedAt: requested?.createdAt || decision.createdAt,
          lastActionAt: decision.decidedAt || decision.createdAt,
          by: decision.decidedBy || null,
          status: decision.status,
          statusLabel: statusLabel(decision.status),
        },
        joined && {
          stageKey: "execute",
          title: "تنفيذ الانضمام",
          startedAt: joined.createdAt,
          lastActionAt: joined.decidedAt || joined.createdAt,
          by: null,
          status: "done" as const,
          statusLabel: statusLabel("done"),
        },
      ].filter(Boolean),
      finalNote: joined ? `تم الانضمام نهائيًا في ${joined.decidedAt || joined.createdAt}` : null,
    };
  });

  // ——— الإرجاع ———
  return NextResponse.json({
    ok: true,
    role,
    timeline,
    entityEvents: moduleEvents
      .filter(m => m.kind === "entity_event")
      .map(m => ({ id: m.id, entityId: m.entityId, action: m.title, createdAt: m.at, actorName: m.actorName, reason: m.reason })),
    moduleEvents,
    suspension,
    current: { entityId: myEntityId, entityName: myEntityName, status: myEntityStatus },
    review,
    activity,
    // الداتا الخام كما هي
    leaveFlows,
    joinFlows,
    // 👇 كروت جاهزة بنفس ستايل عرضك
    leaveFlowCards: presentLeave,
    joinFlowCards: presentJoin,
  });
}

function eventActionTitle(r: any) {
  switch (String(r.action)) {
    case "suspended": return "تعليق الكيان";
    case "resumed": return "استئناف الكيان";
    case "status_changed": return `تغيير حالة: ${r.fromStatus || "?"} → ${r.toStatus || "?"}`;
    case "updated": return "تحديث بيانات الكيان";
    case "deleted": return "حذف الكيان";
    case "created": return "إنشاء الكيان";
    case "suspend_requested": return "طلب تعليق";
    case "resume_requested": return "طلب استئناف";
    case "status_change_requested": return `طلب تغيير حالة: ${r.fromStatus || "?"} → ${r.toStatus || "?"}`;
    case "update_requested": return "طلب تحديث بيانات";
    case "create_requested": return "طلب إنشاء كيان";
    case "delete_requested": return "طلب حذف كيان";
    default: return `حدث: ${r.action}`;
  }
}
