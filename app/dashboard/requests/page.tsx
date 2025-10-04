"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Session, JoinRequest } from "@/lib/types";
import { BadgeCheck, XCircle, RefreshCw, Users, LogOut } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

const COLORS = {
  text: "#1D1D1D",
  muted: "#6B6B6B",
  bg: "#EFE6DE",
  card: "#FFFFFF",
  border: "#E7E2DC",
  line: "#E3E3E3",
  soft: "#F6F6F6",
  primary: "#EC1A24",
};

type EntityLite = { id: string; name: string };

// نموذج مبسّط لطلبات الخروج المعروضة في الواجهة
type LeaveRequestUI = {
  id: string;
  action: "leave_membership";
  entityId: string;
  entityName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  approverRole: "entityManager" | "unionSupervisor";
  status: "pending" | "approved" | "rejected";
  note?: string | null;
};

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = { "Cache-Control": "no-store" };
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

const LEAVE_REQUESTS_API = "/api/entities/requests";

// 🔧 helper: نستخرج اللست مهما كان شكل الرِسبونس
function coerceArray(resBody: any): any[] {
  if (!resBody) return [];
  if (Array.isArray(resBody)) return resBody;
  if (Array.isArray(resBody?.items)) return resBody.items;
  if (Array.isArray(resBody?.rows)) return resBody.rows;
  if (Array.isArray(resBody?.data)) return resBody.data;
  if (Array.isArray(resBody?.requests)) return resBody.requests;
  if (Array.isArray(resBody?.result)) return resBody.result;
  return [];
}

