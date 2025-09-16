// /app/join/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; name: string; email: string; role: Role; entityId?: string | null };
type Entity  = { id: string; name: string };

export default function JoinRequestPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [form, setForm] = useState({
    entityId: "",
    fullName: "",
    position: "",
    phone: "",
    email: "",
    note: "",
  });

  // ملفات الهوية (لو API بتدعم multipart)
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack,  setIdBack]  = useState<File | null>(null);

  // العضوية الحالية الفعلية
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);

  const isUser = session?.role === "user";

  const b64 = () => {
    try {
      const raw = localStorage.getItem("session") || "";
      return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
    } catch { return ""; }
  };

  useEffect(() => { setHydrated(true); }, []);

  // تحميل الجلسة
  useEffect(() => {
    if (!hydrated) return;
    try {
      const raw = localStorage.getItem("session");
      if (!raw) { router.replace("/"); return; }
      const s = JSON.parse(raw) as Session;
      setSession(s);
      setForm(p => ({
        ...p,
        fullName: s.name || p.fullName,
        email: s.email || p.email,
      }));
    } catch {
      router.replace("/");
    }
  }, [hydrated, router]);

  // تحميل الكيانات + معرفة العضوية الحالية
  useEffect(() => {
    if (!hydrated) return;
    let mounted = true;

    (async () => {
      setLoading(true); setErrMsg("");

      try {
        // الكيانات كلها للمستخدم العادي
        const res = await fetch("/api/entities", {
          cache: "no-store",
          headers: b64() ? { "x-session-b64": b64() } as HeadersInit : undefined,
          credentials: "include",
        });
        const data = await res.json().catch(() => []);
        const list: Entity[] = (Array.isArray(data) ? data : data?.entities || [])
          .filter((e: any) => e?.id && e?.name)
          .map((e: any) => ({ id: String(e.id), name: String(e.name) }));

        if (!mounted) return;
        setEntities(list);
        setForm(p => ({ ...p, entityId: p.entityId || (list[0]?.id ? String(list[0].id) : "") }));
      } catch (e: any) {
        if (mounted) setErrMsg(e?.message || "حدث خطأ أثناء تحميل الكيانات");
      }

      try {
        // العضوية الحالية (تعتمد جدول entity_members)
        const mr = await fetch("/api/membership/my", {
          cache: "no-store",
          headers: b64() ? { "x-session-b64": b64() } as HeadersInit : undefined,
          credentials: "include",
        });
        const mj = await mr.json().catch(() => null);
        if (!mounted) return;
        setCurrentEntityId(mj?.entityId ? String(mj.entityId) : null);
      } catch {
        if (mounted) setCurrentEntityId(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [hydrated]);

  // هل المستخدم عضو الآن؟
  const isMemberNow = !!currentEntityId;

  // هل اختار نفس الكيان الحالي؟
  const isSelectedCurrent = !!form.entityId && !!currentEntityId && form.entityId === currentEntityId;

  // لا نسمح بالإرسال لو عضو قائم أو اختار نفس الكيان الحالي أو حقول ناقصة
  const isSubmitDisabled = useMemo(() => {
    if (saving || loading) return true;
    if (!isUser) return true; // الصفحة للمستخدم العادي فقط
    if (!form.entityId || !form.fullName.trim() || !form.position.trim() || !form.phone.trim() || !form.email.trim()) return true;
    if (isMemberNow) return true;
    if (isSelectedCurrent) return true;
    // لو API بتتطلب صور رقم قومي بالضرورة:
    if (!idFront || !idBack) return true;
    return false;
  }, [saving, loading, isUser, form, isMemberNow, isSelectedCurrent, idFront, idBack]);

  const validate = () => {
    if (!isUser) return "هذه الصفحة متاحة للمستخدمين فقط.";
    if (isMemberNow) return "أنت بالفعل في كيان، يجب الخروج أولًا قبل تقديم طلب جديد.";
    if (!form.fullName.trim()) return "الاسم الكامل مطلوب";
    if (!form.entityId) return "اختر الكيان";
    if (isSelectedCurrent) return "لا يمكنك التقديم لنفس الكيان الذي أنت عضو فيه حاليًا.";
    if (!form.position.trim()) return "المنصب داخل الكيان مطلوب";
    if (!form.phone.trim()) return "رقم الهاتف مطلوب";
    if (!form.email.trim()) return "البريد الإلكتروني مطلوب";
    if (!idFront) return "حمّل صورة الرقم القومي (الجانب الأمامي)";
    if (!idBack)  return "حمّل صورة الرقم القومي (الجانب الخلفي)";
    return "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOkMsg("");
    const v = validate();
    if (v) { setErrMsg(v); return; }

    try {
      setSaving(true); setErrMsg("");

      // نرسل Multipart لو الـ API عندك بتدعمه (شائع لما يكون فيه ملفات)
      const fd = new FormData();
      fd.append("entityId", form.entityId);
      fd.append("fullName", form.fullName.trim());
      fd.append("position", form.position.trim());
      fd.append("phone", form.phone.trim());
      fd.append("email", form.email.trim());
      if (form.note?.trim()) fd.append("note", form.note.trim());
      if (idFront) fd.append("idFront", idFront);
      if (idBack)  fd.append("idBack", idBack);

      const headers: HeadersInit = b64() ? { "x-session-b64": b64() } : {};
      const res = await fetch("/api/join-requests", { method: "POST", body: fd, headers, credentials: "include" });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "فشل الإرسال");

      setOkMsg("تم إرسال طلب الانضمام بنجاح.");
      setForm(p => ({ ...p, position: "", phone: "", email: session?.email || "", note: "" }));
      setIdFront(null); setIdBack(null);
    } catch (e: any) {
      setErrMsg(e?.message || "تعذر إرسال الطلب");
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: "#EFE6DE" }}>
      <div className="mx-auto max-w-3xl w-full px-4 py-8">
        <Card className="rounded-2xl" style={{ border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <CardHeader>
            <CardTitle>نموذج تقديم الأعضاء</CardTitle>
            <CardDescription>يرجى ملء جميع الحقول المشار إليها بعلامة (*)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-sm" style={{ color:"#6B6B6B" }}>جارٍ التحميل…</div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
                {/* رسائل توضيحية */}
                {!isUser && (
                  <div className="rounded-xl p-3 text-sm" style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#7A7A7A" }}>
                    هذه الصفحة مخصصة للمستخدمين فقط. لا يمكن للمشرف أو مسؤول الكيان تقديم طلب انضمام من هنا.
                  </div>
                )}
                {isMemberNow && (
                  <div className="rounded-xl p-3 text-sm" style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#7A7A7A" }}>
                    أنت بالفعل في كيان:{" "}
                    <strong>{entities.find(e => e.id === currentEntityId)?.name || currentEntityId}</strong> — يجب الخروج أولًا من
                    صفحة <span style={{ textDecoration: "underline" }}>الملف الشخصي</span> قبل التقديم لكيان جديد.
                  </div>
                )}
                {isSelectedCurrent && (
                  <div className="rounded-xl p-3 text-sm" style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#7A7A7A" }}>
                    لا يمكنك التقديم لنفس الكيان الذي أنت عضو فيه حاليًا.
                  </div>
                )}

                {errMsg && <div className="rounded-xl p-3 text-sm" style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#6B6B6B" }}>{errMsg}</div>}
                {okMsg  && <div className="rounded-xl p-3 text-sm" style={{ background:"#E8FFF1", border:"1px solid #C6F2D9", color:"#2D6A4F" }}>{okMsg}</div>}

                <Field label="اسم العضو (الاسم الثلاثي)*">
                  <Input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="h-11 rounded-xl"
                    style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                    disabled={!isUser}
                  />
                </Field>

                <Field label="الكيان*">
                  <Select
                    value={form.entityId}
                    onValueChange={(v) => setForm(p => ({ ...p, entityId: v }))}
                    disabled={!isUser || isMemberNow}
                  >
                    <SelectTrigger className="h-11 rounded-xl" style={{ background:"#FFFFFF", border:"1px solid #E3E3E3" }}>
                      <SelectValue placeholder="اختر الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isMemberNow && (
                    <p className="text-xs mt-1" style={{ color:"#6B6B6B" }}>
                      لا يمكن اختيار كيان أثناء كونك عضوًا حاليًا.
                    </p>
                  )}
                </Field>

                <Field label="المنصب داخل الكيان*">
                  <Input
                    required
                    value={form.position}
                    onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))}
                    className="h-11 rounded-xl"
                    style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                    placeholder="مثال: عضو متطوع / منسق نشاط"
                    disabled={!isUser}
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="رقم الهاتف*">
                    <Input
                      required
                      value={form.phone}
                      onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="h-11 rounded-xl"
                      style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                      disabled={!isUser}
                    />
                  </Field>
                  <Field label="بريدك الإلكتروني*">
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                      className="h-11 rounded-xl"
                      style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                      disabled={!isUser}
                    />
                  </Field>
                </div>

                <Field label="الرقم القومي (الجانب الأمامي)*">
                  <Input
                    required
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                    className="h-11 rounded-xl"
                    style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                    disabled={!isUser}
                  />
                  {idFront && <small className="text-xs" style={{ color:"#6B6B6B" }}>{idFront.name}</small>}
                </Field>

                <Field label="الرقم القومي (الجانب الخلفي)*">
                  <Input
                    required
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                    className="h-11 rounded-xl"
                    style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                    disabled={!isUser}
                  />
                  {idBack && <small className="text-xs" style={{ color:"#6B6B6B" }}>{idBack.name}</small>}
                </Field>

                <Field label="ملاحظات إضافية (اختياري)">
                  <Input
                    value={form.note}
                    onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                    className="h-11 rounded-xl"
                    style={{ background:"#FFFFFF", borderColor:"#E3E3E3" }}
                    disabled={!isUser}
                  />
                </Field>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="h-11 rounded-full font-semibold"
                    style={{ background:"#EC1A24", color:"#FFFFFF", opacity: isSubmitDisabled ? 0.6 : 1 }}
                  >
                    {saving ? "جارٍ الإرسال…" : "إرسال الطلب"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm" style={{ color:"#1D1D1D" }}>{label}</span>
      {children}
    </label>
  );
}
