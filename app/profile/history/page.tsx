"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Cairo } from "next/font/google";
import type { Session } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users, Clock, CheckCircle2, XCircle, LogOut, UserMinus, ArrowRight,
  PauseCircle, PlayCircle, RefreshCw, Edit2, Trash2, FileText, PlusCircle,
  Layers, ShieldCheck, UserCheck
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700", "800"] });

const COLORS = {
  text: "#1D1D1D", muted: "#6B6B6B", bg: "#EFE6DE",
  card: "#FFFFFF", border: "#E7E2DC", line: "#E3E3E3",
  soft: "#F6F6F6", primary: "#EC1A24",
};

type TimelineItem =
  | {
      type: "join_request" | "join_approved" | "join_rejected";
      id: string; userId: string; userName?: string | null;
      entityId: string; entityName: string; at: string; status: string; note: string | null;
    }
  | {
      type: "left" | "removed";
      id: string; userId: string; userName?: string | null;
      entityId: string; entityName: string; at: string; status: string; note: string | null;
    };

type MembershipMy = { entityId?: string | null; entityName?: string | null; status?: string | null };

type EntityEvent = {
  id: string; entityId: string; action: string; fromStatus?: string | null; toStatus?: string | null;
  reason?: string | null; actorId?: string | null; actorName?: string | null; actorRole?: string | null; createdAt: string;
};

type ReviewPayload = {
  joinPending?: any[];
  eventRequests?: any[];
  isoSubs?: any[];
  govSubs?: any[];
  managerReqs?: any[];
  entityReqs?: any[];
};
type ActivityPayload = {
  recentJoins?: any[];
  recentLeaves?: any[];
};

type ModuleEvent = {
  id: string;
  kind: "entity_event" | "event_request" | "event" | "iso" | "governance";
  title: string;
  entityId?: string;
  entityName?: string;
  status?: string | null;
  at: string;
  actorName?: string | null;
  reason?: string | null;
};

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

/* ==== Join Flow Types (جديدة) ==== */
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

type HistoryAPIResponse = {
  timeline?: TimelineItem[];
  current?: MembershipMy | null;
  entityEvents?: EntityEvent[];
  review?: ReviewPayload;
  activity?: ActivityPayload;
  moduleEvents?: ModuleEvent[];
  suspension?: { at: string; reason?: string | null; actor?: string | null } | null;
  leaveFlows?: LeaveFlow[];
  joinFlows?: JoinFlow[]; // 👈 مهم
};

function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
  } catch { return ""; }
}
function withSession(init: RequestInit = {}): RequestInit {
  const h = new Headers(init.headers || {});
  const s = sessionHeaderB64();
  if (s) h.set("x-session-b64", s);
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData)) h.set("Content-Type", "application/json");
  return { ...init, headers: h, credentials: "include", cache: "no-store" };
}