export default function RequestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // الانضمام
  const [rows, setRows] = useState<JoinRequest[]>([]);
  // المغادرة
  const [leaveRows, setLeaveRows] = useState<LeaveRequestUI[]>([]);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [actingLeave, setActingLeave] = useState<string | null>(null);

  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);

  // ---------------- Session ----------------
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      setSession(JSON.parse(s));
    } catch {
      router.push("/");
    }
  }, [router]);

  const canDecide    = !!session && (session.role === "entityManager" || session.role === "unionSupervisor");
  const isSupervisor = session?.role === "unionSupervisor";
  const isManager    = session?.role === "entityManager";

  // ---------------- Loaders ----------------

  // طلبات الانضمام
  const loadRequests = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      let q = "";
      if (session.role === "unionSupervisor") {
        q = `?status=pending`;
      } else if (session.role === "entityManager" && session.entityId) {
        q = `?entityId=${encodeURIComponent(String(session.entityId))}`;
      } else {
        q = `?userId=${encodeURIComponent(session.id)}`;
      }

      const res = await fetch(`/api/join-requests${q}`, {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      const data: JoinRequest[] = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [session?.id, session?.role, session?.entityId]);

  // ✅ طلبات المغادرة — نحاول أكثر من شكل للاستعلام والرِسبونس
  const loadLeaveRequests = useCallback(async () => {
    if (!session?.id) return;

    // بنبني كل السيناريوهات المحتملة للكواري
    const base = new URLSearchParams({ status: "pending", viewerId: String(session.id) });
    const tries: string[] = [];

    if (isManager) {
      if (!session.entityId) { setLeaveRows([]); return; }
      const eid = String(session.entityId);
      // بعض الـ APIs تستخدم approverRole/targetEntityId
      tries.push(`?${new URLSearchParams({ ...Object.fromEntries(base), approverRole: "entityManager", targetEntityId: eid }).toString()}`);
      // وبعضها تستخدم role/entityId
      tries.push(`?${new URLSearchParams({ ...Object.fromEntries(base), role: "entityManager", entityId: eid }).toString()}`);
      // fallback بدون viewerId
      tries.push(`?status=pending&approverRole=entityManager&targetEntityId=${encodeURIComponent(eid)}`);
      tries.push(`?status=pending&role=entityManager&entityId=${encodeURIComponent(eid)}`);
      // وآخر محاولة: status فقط
      tries.push(`?status=pending`);
    } else if (isSupervisor) {
      tries.push(`?${new URLSearchParams({ ...Object.fromEntries(base), approverRole: "unionSupervisor" }).toString()}`);
      tries.push(`?${new URLSearchParams({ ...Object.fromEntries(base), role: "unionSupervisor" }).toString()}`);
      tries.push(`?status=pending&approverRole=unionSupervisor`);
      tries.push(`?status=pending&role=unionSupervisor`);
      tries.push(`?status=pending`);
    } else {
      // مستخدم عادي ما يشوفش لوحة الاعتماد هنا
      setLeaveRows([]);
      return;
    }

    // هنجرّب queries لحد ما نلاقي داتا
    const collected: any[] = [];
    for (const suffix of tries) {
      try {
        const res = await fetch(`${LEAVE_REQUESTS_API}${suffix}`, {
          cache: "no-store",
          headers: buildSessionHeaders(false),
          credentials: "include",
        });
        const body = await res.json().catch(() => null);
        const arr = coerceArray(body);
        if (arr.length) {
          collected.push(...arr);
        }
      } catch {
        // نتجاهل ونكمل المحاولات
      }
    }

    // إزالة التكرار إن وجد
    const unique = new Map<string, any>();
    for (const r of collected) {
      const id = String(r?.id ?? "");
      if (id) unique.set(id, r);
    }
    const finalList = Array.from(unique.values());

    const normalized: LeaveRequestUI[] = finalList
      .filter((r: any) => r && (r.action === "leave_membership" || r.action === "leave" || r.type === "leave_membership"))
      .map((r: any) => {
        const payload = r?.payload ? (typeof r.payload === "string" ? safeParse(r.payload) : r.payload) : {};
        const _entityId = String(r.targetEntityId || r.entityId || r.entity_id || payload?.entityId || "");
        const _entityName = String(r.entityName || r.entity_id_name || r.entity || r.targetEntityName || payload?.entityName || "") || undefined;

        // بعض الأنظمة بتسميها nextApproverRole/currentApproverRole
        const approverRoleRaw = String(r.approverRole || r.nextApproverRole || r.currentApproverRole || "");
        const approverRole: "entityManager" | "unionSupervisor" =
          approverRoleRaw === "entityManager" ? "entityManager" : "unionSupervisor";

        const statusRaw = String(r.status || r.state || "pending");
        const status: "pending" | "approved" | "rejected" =
          statusRaw === "approved" || statusRaw === "manager_approved" || statusRaw === "approved_and_left"
            ? "approved"
            : statusRaw === "rejected"
              ? "rejected"
              : "pending";

        return {
          id: String(r.id),
          action: "leave_membership",
          entityId: _entityId,
          entityName: _entityName,
          userId: String(payload?.userId || r.userId || r.createdBy || r.createdById || ""),
          userName: r.userName || r.createdByName || r.requesterName || undefined,
          userEmail: r.userEmail || r.createdByEmail || r.requesterEmail || undefined,
          createdAt: String(r.createdAt || r.created_at || new Date().toISOString()),
          approverRole,
          status,
          note: r?.note ?? null,
        };
      });

    setLeaveRows(normalized);
  }, [session?.id, session?.entityId, isManager, isSupervisor]);

  // small safe JSON parser
  function safeParse(s: string) {
    try { return JSON.parse(s); } catch { return {}; }
  }

  // أسماء الكيانات
  const loadEntities = useCallback(async () => {
    const res = await fetch("/api/entities", {
      cache: "no-store",
      headers: buildSessionHeaders(false),
      credentials: "include",
    });
    const data = await res.json().catch(() => []);
    const list: EntityLite[] = (Array.isArray(data) ? data : data?.entities || [])
      .filter((e: any) => e?.id && e?.name)
      .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
    setEntities(list);
    setSelectedEntity(prev => prev || (list[0]?.id ?? ""));
  }, []);

  // عضوية المستخدم الحالية
  const loadMembership = useCallback(async () => {
    if (session?.role !== "user") { setCurrentEntityId(null); return; }
    try {
      const r = await fetch("/api/membership/my", {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      const j = await r.json().catch(() => null);
      setCurrentEntityId(j?.entityId ? String(j.entityId) : null);
    } catch {
      setCurrentEntityId(null);
    }
  }, [session?.role]);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      loadRequests(),
      (isSupervisor || isManager || !canDecide) ? loadEntities() : Promise.resolve(),
      !canDecide ? loadMembership() : Promise.resolve(),
      canDecide ? loadLeaveRequests() : Promise.resolve(),
    ]);
  }, [loadRequests, loadEntities, loadMembership, loadLeaveRequests, canDecide, isSupervisor, isManager]);

  useEffect(() => { if (session?.id) reloadAll(); }, [session?.id, reloadAll]);

  // تحديث تلقائي عند العودة للتاب
  useEffect(() => {
    const onFocus = () => reloadAll();
    const onVis = () => { if (document.visibilityState === "visible") reloadAll(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reloadAll]);

  // ---------------- Derivations ----------------

  // الانضمام للمشرف مجمّع حسب الكيان
  const pendingJoinByEntity = useMemo(() => {
    if (!isSupervisor) return {} as Record<string, JoinRequest[]>;
    const m: Record<string, JoinRequest[]> = {};
    for (const r of rows) {
      if (r?.status !== "pending") continue;
      const k = String(r.entityId);
      (m[k] ||= []).push(r);
    }
    return m;
  }, [rows, isSupervisor]);

  // المغادرة للمشرف/المدير مجمّع حسب الكيان
  const pendingLeaveByEntity = useMemo(() => {
    if (!isSupervisor && !isManager) return {} as Record<string, LeaveRequestUI[]>;
    const m: Record<string, LeaveRequestUI[]> = {};
    for (const r of leaveRows) {
      if (r.status !== "pending") continue;
      const k = String(r.entityId);
      (m[k] ||= []).push(r);
    }
    return m;
  }, [leaveRows, isSupervisor, isManager]);

  // تجميع الانضمام حسب الحالة (عرض)
  const groupedJoins = useMemo(() => {
    const g: Record<"pending" | "approved" | "rejected", JoinRequest[]> = {
      pending: [], approved: [], rejected: [],
    };
    const items = Array.isArray(rows) ? rows : [];
    for (const r of items) {
      if (!r) continue;
      if (r.status === "pending" || r.status === "approved" || r.status === "rejected") g[r.status].push(r);
    }
    return g;
  }, [rows]);

  const hasPendingForSelected = useMemo(() => {
    if (!selectedEntity) return false;
    return rows.some(r => r.entityId === selectedEntity && r.status === "pending");
  }, [rows, selectedEntity]);

  const isMemberNow: boolean = !!currentEntityId;
  const isSelectedCurrent: boolean = !!selectedEntity && currentEntityId === selectedEntity;

  const filteredEntities = useMemo(() => {
    if (canDecide) return entities;
    const list = entities;
    if (selectedEntity && !list.find(e => e.id === selectedEntity)) {
      if (list[0]?.id) setSelectedEntity(list[0].id);
      else setSelectedEntity("");
    }
    return list;
  }, [entities, canDecide, selectedEntity]);

  // ---------------- Actions ----------------

  // انضمام: موافقة/رفض
  const actJoin = async (id: string, action: "approve" | "reject") => {
    if (!canDecide || acting) return;
    setActing(id);
    try {
      const res = await fetch(`/api/join-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "تعذّر تنفيذ الإجراء"); return; }
      await loadRequests();
      await loadMembership();
    } catch (e: any) {
      alert(e?.message || "حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  // مغادرة: موافقة/رفض عبر /api/entities/requests — تحديث متفائل
  const actLeave = async (id: string, decision: "approve" | "reject") => {
    if (!canDecide || actingLeave) return;
    setActingLeave(id);

    const prev = leaveRows;

    try {
      const res = await fetch(LEAVE_REQUESTS_API, {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || "تعذر تنفيذ الإجراء");
        return;
      }

      const st = String(data?.status || "");

      if (st === "manager_approved") {
        setLeaveRows((rows) => rows.filter((r) => r.id !== id));
        await loadLeaveRequests();
        alert("تمت موافقة مدير الكيان وتم تصعيد الطلب لمسؤول الاتحاد.");
      } else if (st === "approved_and_left") {
        setLeaveRows((rows) => rows.filter((r) => r.id !== id));
        await Promise.all([loadMembership(), loadRequests(), loadLeaveRequests()]);
        alert("تمت الموافقة النهائية، وتم حذف العضوية.");
      } else if (st === "rejected") {
        setLeaveRows((rows) => rows.filter((r) => r.id !== id));
        await loadLeaveRequests();
        alert("تم رفض طلب المغادرة.");
      } else if (st === "approved") {
        setLeaveRows((rows) => rows.filter((r) => r.id !== id));
        await loadLeaveRequests();
      } else {
        await Promise.all([loadLeaveRequests(), loadRequests(), loadMembership()]);
      }
    } catch (e: any) {
      setLeaveRows(prev);
      alert(e?.message || "حدث خطأ");
    } finally {
      setActingLeave(null);
    }
  };

  const submitJoin = async () => {
    if (!session) return;
    if (isMemberNow) { alert("أنت عضو حاليًا في كيان. يجب الخروج أولًا قبل تقديم طلب جديد."); return; }
    if (!selectedEntity) { alert("اختر كيانًا أولاً"); return; }
    if (hasPendingForSelected) { alert("لديك طلب قيد المراجعة لهذا الكيان"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify({ entityId: selectedEntity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "تعذّر إرسال الطلب"); return; }
      alert("تم إرسال طلب الانضمام. بانتظار موافقة مسؤول الكيان.");
      await loadRequests();
      await loadMembership();
    } catch (e: any) {
      alert(e?.message || "تعذّر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- UI ----------------
  if (!session) {
    return (
      <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
        <HeaderBar />
        <div className="mx-auto max-w-6xl w-full px-4 py-8">
          <SurfaceCard>
            <div className="p-5">
              <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>طلبات العضوية</h2>
              <p className="text-sm mt-1" style={{ color: COLORS.muted }}>جاري التحقق من الجلسة…</p>
              <div className="h-24 mt-4 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  const totalCount = rows.length + leaveRows.length;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      <HeaderBar />

      {/* Header */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
             style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <Users className="h-5 w-5" color={COLORS.text} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>طلبات العضوية</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {canDecide
                  ? (isSupervisor
                      ? "استعراض واعتماد الطلبات المعلقة على مستوى المنصّة (انضمام + مغادرة)"
                      : "مراجعة طلبات الانضمام وطلبات الخروج واتخاذ القرار")
                  : "اختر كيانًا لتقديم طلب الانضمام، وتابع حالة طلباتك"}
              </p>
            </div>
          </div>

            <div className="flex items-center gap-2">
              <div className="h-9 px-3 rounded-full grid place-items-center"
                  style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                {totalCount} طلب
              </div>
              <button
                onClick={reloadAll}
                className="h-9 px-3 rounded-full inline-flex items-center gap-2"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
              >
                <RefreshCw className="h-4 w-4" /> تحديث
              </button>
            </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        {/* 🔹 لوحة المشرف/المدير: أقسام منفصلة */}
        {canDecide ? (
          <>
            {/* الانضمام المعلّق */}
            <SurfaceCard className="mb-6">
              <div className="px-5 pt-5">
                <div className="text-sm" style={{ color: COLORS.muted }}>طلبات الانضمام المعلّقة</div>
              </div>
              <div className="mx-5 my-4 h-px" style={{ backgroundColor: COLORS.line }} />
              <div className="px-5 pb-5">
                {loading ? (
                  <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
                ) : (isSupervisor ? Object.keys(pendingJoinByEntity).length === 0 : rows.filter(r => r.status === "pending").length === 0) ? (
                  <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات معلّقة للانضمام.</div>
                ) : (
                  <>
                    {isSupervisor ? (
                      Object.entries(pendingJoinByEntity).map(([eid, list]) => {
                        const ename = entities.find(e => e.id === eid)?.name || list[0]?.entityName || eid;
                        return (
                          <div key={eid} className="mb-6">
                            <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>{ename}</h3>
                            <ul className="space-y-3">
                              {list.map((r) => (
                                <li key={r.id}
                                    className="rounded-2xl p-4 flex items-center justify-between"
                                    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                                  <div>
                                    <div className="font-semibold" style={{ color: COLORS.text }}>
                                      {r.userName} <span className="text-sm" style={{ color: COLORS.muted }}>({r.userEmail})</span>
                                    </div>
                                    <div className="text-sm" style={{ color: COLORS.muted }}>
                                      قدّم في {new Date(r.createdAt).toLocaleString("ar-EG")}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={Boolean(acting)}
                                      onClick={() => actJoin(r.id, "approve")}
                                      className="h-9 px-3 rounded-full flex items-center gap-2 font-medium"
                                      style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                                      <BadgeCheck className="h-4 w-4" /> قبول الانضمام
                                    </button>
                                    <button
                                      disabled={Boolean(acting)}
                                      onClick={() => actJoin(r.id, "reject")}
                                      className="h-9 px-3 rounded-full flex items-center gap-2"
                                      style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                                      <XCircle className="h-4 w-4" /> رفض الانضمام
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    ) : (
                      <ul className="space-y-3">
                        {rows.filter(r => r.status === "pending").map((r) => (
                          <li key={r.id}
                              className="rounded-2xl p-4 flex items-center justify-between"
                              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                            <div>
                              <div className="font-semibold" style={{ color: COLORS.text }}>
                                {r.userName} <span className="text-sm" style={{ color: COLORS.muted }}>({r.userEmail})</span>
                              </div>
                              <div className="text-sm" style={{ color: COLORS.muted }}>
                                كيان: {r.entityName} • قدّم في {new Date(r.createdAt).toLocaleString("ar-EG")}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={Boolean(acting)}
                                onClick={() => actJoin(r.id, "approve")}
                                className="h-9 px-3 rounded-full flex items-center gap-2 font-medium"
                                style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                                <BadgeCheck className="h-4 w-4" /> قبول الانضمام
                              </button>
                              <button
                                disabled={Boolean(acting)}
                                onClick={() => actJoin(r.id, "reject")}
                                className="h-9 px-3 rounded-full flex items-center gap-2"
                                style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                                <XCircle className="h-4 w-4" /> رفض الانضمام
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </SurfaceCard>

            {/* طلبات الخروج المعلّقة */}
            <SurfaceCard>
              <div className="px-5 pt-5">
                <div className="text-sm" style={{ color: COLORS.muted }}>طلبات الخروج من الكيان المعلّقة</div>
              </div>
              <div className="mx-5 my-4 h-px" style={{ backgroundColor: COLORS.line }} />
              <div className="px-5 pb-5">
                {Object.keys(pendingLeaveByEntity).length === 0 ? (
                  <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات مغادرة معلّقة.</div>
                ) : (
                  Object.entries(pendingLeaveByEntity).map(([eid, list]) => {
                    const ename = entities.find(e => e.id === eid)?.name || list[0]?.entityName || eid;
                    return (
                      <div key={eid} className="mb-6">
                        <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>{ename}</h3>
                        <ul className="space-y-3">
                          {list.map((r) => (
                            <li key={r.id}
                                className="rounded-2xl p-4 flex items-center justify-between"
                                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                              <div>
                                <div className="font-semibold" style={{ color: COLORS.text }}>
                                  {r.userName || r.userId}{" "}
                                  {r.userEmail ? <span className="text-sm" style={{ color: COLORS.muted }}>({r.userEmail})</span> : null}
                                </div>
                                <div className="text-sm" style={{ color: COLORS.muted }}>
                                  طلب مغادرة • قدّم في {new Date(r.createdAt).toLocaleString("ar-EG")} • المرحلة: {r.approverRole === "entityManager" ? "موافقة مدير الكيان" : "موافقة مسؤول الاتحاد"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={Boolean(actingLeave)}
                                  onClick={() => actLeave(r.id, "approve")}
                                  className="h-9 px-3 rounded-full flex items-center gap-2 font-medium"
                                  style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                                  <LogOut className="h-4 w-4" /> الموافقة على الخروج
                                </button>
                                <button
                                  disabled={Boolean(actingLeave)}
                                  onClick={() => actLeave(r.id, "reject")}
                                  className="h-9 px-3 rounded-full flex items-center gap-2"
                                  style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                                  <XCircle className="h-4 w-4" /> رفض الخروج
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </SurfaceCard>
          </>
        ) : (
          <>
            {/* المستخدم العادي: تقديم طلب الانضمام */}
            <SurfaceCard className="mb-6">
              <div className="p-5 space-y-4">
                {isMemberNow && (
                  <div className="rounded-xl p-3 text-sm" style={{ background: "#FFF8E8", border: "1px solid #F2E7C6", color: "#7A7A7A" }}>
                    أنت عضو حالياً في:{" "}
                    <strong>{entities.find(e => e.id === currentEntityId)?.name || currentEntityId}</strong>.
                    لا يمكنك تقديم طلب جديد إلا بعد الخروج من الكيان (من صفحة الملف الشخصي بإرسال طلب مغادرة).
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: COLORS.text }}>اختر الكيان</label>
                    <Select value={selectedEntity} onValueChange={setSelectedEntity} disabled={isMemberNow}>
                      <SelectTrigger className="h-11 rounded-xl"
                                     style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                        <SelectValue placeholder="اختر الكيان" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEntities.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={submitJoin}
                      disabled={Boolean(isMemberNow || !selectedEntity || submitting || hasPendingForSelected || isSelectedCurrent)}
                      className="h-11 px-5 rounded-full font-semibold"
                      style={{ background: COLORS.primary, color: "#FFFFFF",
                              opacity: (isMemberNow || !selectedEntity || submitting || hasPendingForSelected || isSelectedCurrent) ? 0.6 : 1 }}
                    >
                      {submitting ? "جارٍ الإرسال..." : "تقديم طلب انضمام"}
                    </button>
                    <button
                      onClick={reloadAll}
                      className="h-11 px-4 rounded-full"
                      style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {hasPendingForSelected && !isMemberNow && (
                  <div className="text-sm" style={{ color: COLORS.muted }}>
                    لديك طلب قيد المراجعة لهذا الكيان بالفعل.
                  </div>
                )}
              </div>
            </SurfaceCard>

            {/* عرض طلبات الانضمام للمستخدم */}
            <SurfaceCard>
              <div className="p-5">
                {loading ? (
                  <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
                ) : (
                  <>
                    {(["pending", "approved", "rejected"] as const).map((k) => (
                      <div key={k} className="mb-6">
                        <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
                          {k === "pending" ? "طلبات الانضمام قيد المراجعة" : k === "approved" ? "طلبات الانضمام المقبولة" : "طلبات الانضمام المرفوضة"}
                        </h3>

                        {groupedJoins[k].length === 0 ? (
                          <div className="text-sm" style={{ color: COLORS.muted }}>لا يوجد</div>
                        ) : (
                          <ul className="space-y-3">
                            {groupedJoins[k].map((r) => (
                              <li key={r.id}
                                  className="rounded-2xl p-4 flex items-center justify_between"
                                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                                <div>
                                  <div className="font-semibold" style={{ color: COLORS.text }}>
                                    {r.userName}{" "}
                                    <span className="text-sm" style={{ color: COLORS.muted }}>({r.userEmail})</span>
                                  </div>
                                  <div className="text-sm" style={{ color: COLORS.muted }}>
                                    كيان: {r.entityName} • الحالة: {r.status} • بتاريخ: {new Date(r.createdAt).toLocaleString("ar-EG")}
                                    {r.decidedAt ? ` • قرار: ${new Date(r.decidedAt!).toLocaleString("ar-EG")} بواسطة ${r.decidedBy || "-"}` : ""}
                                  </div>
                                </div>
                                <StatusPill status={r.status as any} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </SurfaceCard>
          </>
        )}
      </main>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10" style={{ fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
             style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <Users className="h-5 w-5" color={COLORS.text} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: COLORS.text }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/entities", label: "الكيانات" },
              { href: "/dashboard/requests", label: "طلبات العضوية" }
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{ color: active(l.href) ? "#FFFFFF" : COLORS.text, backgroundColor: active(l.href) ? COLORS.primary : "transparent" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`}
         style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  let bg = "#FFF8E8", bd = "#F2E7C6", txt = "#7A7A7A";
  if (status === "approved") { bg = "#EAF8F0"; bd = "#CBEBDD"; txt = "#0F5132"; }
  if (status === "rejected") { bg = "#FEEDEF"; bd = "#F5C9CF"; txt = "#842029"; }
  return (
    <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium"
          style={{ background: bg, border: `1px solid ${bd}`, color: txt }}>
      {status === "pending" ? "قيد المراجعة" : status === "approved" ? "مقبول" : "مرفوض"}
    </span>
  );
}