export default function HistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<MembershipMy | null>(null);

  const [myEntityId, setMyEntityId] = useState<string | null>(null);
  const [myEntityName, setMyEntityName] = useState<string | null>(null);
  const [myEntityStatus, setMyEntityStatus] = useState<string | null>(null);

  const [events, setEvents] = useState<EntityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [review, setReview] = useState<ReviewPayload>({});
  const [activity, setActivity] = useState<ActivityPayload>({});
  const [moduleEvents, setModuleEvents] = useState<ModuleEvent[]>([]);
  const [suspension, setSuspension] = useState<{ at: string; reason?: string | null; actor?: string | null } | null>(null);

  // أسماء المستخدمين
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());

  // ملخص أرقام (مع fallback)
  const [summary, setSummary] = useState<{ joinPending: number; eventRequests: number; isoSubs: number; govSubs: number; managerReqs: number; entityReqs: number; }>
    ({ joinPending: 0, eventRequests: 0, isoSubs: 0, govSubs: 0, managerReqs: 0, entityReqs: 0 });

  // Flows
  const [leaveFlows, setLeaveFlows] = useState<LeaveFlow[]>([]);
  const [joinFlows, setJoinFlows] = useState<JoinFlow[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.replace("/"); return; }
      setSession(JSON.parse(s));
    } catch { router.replace("/"); }
  }, [router]);

  // history bundle
  useEffect(() => {
    if (!session?.id) return;
    setLoading(true);
    setFlowsLoading(true);
    fetch(`/api/membership/history`, withSession())
      .then(r => r.json())
      .then((res: HistoryAPIResponse) => {
        setTimeline(Array.isArray(res?.timeline) ? res.timeline : []);
        setCurrent(res?.current ?? null);
        setEvents(Array.isArray(res?.entityEvents) ? res.entityEvents : []);
        setReview(res?.review ?? {});
        setActivity(res?.activity ?? {});
        setModuleEvents(Array.isArray(res?.moduleEvents) ? res.moduleEvents : []);
        setSuspension(res?.suspension ?? null);
        setLeaveFlows(Array.isArray(res?.leaveFlows) ? res.leaveFlows : []);
        setJoinFlows(Array.isArray(res?.joinFlows) ? res.joinFlows : []);

        if (res?.current?.entityId) {
          setMyEntityId(res.current.entityId!);
          setMyEntityName(res.current.entityName || null);
          setMyEntityStatus(res.current.status || null);
        } else {
          setMyEntityId(null); setMyEntityName(null); setMyEntityStatus(null);
        }
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setFlowsLoading(false); });
  }, [session?.id]);

  // ملخص المنصّة: احسب محليًا، ولو فاضي هات /summary
  useEffect(() => {
    const getCount = (v: unknown): number => {
      if (Array.isArray(v)) return v.length;
      const n = Number(v as any);
      return Number.isFinite(n) ? n : 0;
    };
    const local = {
      joinPending: getCount((review as any)?.joinPending),
      eventRequests: getCount((review as any)?.eventRequests),
      isoSubs: getCount((review as any)?.isoSubs),
      govSubs: getCount((review as any)?.govSubs),
      managerReqs: getCount((review as any)?.managerReqs),
      entityReqs: getCount((review as any)?.entityReqs),
    };
    setSummary(local);

    const hasAnyKey = ["joinPending","eventRequests","isoSubs","govSubs","managerReqs","entityReqs"]
      .some(k => (review as any)?.[k] != null);

    if (!hasAnyKey) {
      fetch(`/api/membership/summary`, withSession())
        .then(r => r.ok ? r.json() : null)
        .then((s) => {
          if (!s) return;
          setSummary({
            joinPending: getCount(s.joinPending),
            eventRequests: getCount(s.eventRequests),
            isoSubs: getCount(s.isoSubs),
            govSubs: getCount(s.govSubs),
            managerReqs: getCount(s.managerReqs),
            entityReqs: getCount(s.entityReqs),
          });
        })
        .catch(() => {});
    }
  }, [review]);

  // Lookup أسماء المستخدمين (timeline + flows + activity + decidedBy داخل الخطوات)
  useEffect(() => {
    const getId = (r: any) => r?.userId || r?.memberId || r?.user || r?.id || "";
    const missing = new Set<string>();

    // من الخط الزمني
    for (const it of timeline) {
      const id = it.userId;
      if (id && !it.userName && !usersMap.has(id)) missing.add(String(id));
    }

    // من تدفقات الخروج: userId + decidedBy داخل الخطوات
    for (const f of leaveFlows) {
      if (f.userId && !f.userName && !usersMap.has(f.userId)) missing.add(f.userId);
      for (const s of f.steps) {
        if (s.decidedBy && !usersMap.has(String(s.decidedBy))) missing.add(String(s.decidedBy));
      }
    }

    // من تدفقات الانضمام: userId + decidedBy داخل الخطوات
    for (const f of joinFlows) {
      if (f.userId && !f.userName && !usersMap.has(f.userId)) missing.add(f.userId);
      for (const s of f.steps) {
        if (s.decidedBy && !usersMap.has(String(s.decidedBy))) missing.add(String(s.decidedBy));
      }
    }

    // من النشاط
    for (const r of activity.recentJoins || []) {
      const id = getId(r);
      if (id && !r.userName && !usersMap.has(String(id))) missing.add(String(id));
    }
    for (const r of activity.recentLeaves || []) {
      const id = getId(r);
      if (id && !r.userName && !usersMap.has(String(id))) missing.add(String(id));
    }

    const ids = Array.from(missing);
    if (ids.length === 0) return;

    (async () => {
      const map = new Map(usersMap);
      const tryEndpoints = async () => {
        try { const res = await fetch(`/api/users?ids=${encodeURIComponent(ids.join(","))}`, withSession()); if (res.ok) return await res.json(); } catch {}
        try { const res = await fetch(`/api/users/bulk`, withSession({ method: "POST", body: JSON.stringify({ ids }) })); if (res.ok) return await res.json(); } catch {}
        try { const res = await fetch(`/api/users`, withSession({ method: "POST", body: JSON.stringify({ ids }) })); if (res.ok) return await res.json(); } catch {}
        return null;
      };
      const data = await tryEndpoints();
      if (data) {
        if (Array.isArray((data as any).users)) {
          for (const u of (data as any).users) if (u?.id && u?.name) map.set(String(u.id), String(u.name));
        } else {
          for (const k of Object.keys(data)) {
            const v = (data as any)[k];
            if (typeof v === "string") map.set(k, v);
          }
        }
        setUsersMap(map);
      }
    })();
  }, [timeline, activity.recentJoins, activity.recentLeaves, leaveFlows, joinFlows, usersMap]);

  // fallback: entity events
  useEffect(() => {
    if (!myEntityId) { setEvents([]); return; }
    if (events?.length) return;
    setEventsLoading(true);
    (async () => {
      try {
        let res = await fetch(`/api/entities/${myEntityId}/events?limit=100`, { cache: "no-store" });
        if (!res.ok) res = await fetch(`/api/entities/${myEntityId}?events=1&limit=100`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setEvents(Array.isArray(data?.events) ? data.events : []);
      } catch { setEvents([]); }
      finally { setEventsLoading(false); }
    })();
  }, [myEntityId, events?.length]);

  const prettyEntityName = useMemo(
    () => myEntityName || current?.entityName || myEntityId || "—",
    [myEntityName, current?.entityName, myEntityId]
  );
  const entityStatusLabel = useMemo(() => {
    const m: Record<string, string> = { approved: "فعّال", suspended: "موقوف مؤقتًا", pending: "قيد المراجعة", rejected: "مرفوض" };
    return myEntityStatus ? (m[myEntityStatus] || myEntityStatus) : null;
  }, [myEntityStatus]);

  const isManager = session?.role === "entityManager";
  const isSupervisor = session?.role === "unionSupervisor";
  const showSuspendedBanner = myEntityStatus === "suspended";

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ background: COLORS.bg, color: COLORS.text }}>
      <HeaderBar />

      {showSuspendedBanner && (
        <div className="mx-auto max-w-6xl w-full px-4 mt-4 animate-fade-in">
          <div className="rounded-xl p-3 md:p-4 flex items-start gap-3 ring-1 ring-[#FFE2B5]" style={{ background: "#FFF7E6" }}>
            <span className="h-8 w-8 mt-0.5 rounded-lg grid place-items-center bg-white ring-1 ring-[#FFE2B5]">
              <PauseCircle className="h-5 w-5" color="#B26B00" />
            </span>
            <div className="text-sm" style={{ color: "#6B4E00" }}>
              <div className="font-semibold mb-0.5">الكيان موقوف مؤقتًا</div>
              <div>تم تعليق الكيان مؤقتًا. ستظهر هنا كل الأنشطة والطلبات المتعلقة بكيانك أثناء فترة التعليق.</div>
              {suspension && (
                <div className="mt-1 text-xs">
                  آخر تحديث: {formatDate(suspension.at)}
                  {suspension.actor ? ` • بواسطة: ${suspension.actor}` : ""}
                  {suspension.reason ? ` • السبب: ${suspension.reason}` : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[22px] p-5 md:p-6 flex items-center justify-between transition-all duration-300 bg-white hover:shadow-lg animate-fade-in-up"
          style={{ border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <Users className="h-5 w-5" color={COLORS.text} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>
                {isSupervisor ? "سجل المنصّة ولوحة المراجعة"
                  : isManager ? "سجل كيانك ولوحة المراجعة"
                  : "سجل العضوية"}
              </h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {isSupervisor ? "كل الكيانات، كل الطلبات، كل الأحداث."
                  : isManager ? "كل ما يخص كيانك: الطلبات، الملفات، الأحداث والأعضاء."
                  : "تاريخ الانضمام والخروج وحالة عضويتك، وأحداث الكيان."}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="h-9 px-3 rounded-full inline-flex items-center gap-2 font-semibold transition-all duration-200 hover:translate-x-0.5"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
          >
            رجوع
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10 flex-1">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">

          {/* الحالة الحالية / ملخص */}
          <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg animate-fade-in-up">
            <CardHeader>
              <CardTitle>{isSupervisor ? "ملخص المنصّة" : "الحالة الحالية"}</CardTitle>
              <CardDescription className="text-[#6B6B6B]">
                {isSupervisor ? "عرض شامل لمؤشرات المراجعة" : "كيانك الحالي (إن وجد)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSupervisor ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Stat label="طلبات انضمام" value={summary.joinPending} />
                  <Stat label="طلبات فعاليات" value={summary.eventRequests} />
                  <Stat label="ملفات ISO قيد المراجعة" value={summary.isoSubs} />
                  <Stat label="حوكمة قيد المراجعة" value={summary.govSubs} />
                  <Stat label="طلبات مدير معلّقة" value={summary.managerReqs} />
                  <Stat label="طلبات كيانات معلّقة" value={summary.entityReqs} />
                </div>
              ) : (current?.entityId || myEntityId) ? (
                <div className="space-y-2 text-sm">
                  <div>الكيان: <strong>{prettyEntityName}</strong></div>
                  <div>
                    الحالة:{" "}
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                      {entityStatusLabel || current?.status || "فعّال"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: COLORS.muted }}>غير منضم لأي كيان حالياً.</div>
              )}
            </CardContent>
          </Card>

          {/* الخط الزمني */}
          <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg animate-fade-in-up">
            <CardHeader>
              <CardTitle>الخط الزمني</CardTitle>
              <CardDescription className="text-[#6B6B6B]">
                {isSupervisor ? "أحدث أحداث العضوية والمنصّة"
                 : isManager ? "طلبات ومغادرات مرتبطة بكيانك"
                 : "أحداث عضويتك مرتبة زمنياً"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-28 rounded-2xl" />
              ) : timeline.length === 0 ? (
                <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد أحداث ضمن النطاق.</div>
              ) : (
                <ul className="space-y-4">
                  {timeline.map((item, idx) => (
                    <li key={item.id} className="flex gap-3 animate-stagger" style={{ animationDelay: `${idx * 40}ms` }}>
                      <span className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
                            style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                        {iconFor(item.type)}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm">{renderTitle(item, { showNames: isSupervisor || isManager, usersMap })}</div>
                        <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                          {formatDate(item.at)} • {item.entityName}{" "}
                          {(isSupervisor || isManager) ? `• العضو: ${displayUser(item.userId, item.userName, usersMap)}` : ""}
                        </div>
                        {"note" in item && item.note && (
                          <div className="mt-2 text-xs rounded-lg p-2" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                            ملاحظة: {item.note}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ——— NEW: سير طلبات الانضمام ——— */}
          <div className="xl:col-span-2">
            <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg animate-fade-in-up">
              <CardHeader>
                <CardTitle>طلبات الانضمام وسير المراجعة</CardTitle>
                <CardDescription className="text-[#6B6B6B]">
                  {isSupervisor ? "كل طلبات الانضمام عبر المنصّة خطوة بخطوة."
                   : isManager ? "طلبات الانضمام إلى كيانك وما تم بشأنها."
                   : "رحلة طلب الانضمام الخاص بك حتى التنفيذ النهائي."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flowsLoading ? (
                  <Skeleton className="h-28 rounded-2xl" />
                ) : joinFlows.length === 0 ? (
                  <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات انضمام للعرض.</div>
                ) : (
                  <ul className="space-y-4">
                    {joinFlows.map((flow) => {
                      const requested = flow.steps.find(s => s.stage === "join_requested");
                      const decision  = flow.steps.find(s =>
                        s.stage === "manager_approved" ||
                        s.stage === "manager_rejected" ||
                        s.stage === "unionSupervisor_approved" ||
                        s.stage === "unionSupervisor_rejected"
                      );
                      const joined = flow.steps.find(s => s.stage === "joined");
                      const decisionTitle =
                        decision?.stage?.startsWith("manager_")
                          ? "قرار مدير الكيان"
                          : decision?.stage?.startsWith("unionSupervisor_")
                          ? "قرار مسؤول الاتحاد"
                          : "قرار الجهة المسؤولة";
                      return (
                        <li key={flow.key} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                          <div className="text-sm font-semibold">
                            العضو: <PersonChip name={displayUser(flow.userId, flow.userName || null, usersMap)} />{" "}
                            <span className="mx-1">•</span>
                            الكيان: <EntityChip name={flow.entityName || flow.entityId} />
                          </div>
                          {flow.finalJoinedAt ? (
                            <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                              تم الانضمام نهائيًا في {formatDate(flow.finalJoinedAt)}
                            </div>
                          ) : null}

                          <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                           <FlowStepItem
  title="طلب انضمام"
  icon={<PlusCircle className="h-4 w-4" />}
  step={requested && {
    createdAt: requested.createdAt,
    decidedAt: requested.decidedAt,
    decidedBy: actorLabel(requested.decidedBy, requested.stage, usersMap), // ⬅️ هنا
    note: requested.note,
    status: requested.status
  }}
/>

<FlowStepItem
  title={decisionTitle}
  icon={
    decision?.stage?.startsWith("manager_")
      ? <UserCheck className="h-4 w-4" />
      : <ShieldCheck className="h-4 w-4" />
  }
  step={decision && {
    createdAt: requested?.createdAt || decision.createdAt,
    decidedAt: decision.decidedAt || decision.createdAt,
    decidedBy: actorLabel(decision.decidedBy, decision.stage, usersMap), // ⬅️ هنا
    note: decision.note,
    status: decision.status
  }}
/>

{joined && (
  <FlowStepItem
    title="تنفيذ الانضمام"
    icon={<CheckCircle2 className="h-4 w-4" />}
    step={{
      createdAt: joined.createdAt,
      decidedAt: joined.decidedAt || joined.createdAt,
      decidedBy: actorLabel(joined.decidedBy, joined.stage, usersMap), // ⬅️ هنا
      note: joined.note,
      status: joined.status
    }}
  />
)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ——— سير طلبات الخروج ——— */}
          <div className="xl:col-span-2">
            <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg animate-fade-in-up">
              <CardHeader>
                <CardTitle>طلبات الخروج وسير المراجعة</CardTitle>
                <CardDescription className="text-[#6B6B6B]">
                  {isSupervisor ? "كل طلبات الخروج عبر المنصّة خطوة بخطوة."
                   : isManager ? "طلبات الخروج من كيانك وما تم بشأنها."
                   : "رحلة طلب الخروج الخاص بك حتى التنفيذ النهائي."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flowsLoading ? (
                  <Skeleton className="h-28 rounded-2xl" />
                ) : leaveFlows.length === 0 ? (
                  <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات خروج للعرض.</div>
                ) : (
                  <ul className="space-y-4">
                    {leaveFlows.map((flow) => (
                      <li key={flow.key} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                        <div className="text-sm font-semibold">
                          العضو: <PersonChip name={displayUser(flow.userId, flow.userName || null, usersMap)} />{" "}
                          <span className="mx-1">•</span>
                          الكيان: <EntityChip name={flow.entityName || flow.entityId} />
                        </div>
                        {flow.finalLeftAt ? (
                          <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                            تم الخروج نهائيًا في {formatDate(flow.finalLeftAt)}
                          </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-4 gap-3">
                          <FlowStepItem
                            title="طلب خروج"
                            icon={<LogOut className="h-4 w-4" />}
                            step={flow.steps.find(s => s.stage === "requested") && toGenericStep(flow.steps.find(s => s.stage === "requested")!, usersMap)}
                          />
                          <FlowStepItem
                            title="قرار مدير الكيان"
                            icon={<UserCheck className="h-4 w-4" />}
                            step={(flow.steps.find(s => s.stage === "manager_approved") || flow.steps.find(s => s.stage === "manager_rejected") || flow.steps.find(s => s.stage === "escalated")) &&
                                  toGenericStep((flow.steps.find(s => s.stage === "manager_approved") || flow.steps.find(s => s.stage === "manager_rejected") || flow.steps.find(s => s.stage === "escalated"))!, usersMap)}
                          />
                          <FlowStepItem
                            title="قرار مسؤول الاتحاد"
                            icon={<ShieldCheck className="h-4 w-4" />}
                            step={(flow.steps.find(s => s.stage === "supervisor_approved") || flow.steps.find(s => s.stage === "supervisor_rejected")) &&
                                  toGenericStep((flow.steps.find(s => s.stage === "supervisor_approved") || flow.steps.find(s => s.stage === "supervisor_rejected"))!, usersMap)}
                          />
                          <FlowStepItem
                            title="تنفيذ الخروج"
                            icon={<CheckCircle2 className="h-4 w-4" />}
                            step={flow.steps.find(s => s.stage === "left") && ({
                              createdAt: flow.steps.find(s => s.stage === "left")!.createdAt,
                              decidedAt: flow.steps.find(s => s.stage === "left")!.decidedAt || flow.steps.find(s => s.stage === "left")!.createdAt,
                              decidedBy: null,
                              note: null,
                              status: "done" as const
                            })}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* أحداث الكيان (موحّدة) */}
          <div className="xl:col-span-2">
            <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg animate-fade-in-up">
              <CardHeader>
                <CardTitle>أحداث الكيانات</CardTitle>
                <CardDescription className="text-[#6B6B6B]">
                  {isSupervisor ? "أحدث تغييرات ووثائق وطلبات كل الكيانات."
                   : myEntityId ? <>كل ما يحدث لكيان: <strong>{prettyEntityName}</strong></>
                   : "أحداث الكيان المرتبط بعضويتك الحالية (إن وُجد)."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(!isSupervisor && !myEntityId) ? (
                  <div className="text-sm" style={{ color: COLORS.muted }}>انضم إلى كيان أو أدِر كيانًا لعرض الأحداث هنا.</div>
                ) : loading ? (
                  <Skeleton className="h-28 rounded-2xl" />
                ) : moduleEvents.length === 0 ? (
                  <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد أحداث ضمن النطاق المحدد.</div>
                ) : (
                  <ul className="space-y-4">
                    {moduleEvents.map((ev, idx) => (
                      <li key={ev.id} className="flex gap-3 animate-stagger" style={{ animationDelay: `${idx * 40}ms` }}>
                        <span className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
                              style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                          {moduleIcon(ev.kind, ev.title)}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm">
                            <strong className="opacity-70">[{kindLabel(ev.kind)}]</strong> {ev.title}
                            {ev.status ? <> • الحالة: <strong>{ev.status}</strong></> : null}
                          </div>
                          <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                            {formatDate(ev.at)}
                            {ev.entityName ? ` • ${ev.entityName}` : ""}
                            {ev.actorName ? ` • بواسطة: ${ev.actorName}` : ""}
                            {ev.reason ? ` • السبب: ${ev.reason}` : ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* نشاط سريع */}
          {(isManager || isSupervisor) && (
            <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ReviewList title="آخر المنضمّين" items={activity.recentJoins} render={(r: any) => {
                const id = r?.userId || r?.memberId || r?.user || r?.id;
                return (
                  <>
                    <PersonChip name={displayUser(id, r.userName, usersMap)} />
                    <span className="mx-1">انضم إلى</span>
                    <EntityChip name={r.entityName || r.entityId} />
                    <div className="text-xs mt-1" style={{ color: COLORS.muted }}>{formatDate(r.joinedAt || r.createdAt)}</div>
                  </>
                );
              }} />
              <ReviewList title="آخر الخارجين/المزالين" items={activity.recentLeaves} render={(r: any) => {
                const id = r?.userId || r?.memberId || r?.user || r?.id;
                return (
                  <>
                    <PersonChip name={displayUser(id, r.userName, usersMap)} />
                    <span className="mx-1">{r.type === "removed" ? "تمت إزالته من" : "خرج من"}</span>
                    <EntityChip name={r.entityName || r.entityId} />
                    <div className="text-xs mt-1" style={{ color: COLORS.muted }}>{formatDate(r.createdAt || r.leftAt)}</div>
                  </>
                );
              }} />
            </div>
          )}

        </div>
      </main>

      <FooterBar />

      {/* أنيميشنات بسيطة */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        .animate-fade-in { animation: fadeIn .4s ease both; }

        @keyframes fadeInUp { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
        .animate-fade-in-up { animation: fadeInUp .45s ease both; }

        @keyframes stagger { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
        .animate-stagger { animation: stagger .35s ease both; }
      `}</style>
    </div>
  );
}

/* ————— helpers ————— */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-[#0000000A] animate-pulse ${className}`} />;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.01]"
         style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
      <div className="text-xs" style={{ color: COLORS.muted }}>{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function PersonChip({ name }: { name: string }) {
  return (
    <span className="text-xs rounded-full px-2 h-6 inline-flex items-center"
          style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
      👤 {name}
    </span>
  );
}
function EntityChip({ name }: { name: string }) {
  return (
    <span className="text-xs rounded-full px-2 h-6 inline-flex items-center"
          style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
      🏷️ {name}
    </span>
  );
}

function ReviewList({ title, items, render }: { title: string; items: any[] | undefined; render: (x: any) => React.ReactNode }) {
  return (
    <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg animate-fade-in-up">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-[#6B6B6B]">أحدث العناصر (بحد أقصى 200)</CardDescription>
      </CardHeader>
      <CardContent>
        {!items || items.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.muted }}>لا يوجد عناصر للعرض.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((r, i) => (
              <li key={r.id || i} className="rounded-xl p-3 transition-all duration-200 hover:bg-white/70"
                  style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                {render(r)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function iconFor(t: TimelineItem["type"]) {
  switch (t) {
    case "join_request":   return <Clock className="h-4 w-4" />;
    case "join_approved":  return <CheckCircle2 className="h-4 w-4" />;
    case "join_rejected":  return <XCircle className="h-4 w-4" />;
    case "left":           return <LogOut className="h-4 w-4" />;
    case "removed":        return <UserMinus className="h-4 w-4" />;
  }
}

function displayUser(userId?: string, userName?: string | null, map?: Map<string,string>) {
  if (userName && String(userName).trim()) return String(userName);
  const mapped = userId ? map?.get(String(userId)) : "";
  if (mapped) return mapped;
  const id = String(userId || "");
  return id ? `${id.slice(0,4)}…${id.slice(-4)}` : "مستخدم";
}

function renderTitle(i: TimelineItem, opts?: { showNames?: boolean; usersMap?: Map<string,string> }) {
  const who = displayUser((i as any).userId, (i as any).userName, opts?.usersMap);
  if (opts?.showNames) {
    switch (i.type) {
      case "join_request":  return <><strong>{who}</strong> أرسل طلب انضمام</>;
      case "join_approved": return <><strong>{who}</strong> تمت الموافقة على انضمامه</>;
      case "join_rejected": return <><strong>{who}</strong> تم رفض طلب انضمامه</>;
      case "left":          return <><strong>{who}</strong> خرج من الكيان</>;
      case "removed":       return <><strong>{who}</strong> تمت إزالته من الكيان</>;
    }
  }
  switch (i.type) {
    case "join_request":  return <>تم إرسال طلب انضمام</>;
    case "join_approved": return <>تمت الموافقة على الانضمام</>;
    case "join_rejected": return <>تم رفض طلب الانضمام</>;
    case "left":          return <>خروج من الكيان</>;
    case "removed":       return <>إزالة من الكيان</>;
  }
}

function formatDate(s: string) {
  try { return new Date(s + (s.endsWith("Z") ? "" : "Z")).toLocaleString("ar-EG"); } catch { return s; }
}

function eventIcon(action: EntityEvent["action"]) {
  switch (action) {
    case "suspended":               return <PauseCircle className="h-4 w-4" />;
    case "resumed":                 return <PlayCircle className="h-4 w-4" />;
    case "status_changed":          return <RefreshCw className="h-4 w-4" />;
    case "updated":                 return <Edit2 className="h-4 w-4" />;
    case "deleted":                 return <Trash2 className="h-4 w-4" />;
    case "suspend_requested":       return <PauseCircle className="h-4 w-4" />;
    case "resume_requested":        return <PlayCircle className="h-4 w-4" />;
    case "status_change_requested": return <RefreshCw className="h-4 w-4" />;
    case "update_requested":        return <Edit2 className="h-4 w-4" />;
    case "created":                 return <PlusCircle className="h-4 w-4" />;
    case "create_requested":        return <PlusCircle className="h-4 w-4" />;
    case "delete_requested":        return <Trash2 className="h-4 w-4" />;
    default:                        return <FileText className="h-4 w-4" />;
  }
}
function eventTitle(ev: EntityEvent) {
  switch (ev.action) {
    case "suspended":
      return <>تم <strong>تعليق</strong> الكيان {ev.toStatus ? <>({ev.toStatus})</> : null}</>;
    case "resumed":
      return <>تم <strong>استئناف</strong> الكيان</>;
    case "status_changed":
      return <>تغيّرت الحالة من <strong>{ev.fromStatus || "?"}</strong> إلى <strong>{ev.toStatus || "?"}</strong></>;
    case "updated":
      return <>تم <strong>تحديث</strong> بيانات الكيان</>;
    case "deleted":
      return <>تم <strong>حذف</strong> الكيان</>;
    case "suspend_requested":
      return <>تم إرسال <strong>طلب تعليق</strong> الكيان</>;
    case "resume_requested":
      return <>تم إرسال <strong>طلب استئناف</strong> الكيان</>;
    case "status_change_requested":
      return <>تم إرسال <strong>طلب تغيير حالة</strong> من <strong>{ev.fromStatus || "?"}</strong> إلى <strong>{ev.toStatus || "?"}</strong></>;
    case "update_requested":
      return <>تم إرسال <strong>طلب تحديث</strong> بيانات الكيان</>;
    case "created":
      return <>تم <strong>إنشاء</strong> الكيان</>;
    case "create_requested":
      return <>تم إرسال <strong>طلب إنشاء</strong> كيان</>;
    case "delete_requested":
      return <>تم إرسال <strong>طلب حذف</strong> الكيان</>;
    default:
      return <>حدث: <strong>{ev.action}</strong></>;
  }
}

function kindLabel(k: ModuleEvent["kind"]) {
  switch (k) {
    case "entity_event": return "حدث كيان";
    case "event_request": return "طلب فعالية";
    case "event": return "فعالية";
    case "iso": return "ISO";
    case "governance": return "حوكمة";
  }
}
function moduleIcon(k: ModuleEvent["kind"], _title: string) {
  switch (k) {
    case "entity_event":  return <RefreshCw className="h-4 w-4" />;
    case "event_request": return <FileText className="h-4 w-4" />;
    case "event":         return <Users className="h-4 w-4" />;
    case "iso":           return <Layers className="h-4 w-4" />;
    case "governance":    return <FileText className="h-4 w-4" />;
    default:              return <FileText className="h-4 w-4" />;
  }
}

/* —— Generic Flow Step UI (يخدم الانضمام والخروج) —— */

type GenericStep = {
  createdAt?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
  note?: string | null;
  status?: "pending" | "approved" | "rejected" | "done";
};

function badge(status?: string) {
  switch (status) {
    case "approved": return { bg: "#EAF8F0", bd: "#CBEBDD", fg: "#0F5132", text: "مقبول" };
    case "rejected": return { bg: "#FEEDEF", bd: "#F5C9CF", fg: "#842029", text: "مرفوض" };
    case "done":     return { bg: "#EAF8F0", bd: "#CBEBDD", fg: "#0F5132", text: "تم التنفيذ" };
    case "pending":
    default:         return { bg: "#FFF8E8", bd: "#F2E7C6", fg: "#7A7A7A", text: "قيد المراجعة" };
  }
}

function FlowStepItem({ title, icon, step }: { title: string; icon: React.ReactNode; step?: GenericStep | null }) {
  const st = step?.status || "pending";
  const b = badge(st);
  return (
    <div className="rounded-xl p-3" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-lg grid place-items-center" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
          {icon}
        </span>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-2 text-xs" style={{ color: COLORS.muted }}>
        {step?.createdAt ? <>بدأت: {formatDate(step.createdAt)}<br/></> : null}
        {step?.decidedAt ? <>آخر إجراء: {formatDate(step.decidedAt)}<br/></> : null}
        {step?.decidedBy ? <>بواسطة: {step.decidedBy}<br/></> : null}
        {step?.note ? <>ملاحظة: {step.note}<br/></> : null}
      </div>
      <span className="inline-flex items-center h-6 px-2 rounded-full text-xs mt-2"
            style={{ background: b.bg, border: `1px solid ${b.bd}`, color: b.fg }}>
        {b.text}
      </span>
    </div>
  );
}

// محوّل من LeaveFlowStep إلى GenericStep مع تحويل decidedBy إلى اسم مستخدم
function toGenericStep(s: LeaveFlowStep, usersMap?: Map<string,string>): GenericStep {
  return {
    createdAt: s.createdAt,
    decidedAt: s.decidedAt,
    decidedBy: actorLabel(s.decidedBy, s.stage, usersMap, s.approverRole || null), // ⬅️ هنا
    note: s.note || undefined,
    status: s.status
  };
}
function actorLabel(id?: string | null, stage?: string | null, usersMap?: Map<string,string>, roleHint?: "entityManager" | "unionSupervisor" | null) {
  if (id && usersMap?.has(String(id))) return usersMap.get(String(id))!;
  // استنتاج الدور من الـ stage أو الـ roleHint
  if (roleHint === "entityManager" || stage?.startsWith?.("manager_")) return "مدير الكيان";
  if (roleHint === "unionSupervisor" || stage?.startsWith?.("unionSupervisor_") || stage?.startsWith?.("supervisor_")) return "مسؤول الاتحاد";
  // fallback أخير: جزء من الـ ID فقط
  const v = String(id || "");
  return v ? `${v.slice(0,4)}…${v.slice(-4)}` : "—";
}

/* ——— Header / Footer ——— */

function HeaderBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const linkClasses = (href: string) =>
    `px-3 py-1 rounded-lg transition whitespace-nowrap ${
      isActive(href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"
    }`;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border border-[#E7E2DC] shadow-[0_6px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#F6F6F6] border border-[#E5E5E5] shrink-0">
              <Users className="h-5 w-5 text-[#1D1D1D]" />
            </div>
            <Link href="/" className="font-semibold text-[#1D1D1D] truncate">
              منصة الكيانات الشبابية
            </Link>
          </div>

          <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="التنقّل الرئيسي">
            {[
              { href: "/profile", label: "الملف الشخصي" },
              { href: "/profile/history", label: "سجل المنصّة" },
              { href: "/dashboard", label: "لوحة التحكم" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className={linkClasses(l.href)} aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>

          <nav className="sm:hidden flex items-center gap-1 text-sm overflow-x-auto no-scrollbar max-w-[60%]" aria-label="التنقّل (موبايل)">
            {[
              { href: "/profile", label: "الملف" },
              { href: "/profile/history", label: "السجل" },
              { href: "/dashboard", label: "اللوحة" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className={linkClasses(l.href)} aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="mt-6">
      <div className="mx-auto max-w-6xl w-full px-4 pb-6">
        <div className="rounded-2xl px-4 py-3 bg-white border border-[#E7E2DC] text-sm flex items-center justify-between">
          <span className="text-[#6B6B6B]">
            © {new Date().getFullYear()} منصة الكيانات الشبابية
          </span>
          <div className="flex items-center gap-3 text-[#6B6B6B]">
            <Link href="/support" className="hover:text-[#1D1D1D]">الدعم</Link>
            <span className="opacity-30">•</span>
            <Link href="/about" className="hover:text-[#1D1D1D]">عن المنصة</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
