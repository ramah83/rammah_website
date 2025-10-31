"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cairo } from "next/font/google";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, ShieldCheck, FilePlus2, Search, Building2, GitBranch, CheckCircle2, XCircle,
  UploadCloud, Pencil, Trash2, Check, X, FileText, LinkIcon, Tag, FileDown, Upload,
  FileSpreadsheet, AlertCircle, CheckCircle, Loader2
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400","600","700","800"], display: "swap" });

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };
type ISOStatus = "draft" | "submitted" | "review" | "approved" | "rejected";

type FormState = {
  code: string;
  title: string;
  ownerEntityId: string;
  status: ISOStatus;
  version: string;
  tags: string;
  description: string;
  fileUrl: string;
};

type ImportRow = Partial<FormState> & { __row?: number; __error?: string; __ok?: boolean; __id?: string };

const statusLabel: Record<ISOStatus, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};
const pillClass: Record<ISOStatus, string> = {
  draft: "bg-[#F6F6F6] text-[#1D1D1D] border border-[#E5E5E5]",
  submitted: "bg-[#FFF2F2] text-[#1D1D1D] border border-[#F2D6D6]",
  review: "bg-[#FFF8E8] text-[#1D1D1D] border border-[#F2E7C6]",
  approved: "bg-[#EAF8F0] text-[#1D1D1D] border border-[#CBEBDD]",
  rejected: "bg-[#FEEDEF] text-[#1D1D1D] border border-[#F5C9CF]",
};
const asISOStatus = (v: any): ISOStatus => {
  const allowed: ISOStatus[] = ["draft","submitted","review","approved","rejected"];
  return allowed.includes(v) ? (v as ISOStatus) : "draft";
};

function isPdf(u?: string|null) { return !!u && /\.pdf($|\?)/i.test(u); }
function isImage(u?: string|null) { return !!u && /\.(png|jpe?g|gif|webp|avif|bmp|svg)($|\?)/i.test(u); }

export default function ISOPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [entities, setEntities] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);

  // الجديد: نخزّن myEntityId الجاي من الـ API (meta) لو session.entityId فاضي
  const [myEntityId, setMyEntityId] = useState<string>("");

  // للمستخدم العادي فلتر الكيان ثابت على كيان المستخدم (أو myEntityId) + العام
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<ISOStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<FormState> | null>(null);
  const [showDetails, setShowDetails] = useState<null | any>(null);

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importErr, setImportErr] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{done:number; total:number}>({done:0,total:0});

  const canManage = (role?: UserRole | null) => role === "unionSupervisor";
  const canCreate = (role?: UserRole | null) => role === "unionSupervisor" || role === "entityManager";

  const [form, setForm] = useState<FormState>({
    code: "", title: "", ownerEntityId: "", status: "draft",
    version: "", tags: "", description: "", fileUrl: ""
  });

  const palette = { beige:"#EFE6DE", white:"#FFFFFF", soft:"#F6F6F6", border:"#E7E2DC", mut:"#6B6B6B", black:"#1D1D1D", red:"#EC1A24" };

  // ==== Helpers (auth header) ====
  function sessionHeaderB64() {
    try {
      const raw = localStorage.getItem("session") || "";
      return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
    } catch { return ""; }
  }
  const buildSessionHeaders = (contentType = true): HeadersInit => {
    const h: Record<string,string> = {};
    if (contentType) h["Content-Type"] = "application/json";
    const b64 = sessionHeaderB64();
    if (b64) h["x-session-b64"] = b64;
    return h;
  };

  async function uploadOne(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method:"POST", headers: buildSessionHeaders(false), body: fd, credentials:"include" });
    const txt = await r.text();
    let data: any = {};
    try { data = JSON.parse(txt); } catch {}
    if (!r.ok) throw new Error(data?.error || txt || "فشل رفع الملف");
    return String(data?.url || "");
  }

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : Array.isArray(data?.entities) ? data.entities : [];
    },
    getISO: async () => {
      const q = new URLSearchParams();
      // للمستخدم العادي: نمرر حالة/بحث فقط، والـ API يردّ ضمن النطاق + يرجّع meta.myEntityId
      if (session?.role !== "user") {
        if (filterEntity !== "all") q.set("entityId", filterEntity);
      }
      if (filterStatus !== "all") q.set("status", String(filterStatus));
      if (search.trim()) q.set("q", search.trim());
      const res = await fetch(`/api/iso?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/iso failed");
      const data = await res.json();
      // يدعم شكلين: Array أو {items, meta}
      if (Array.isArray(data)) return { items: data, meta: {} };
      return { items: Array.isArray(data?.items) ? data.items : [], meta: data?.meta || {} };
    },
    createISO: async (payload: FormState) => {
      const res = await fetch("/api/iso", {
        method: "POST",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "POST /api/iso failed");
      return JSON.parse(txt);
    },
    updateISO: async (id: string, payload: Partial<FormState>) => {
      const res = await fetch(`/api/iso/${id}`, {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "PATCH /api/iso/:id failed");
      return JSON.parse(txt);
    },
    deleteISO: async (id: string) => {
      const res = await fetch(`/api/iso/${id}`, {
        method: "DELETE",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "DELETE /api/iso/:id failed");
      return JSON.parse(txt);
    },
  };

  // ====== Session boot ======
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      const parsed = JSON.parse(s) as Session;
      setSession(parsed);

      // مبدئيًا للمستخدم العادي ثبّت الفلتر على كيانه لو موجود
      if (parsed.role === "user" && parsed.entityId) {
        setFilterEntity(String(parsed.entityId));
        setMyEntityId(String(parsed.entityId));
      }

      if (parsed.role === "entityManager" && parsed.entityId) {
        setForm(p => ({ ...p, ownerEntityId: String(parsed.entityId) }));
      }
    } catch { router.push("/"); }
  }, [router]);

  // ====== Load lists ======
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErrMsg("");
      try {
        const ents = await api.getEntities().catch(() => []);
        const { items, meta } = await api.getISO();

        if (!mounted) return;
        setEntities(Array.isArray(ents) ? ents : []);
        setList(Array.isArray(items) ? items : []);

        // لو المستخدم العادي ومفيش entityId في الـ session، استخدم meta.myEntityId من السيرفر
        if (session?.role === "user") {
          const serverMyId = String(meta?.myEntityId || "");
          if (!session.entityId && serverMyId) {
            setMyEntityId(serverMyId);
            setFilterEntity(serverMyId); // لتناسق الفلاتر/الواجهة
          }
        }

        if (session?.role === "entityManager" && session.entityId && !form.ownerEntityId) {
          setForm(p => ({ ...p, ownerEntityId: String(session.entityId) }));
        }
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message || "تعذّر تحميل البيانات");
        setList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEntity, filterStatus, search, session?.role, session?.entityId]);

  // ====== فلترة واجهة ======
  const effectiveEntityId = useMemo(
    () => String(session?.entityId || myEntityId || ""),
    [session?.entityId, myEntityId]
  );

  const filtered = useMemo(() => {
    let data = Array.isArray(list) ? [...list] : [];

    if (session?.role === "user") {
      const myId = effectiveEntityId;
      data = data.filter(
        (it) => String(it.ownerEntityId) === myId || String(it.ownerEntityId) === "all"
      );
    }

    if (filterStatus !== "all") {
      data = data.filter((it) => String(it.status) === String(filterStatus));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((it) => {
        const code = String(it.code || "").toLowerCase();
        const title = String(it.title || "").toLowerCase();
        const tagsArr = Array.isArray(it.tags)
          ? it.tags
          : String(it.tags || "")
              .split(",")
              .map((s: string) => s.trim());
        const tagsStr = tagsArr.join(" ").toLowerCase();
        return code.includes(q) || title.includes(q) || tagsStr.includes(q);
      });
    }

    if (session?.role !== "user" && filterEntity !== "all") {
      data = data.filter((it) => String(it.ownerEntityId) === String(filterEntity));
    }

    return data;
  }, [list, filterEntity, filterStatus, search, session?.role, effectiveEntityId]);

  if (!session) return null;

  const resetForm = () =>
    setForm({
      code: "",
      title: "",
      ownerEntityId: String(session?.entityId || ""),
      status: "draft",
      version: "",
      tags: "",
      description: "",
      fileUrl: ""
    });

  const refreshISO = async () => {
    try {
      const { items, meta } = await api.getISO();
      setList(Array.isArray(items) ? items : []);
      if (session?.role === "user" && !session.entityId && meta?.myEntityId) {
        setMyEntityId(String(meta.myEntityId));
      }
    } catch {
      setList([]);
    }
  };

  // ====== Create ======
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate(session.role)) return;
    if (!form.code.trim()) return alert("كود النموذج مطلوب");
    if (!form.title.trim()) return alert("عنوان النموذج مطلوب");
    if (!form.ownerEntityId) return alert("اختر الكيان");
    setSaving(true);
    try {
      const payload = session.role === "entityManager"
        ? { ...form, ownerEntityId: String(session.entityId || "") }
        : form;
      await api.createISO(payload as FormState);
      await refreshISO();
      resetForm();
    } catch (err: any) {
      alert(typeof err?.message === "string" && err.message ? err.message : "حدث خطأ");
    } finally { setSaving(false); }
  };

  // ====== Status change ======
  const nextActions = (st: ISOStatus, role: UserRole) => {
    if (role === "unionSupervisor") {
      switch (st) {
        case "draft":     return ["submitted", "review", "approved", "rejected"];
        case "submitted": return ["review", "approved", "rejected"];
        case "review":    return ["approved", "rejected"];
        default:          return ["draft", "submitted", "review", "approved", "rejected"];
      }
    }
    switch (st) {
      case "draft":     return ["submitted"];
      case "submitted": return ["review"];
      default:          return [];
    }
  };

  // ====== Edit / Delete ======
  const startEdit = (it: any) => {
    setEditingId(it.id);
    setEditDraft({
      title: it.title ?? "",
      code: it.code ?? "",
      ownerEntityId: String(it.ownerEntityId ?? ""),
      status: it.status as ISOStatus,
      version: it.version ?? "",
      tags: Array.isArray(it.tags) ? it.tags.join(",") : (it.tags || ""),
      description: it.description ?? "",
      fileUrl: it.fileUrl ?? "",
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const confirmEdit = async () => {
    if (!editingId || !editDraft) return;
    try {
      const payload: Partial<FormState> = {
        title: (editDraft.title || "").trim(),
        code: (editDraft.code || "").trim(),
        status: (editDraft.status || "draft") as ISOStatus,
        version: (editDraft.version || "").trim(),
        tags: (editDraft.tags || "").trim(),
        description: (editDraft.description || "").trim(),
        fileUrl: (editDraft.fileUrl || "").trim(),
      };
      if (session.role === "unionSupervisor" && editDraft.ownerEntityId) {
        payload.ownerEntityId = String(editDraft.ownerEntityId);
      }
      await api.updateISO(editingId, payload);
      await refreshISO(); cancelEdit();
    } catch (e: any) { alert(e?.message || "فشل التعديل"); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("حذف النموذج؟")) return;
    try { await api.deleteISO(id); await refreshISO(); }
    catch (e: any) { alert(e?.message || "فشل الحذف"); }
  };

  // ====== Upload handlers ======
  async function onUploadNew(file?: File | null) {
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadOne(file);
      setForm(p => ({ ...p, fileUrl: url }));
    } catch (e:any) {
      alert(e?.message || "فشل الرفع");
    } finally { setSaving(false); }
  }
  async function onUploadEdit(file?: File | null) {
    if (!file || !editDraft) return;
    setSaving(true);
    try {
      const url = await uploadOne(file);
      setEditDraft(p => ({ ...(p || {}), fileUrl: url }));
    } catch (e:any) {
      alert(e?.message || "فشل الرفع");
    } finally { setSaving(false); }
  }

  // ====== IMPORT (CSV/JSON) ======
  function makeTemplateCSV() {
    const header = ["code","title","version","tags","description","fileUrl","ownerEntityId","status"];
    const rows = [
      ["ISO-001","سياسة الحضور","1.0","لوائح,حضور","سياسة حضور الفعاليات","https://example.com/file.pdf","all","approved"],
      ["ISO-002","إجراءات الشكاوى","1.2","شكاوى,إجراءات","","","","submitted"],
    ];
    const csv = [header.join(","), ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "iso-template.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = splitCSVLine(lines[0]).map(h => h.trim());
    const out: ImportRow[] = [];
    for (let i=1;i<lines.length;i++){
      const cols = splitCSVLine(lines[i]);
      const rec: Record<string,string> = {};
      header.forEach((h,idx)=> rec[h] = (cols[idx] ?? "").trim());
      out.push(csvRecToRow(rec, i+1));
    }
    return out;
  }
  function splitCSVLine(line: string): string[] {
    const res: string[] = [];
    let cur = "", q = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (ch === '"' ){
        if (q && line[i+1] === '"'){ cur += '"'; i++; }
        else { q = !q; }
      } else if (ch === "," && !q) {
        res.push(cur); cur = "";
      } else cur += ch;
    }
    res.push(cur);
    return res;
  }
  function csvRecToRow(rec: Record<string,string>, rowNum: number): ImportRow {
    const normalizeStatus = (v: string): ISOStatus | undefined => {
      const map: Record<string, ISOStatus> = {
        "draft":"draft","مسودة":"draft",
        "submitted":"submitted","مقدم":"submitted","مُقدَّم":"submitted","مقدّم":"submitted",
        "review":"review","مراجعة":"review","قيد المراجعة":"review",
        "approved":"approved","معتمد":"approved",
        "rejected":"rejected","مرفوض":"rejected",
      };
      return map[(v||"").toLowerCase()] as ISOStatus || undefined;
    };
    const row: ImportRow = {
      __row: rowNum,
      code: rec.code || "",
      title: rec.title || "",
      version: rec.version || "",
      tags: rec.tags || "",
      description: rec.description || "",
      fileUrl: rec.fileUrl || "",
      ownerEntityId: rec.ownerEntityId || "",
      status: normalizeStatus(rec.status || "") || "draft",
    };
    return validateRow(row);
  }
  function parseJSON(text: string): ImportRow[] {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : [data];
      return arr.map((x,idx)=>validateRow({
        __row: idx+1,
        code: x.code || "",
        title: x.title || "",
        version: x.version || "",
        tags: Array.isArray(x.tags) ? x.tags.join(",") : (x.tags || ""),
        description: x.description || "",
        fileUrl: x.fileUrl || "",
        ownerEntityId: x.ownerEntityId || "",
        status: (x.status as ISOStatus) || "draft",
      }));
    } catch {
      return [];
    }
  }
  function validateRow(r: ImportRow): ImportRow {
    let err = "";
    if (!r.code) err = "الكود مطلوب";
    else if (!r.title) err = "العنوان مطلوب";
    if (session?.role === "entityManager") {
      r.ownerEntityId = String(session.entityId || "");
    } else if (!r.ownerEntityId) {
      r.ownerEntityId = "";
    }
    return { ...r, __error: err || undefined };
  }

  async function handleImportFile(file?: File|null) {
    setImportErr("");
    setImportRows([]);
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    try {
      const text = await file.text();
      let rows: ImportRow[] = [];
      if (ext === "csv") rows = parseCSV(text);
      else if (ext === "json") rows = parseJSON(text);
      else { setImportErr("صيغة غير مدعومة. استخدم CSV أو JSON."); return; }
      if (!rows.length) { setImportErr("الملف فارغ أو غير صالح."); return; }
      setImportRows(rows);
    } catch { setImportErr("تعذّر قراءة الملف."); }
  }

  async function startBulkImport() {
    if (!canCreate(session?.role)) return;
    if (!importRows.length) return;
    setImporting(true);
    setImportProgress({done:0,total:importRows.length});
    const next = [...importRows];

    for (let i=0;i<next.length;i++){
      const row = next[i];
      if (!row.code || !row.title){
        next[i] = { ...row, __error:"حقول ناقصة (code/title)", __ok:false };
        setImportRows([...next]); setImportProgress(p=>({ ...p, done: i+1 })); continue;
      }
      const ownerEntityId = session?.role === "entityManager"
        ? String(session?.entityId || "")
        : (row.ownerEntityId || String(form.ownerEntityId || ""));

      if (!ownerEntityId){
        next[i] = { ...row, __error:"حدد ownerEntityId في الملف أو من حقول النموذج أعلى الصفحة", __ok:false };
        setImportRows([...next]); setImportProgress(p=>({ ...p, done: i+1 })); continue;
      }

      const payload: FormState = {
        code: row.code || "",
        title: row.title || "",
        ownerEntityId,
        status: (row.status as ISOStatus) || "draft",
        version: row.version || "",
        tags: row.tags || "",
        description: row.description || "",
        fileUrl: row.fileUrl || "",
      };

      try {
        const res = await api.createISO(payload);
        next[i] = { ...row, __ok:true, __id: res?.id };
      } catch (e:any) {
        next[i] = { ...row, __ok:false, __error: e?.message || "فشل الحفظ" };
      }
      setImportRows([...next]);
      setImportProgress(p=>({ ...p, done: i+1 }));
    }

    setImporting(false);
    await refreshISO();
  }

  // ====== UI ======
  return (
    <div dir="rtl" className={`${cairo.className} relative min-h-screen overflow-hidden flex flex-col`} style={{ backgroundColor: palette.beige }}>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes popIn  { from { opacity: 0; transform: scale(.98) } to { opacity: 1; transform: scale(1) } }
        .anim-fadeUp { animation: fadeUp .35s ease both }
        .anim-popIn { animation: popIn .28s ease both }
        .card-hover { transition: transform .25s ease, box-shadow .25s ease }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.08) }
      `}</style>

      <HeaderBar />

      {/* Header card */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8 anim-fadeUp">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between card-hover"
             style={{ backgroundColor: palette.white, border: `1px solid ${palette.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color={palette.black} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: palette.black }}>نماذج ISO (إجراءات وسياسات)</h1>
              <p className="text-sm" style={{ color: palette.mut }}>مكتبة النماذج، سير الاعتماد، وسجل التدقيق</p>
            </div>
          </div>

          {canCreate(session?.role) && (
            <div className="flex items-center gap-2">
              <button
                onClick={()=>setShowImport(true)}
                className="h-9 px-3 rounded-full text-sm text-white"
                style={{ backgroundColor: palette.red, border:"1px solid #E5E5E5" }}
              >
                استيراد من ملف
              </button>
            </div>
          )}
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: palette.black }}>
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3 anim-fadeUp"
               style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: palette.mut }}>
            {errMsg}
          </div>
        )}

        {/* إنشاء يدوي */}
        {canCreate(session?.role) && (
          <SurfaceCard className="mx-3 sm:mx-[1cm] anim-popIn card-hover">
            <CardHeader className="pb-0 px-5 pt-5">
              <CardTitle className="flex items-center gap-2">
                <FilePlus2 className="h-5 w-5" color={palette.black} />
                إنشاء نموذج ISO
              </CardTitle>
              <CardDescription style={{ color: palette.mut }}>أدخل بيانات النموذج وارفع الملف إن وُجد</CardDescription>
            </CardHeader>

            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

            <CardContent className="px-5 pb-5">
              <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="كود النموذج">
                  <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                         className="h-11 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}/>
                </Field>

                <Field label="عنوان النموذج" className="md:col-span-2">
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                         className="h-11 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}/>
                </Field>

                <Field label="النسخة">
                  <Input value={form.version} onChange={(e) => setForm(p => ({ ...p, version: e.target.value }))}
                         className="h-11 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}/>
                </Field>

                <Field label="وسوم (مفصولة بفواصل)">
                  <div className="relative">
                    <Tag className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                    <Input value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))}
                           className="pr-8 h-11 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}/>
                  </div>
                </Field>

                {/* رابط أو رفع ملف */}
                <Field label="ملف النموذج">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="relative">
                      <LinkIcon className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                      <Input value={form.fileUrl} onChange={(e) => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                             className="pr-8 h-11 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}
                             placeholder="https://… (أو ارفع ملفًا بالأسفل)"/>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 h-10 px-3 rounded-full cursor-pointer"
                             style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: palette.black }}>
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">رفع ملف</span>
                        <input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className="hidden"
                               onChange={(e)=> onUploadNew(e.target.files?.[0] || null)} />
                      </label>
                      {!!form.fileUrl && (
                        <a href={form.fileUrl} target="_blank" rel="noreferrer" className="text-xs underline">فتح الملف الحالي</a>
                      )}
                    </div>
                  </div>
                </Field>

                <Field label="الكيان المالك">
                  <Select
                    value={String(form.ownerEntityId)}
                    onValueChange={(v) => setForm((p) => ({ ...p, ownerEntityId: v }))}
                    disabled={session?.role === "entityManager"}
                  >
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                      <SelectValue placeholder={session?.role === "entityManager" ? "كيانك" : "اختر الكيان"} />
                    </SelectTrigger>
                    <SelectContent>
                      {session?.role === "unionSupervisor" && <SelectItem value="all">كل الكيانات (عام)</SelectItem>}
                      {entities.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="الوصف" className="md:col-span-3">
                  <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                            className="w-full min-h-[90px] rounded-xl p-3 border"
                            style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}/>
                </Field>

                <Field label="الحالة">
                  <Select value={form.status} onValueChange={(v: ISOStatus) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="submitted">مُقدَّم</SelectItem>
                      <SelectItem value="review">قيد المراجعة</SelectItem>
                      {session?.role === "unionSupervisor" && (
                        <>
                          <SelectItem value="approved">معتمد</SelectItem>
                          <SelectItem value="rejected">مرفوض</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="md:col-span-3 flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving || loading || !form.ownerEntityId}
                          className="gap-2 h-11 rounded-full font-semibold"
                          style={{ backgroundColor: palette.red, color: "#FFFFFF" }}>
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </Button>
                </div>

                {!!form.fileUrl && (
                  <div className="md:col-span-3">
                    <div className="rounded-xl border overflow-hidden anim-popIn" style={{ borderColor:"#EDE8E1", background:"#FAFAFA" }}>
                      {isPdf(form.fileUrl) ? (
                        <iframe src={form.fileUrl} className="w-full h-56" />
                      ) : isImage(form.fileUrl) ? (
                        <img src={form.fileUrl} alt="ملف" className="w-full h-56 object-cover" />
                      ) : (
                        <div className="p-3 text-xs break-all">{form.fileUrl}</div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </SurfaceCard>
        )}

        {/* القائمة + الفلاتر */}
        <SurfaceCard className="mx-3 sm:mx-[1cm] anim-popIn card-hover">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>قائمة النماذج</CardTitle>
            <CardDescription style={{ color: palette.mut }}>
              {session.role === "user"
                ? "ستظهر لك نماذج كيانك بالإضافة إلى النماذج العامة. يمكنك البحث وتغيير حالة العرض."
                : "فلترة حسب الكيان/الحالة أو البحث بالكود/العنوان/الوسوم"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {/* فلاتر المشرف/مدير الكيان */}
            {session.role !== "user" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Field label="فلتر الكيان">
                  <Select value={filterEntity} onValueChange={setFilterEntity}>
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                      <SelectValue placeholder="جميع الكيانات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الكيانات</SelectItem>
                      {entities.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="فلتر الحالة">
                  <Select value={filterStatus} onValueChange={(v: ISOStatus | "all") => setFilterStatus(v)}>
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                      <SelectValue placeholder="كل الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="submitted">مُقدَّم</SelectItem>
                      <SelectItem value="review">قيد المراجعة</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="md:col-span-2">
                  <Label className="text-sm" style={{ color: palette.black }}>بحث</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                    <Input placeholder="ابحث بالكود/العنوان/الوسوم..." className="pr-9 h-11 rounded-xl"
                           style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}
                           value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* فلاتر المستخدم العادي: كيان ثابت + فلتر حالة + بحث */}
            {session.role === "user" && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                {/* شارة الكيان (ثابت) */}
                <div className="md:col-span-2">
                  <Label className="text-sm" style={{ color: palette.black }}>كيانك</Label>
                  <div className="h-11 rounded-xl flex items-center px-3"
                       style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: palette.black }}>
                    <Building2 className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {entities.find((e)=> String(e.id)===effectiveEntityId)?.name
                        || (effectiveEntityId ? `كيان #${effectiveEntityId}` : "—")}
                      {" "} + النماذج العامة
                    </span>
                  </div>
                </div>

                {/* فلتر الحالة */}
                <div className="md:col-span-2">
                  <Field label="فلتر الحالة">
                    <Select value={filterStatus} onValueChange={(v: ISOStatus | "all") => setFilterStatus(v)}>
                      <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                        <SelectValue placeholder="كل الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="submitted">مُقدَّم</SelectItem>
                        <SelectItem value="review">قيد المراجعة</SelectItem>
                        <SelectItem value="approved">معتمد</SelectItem>
                        <SelectItem value="rejected">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {/* البحث */}
                <div className="md:col-span-2">
                  <Label className="text-sm" style={{ color: palette.black }}>بحث</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                    <Input placeholder="ابحث بالكود/العنوان/الوسوم..." className="pr-9 h-11 rounded-xl"
                           style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}
                           value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-10 anim-fadeUp" style={{ color: "#7A7A7A" }}>
                {loading ? "جارٍ التحميل..." : "لا توجد نماذج بعد"}
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((f: any, i: number) => {
                  const ent = entities.find((e) => String(e.id) === String(f.ownerEntityId));
                  const acts = nextActions(f.status as ISOStatus, session!.role as UserRole);
                  const isEdit = editingId === f.id;
                  const tags = Array.isArray(f.tags) ? f.tags :
                    (typeof f.tags === "string" && f.tags ? f.tags.split(",").map((s:string)=>s.trim()).filter(Boolean) : []);

                  return (
                    <li key={f.id} className="rounded-2xl p-4 anim-fadeUp card-hover"
                        style={{ backgroundColor: palette.white, border: `1px solid ${palette.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)", animationDelay: `${i*40}ms` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full space-y-2">
                          {isEdit ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input value={editDraft?.title || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), title: e.target.value }))}
                                     className="h-10 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }}/>
                              <Input value={editDraft?.code || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), code: e.target.value }))}
                                     className="h-10 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }} placeholder="الكود"/>
                              <Input value={editDraft?.version || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), version: e.target.value }))}
                                     className="h-10 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }} placeholder="النسخة"/>
                              <Input value={editDraft?.tags || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), tags: e.target.value }))}
                                     className="h-10 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }} placeholder="وسوم مفصولة بفواصل"/>
                              <div className="md:col-span-2 grid grid-cols-1 gap-2">
                                <Input value={editDraft?.fileUrl || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), fileUrl: e.target.value }))}
                                       className="h-10 rounded-xl" style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }} placeholder="رابط الملف"/>
                                <label className="inline-flex items-center gap-2 h-10 px-3 rounded-full cursor-pointer w-max"
                                       style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: palette.black }}>
                                  <Upload className="h-4 w-4" />
                                  <span className="text-sm">رفع ملف جديد</span>
                                  <input type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className="hidden"
                                         onChange={(e)=> onUploadEdit(e.target.files?.[0] || null)} />
                                </label>
                              </div>
                              <div className="md:col-span-2">
                                <textarea value={editDraft?.description || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), description: e.target.value }))}
                                          className="w-full min-h-[80px] rounded-xl p-3 border"
                                          style={{ backgroundColor: palette.white, color: palette.black, borderColor: "#E3E3E3" }} placeholder="وصف مختصر"/>
                              </div>
                              <div>
                                <Select value={String(editDraft?.ownerEntityId || f.ownerEntityId)} onValueChange={(v) => setEditDraft(p => ({ ...(p as any), ownerEntityId: v }))} disabled={session?.role !== "unionSupervisor"}>
                                  <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">كل الكيانات (عام)</SelectItem>
                                    {entities.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Select value={String(editDraft?.status || f.status)} onValueChange={(v: ISOStatus) => setEditDraft(p => ({ ...(p as any), status: v }))}>
                                  <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: palette.white, border: "1px solid #E3E3E3", color: palette.black }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">مسودة</SelectItem>
                                    <SelectItem value="submitted">مُقدَّم</SelectItem>
                                    <SelectItem value="review">قيد المراجعة</SelectItem>
                                    <SelectItem value="approved">معتمد</SelectItem>
                                    <SelectItem value="rejected">مرفوض</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {!!editDraft?.fileUrl && (
                                <div className="md:col-span-2">
                                  <div className="rounded-xl border overflow-hidden anim-popIn" style={{ borderColor:"#EDE8E1", background:"#FAFAFA" }}>
                                    {isPdf(editDraft.fileUrl) ? (
                                      <iframe src={editDraft.fileUrl} className="w-full h-56" />
                                    ) : isImage(editDraft.fileUrl) ? (
                                      <img src={editDraft.fileUrl} alt="ملف" className="w-full h-56 object-cover" />
                                    ) : (
                                      <div className="p-3 text-xs break-all">{editDraft.fileUrl}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold flex items-center gap-2" style={{ color: palette.black }}>
                                <FileText className="h-4 w-4" /> {f.title}
                                {f.version && <span className="text-xs px-2 h-6 inline-flex items-center rounded-full" style={{ background:"#F6F6F6", border:"1px solid #E5E5E5" }}>v{f.version}</span>}
                              </div>
                              <div className="text-xs" style={{ color: palette.mut }}>الكود: {f.code || "—"}</div>
                              <div className="text-xs flex items-center gap-1" style={{ color: palette.mut }}>
                                <Building2 className="h-3 w-3" color={palette.mut} />
                                <span>{f.ownerEntityId === "all" ? "عام (كل الكيانات)" : (ent?.name || "بدون كيان")}</span>
                              </div>
                              {Array.isArray(tags) && tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {tags.map((t: string, i: number) => (
                                    <span key={t+i} className="text-[11px] px-2 h-6 inline-flex items-center rounded-full"
                                          style={{ background:"#FAFAFA", border:"1px solid #EDEDED", color:"#555" }}>
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {f.description && <div className="text-sm pt-1" style={{ color:palette.black }}>{f.description}</div>}
                              {f.fileUrl && (
                                <div className="pt-2">
                                  <a href={f.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                                    <FileDown className="h-4 w-4" /> فتح/تنزيل الملف
                                  </a>
                                  <div className="mt-2 rounded-lg border overflow-hidden" style={{ borderColor:"#EDE8E1" }}>
                                    {isPdf(f.fileUrl) ? (
                                      <iframe src={f.fileUrl} className="w-full h-56" />
                                    ) : isImage(f.fileUrl) ? (
                                      <img src={f.fileUrl} alt="ملف" className="w-full h-56 object-cover" />
                                    ) : (
                                      <div className="p-2 text-xs break-all">{f.fileUrl}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs ${pillClass[f.status as ISOStatus]}`}>
                            {statusLabel[f.status as ISOStatus]}
                          </span>

                          {(canManage(session?.role) || session?.role === "entityManager") && (
                            <div className="flex items-center gap-2 mt-1">
                              {isEdit ? (
                                <>
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={confirmEdit}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {nextActions(f.status as ISOStatus, session!.role as UserRole).map(a => (
                                    <button key={a} onClick={() => api.updateISO(f.id, { status: a as ISOStatus }).then(refreshISO).catch((e)=>alert(e?.message||"تعذر تغيير الحالة"))}
                                            className="h-8 px-3 rounded-full text-xs"
                                            style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: palette.black }}
                                            title={`تغيير إلى ${statusLabel[a as ISOStatus]}`}>
                                      <span className="inline-flex items-center gap-1">
                                        {a === "submitted" && <UploadCloud className="h-4 w-4" />}
                                        {a === "review" && <GitBranch className="h-4 w-4" />}
                                        {a === "approved" && <CheckCircle2 className="h-4 w-4" />}
                                        {a === "rejected" && <XCircle className="h-4 w-4" />}
                                        {statusLabel[a as ISOStatus]}
                                      </span>
                                    </button>
                                  ))}
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={() => startEdit(f)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button className="h-8 px-2 rounded-full" style={{ backgroundColor: palette.red }} onClick={() => onDelete(f.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}

                          <button className="text-xs underline mt-1" onClick={() => setShowDetails(f)}>التفاصيل</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </SurfaceCard>
      </main>

      {showDetails && (<DetailsModal onClose={()=>setShowDetails(null)} item={showDetails} />)}

      <ImportISOFromFileModal
        open={showImport}
        onClose={() => { setShowImport(false); }}
        importRows={importRows}
        importErr={importErr}
        importing={importing}
        importProgress={importProgress}
        onPickFile={handleImportFile}
        onDownloadTemplate={makeTemplateCSV}
        onStartImport={startBulkImport}
        role={session?.role}
        entityId={String(effectiveEntityId || "")}
      />
    </div>
  );
}

function DetailsModal({ item, onClose }:{ item:any; onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl anim-popIn" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">تفاصيل النموذج</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="font-semibold text-lg">{item.title}</div>
            <div className="text-sm text-[#666]">الكود: {item.code}</div>
            {item.version && <div className="text-sm text-[#666]">الإصدار: v{item.version}</div>}
            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t:string, i:number) => (
                  <span key={t+i} className="text-[11px] px-2 h-6 inline-flex items-center rounded-full" style={{ background:"#FAFAFA", border:"1px solid #EDEDED", color:"#555" }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {item.description && (
              <div className="rounded-xl border p-3 bg-white anim-fadeUp" style={{ borderColor:"#EDE8E1" }}>
                <div className="text-sm">{item.description}</div>
              </div>
            )}
            {item.fileUrl && (
              <div className="rounded-xl border p-3 bg-white anim-fadeUp" style={{ borderColor:"#EDE8E1" }}>
                <div className="text-sm mb-2">رابط الملف</div>
                <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                  <FileDown className="h-4 w-4" /> فتح/تنزيل
                </a>
                <div className="mt-2 rounded-lg border overflow-hidden" style={{ borderColor:"#F1EEE8" }}>
                  {isPdf(item.fileUrl) ? (
                    <iframe src={item.fileUrl} className="w-full h-60" />
                  ) : isImage(item.fileUrl) ? (
                    <img src={item.fileUrl} alt="ملف" className="w-full h-60 object-cover" />
                  ) : (
                    <div className="p-2 text-xs break-all">{item.fileUrl}</div>
                  )}
                </div>
              </div>
            )}
            <div className="text-xs text-[#777]">الحالة الحالية: {statusLabel[item.status as ISOStatus] || item.status}</div>
            {item.createdAt && <div className="text-xs text-[#777]">تاريخ الإنشاء: {new Date(item.createdAt).toLocaleString("ar-EG")}</div>}
            {item.updatedAt && <div className="text-xs text-[#777]">آخر تحديث: {new Date(item.updatedAt).toLocaleString("ar-EG")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function ImportISOFromFileModal({
  open, onClose,
  importRows, importErr, importing, importProgress,
  onPickFile, onDownloadTemplate, onStartImport,
  role, entityId
}:{
  open: boolean;
  onClose: ()=>void;
  importRows: any[];
  importErr: string;
  importing: boolean;
  importProgress: {done:number; total:number};
  onPickFile: (file?: File|null)=>void;
  onDownloadTemplate: ()=>void;
  onStartImport: ()=>void;
  role?: "unionSupervisor" | "entityManager" | "user" | null;
  entityId?: string|null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-5xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl anim-popIn" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="h-5 w-5" />
              استيراد نماذج ISO من ملف
            </div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onDownloadTemplate} variant="secondary" className="h-10 rounded-full gap-2"
                      style={{ background:"#F6F6F6", border:"1px solid #E5E5E5", color: "#1D1D1D" }}>
                <FileSpreadsheet className="h-4 w-4" /> تنزيل قالب CSV
              </Button>
              <span className="text-xs" style={{ color:"#6B6B6B" }}>
                صيغ مدعومة: CSV أو JSON. {role==="entityManager" && <>سيتم تجاهل <code>ownerEntityId</code> واستبداله بكيانك ({entityId ?? "—"}).</>}
              </span>
            </div>

            <label
              className="grid place-items-center rounded-2xl border border-dashed p-6 text-center anim-fadeUp"
              style={{ borderColor:"#E7E2DC", background:"#FAFAFA" }}
              onDragOver={(e)=>{ e.preventDefault(); (e.currentTarget as any).style.background="#F2F2F2"; }}
              onDragLeave={(e)=>{ e.preventDefault(); (e.currentTarget as any).style.background="#FAFAFA"; }}
              onDrop={(e)=>{ e.preventDefault(); (e.currentTarget as any).style.background="#FAFAFA"; onPickFile(e.dataTransfer?.files?.[0]); }}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6" />
                <div className="text-sm">اسحب الملف هنا أو اختره</div>
                <div className="text-[12px]" style={{ color:"#6B6B6B" }}>CSV أو JSON</div>
              </div>
              <input type="file" accept=".csv,.json" className="hidden" onChange={e=>onPickFile(e.target.files?.[0] || null)} />
            </label>

            {!!importErr && (
              <div className="rounded-xl p-3 text-sm flex items-center gap-2"
                   style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#6B4E00" }}>
                <AlertCircle className="h-4 w-4" /> {importErr}
              </div>
            )}

            {importRows.length > 0 && (
              <>
                <div className="text-sm" style={{ color:"#6B6B6B" }}>
                  تم تحميل <b>{importRows.length}</b> صف. راجع المعاينة ثم اضغط “حفظ العناصر”.
                </div>

                <div className="rounded-xl border overflow-auto" style={{ borderColor:"#E7E2DC" }}>
                  <table className="w-full text-sm min-w-[900px]">
                    <thead style={{ background:"#F6F6F6" }}>
                      <tr>
                        {["#","code","title","version","ownerEntityId","status","tags","fileUrl","الوصف","النتيجة"].map(h=>(
                          <th key={h} className="text-right px-3 py-2 border-b" style={{ borderColor: "#EDE8E1" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r:any,idx:number)=>{
                        const st = asISOStatus(r.status);
                        return (
                          <tr key={idx} className="align-top">
                            <td className="px-3 py-2 border-b" style={{ borderColor:"#F1EEE8" }}>{r.__row}</td>
                            <td className="px-3 py-2 border-b break-all" style={{ borderColor:"#F1EEE8" }}>{r.code}</td>
                            <td className="px-3 py-2 border-b break-all" style={{ borderColor:"#F1EEE8" }}>{r.title}</td>
                            <td className="px-3 py-2 border-b" style={{ borderColor:"#F1EEE8" }}>{r.version}</td>
                            <td className="px-3 py-2 border-b" style={{ borderColor:"#F1EEE8" }}>
                              {role==="entityManager" ? (entityId || "كيانك") : (r.ownerEntityId || <span className="text-[#B00020]">—</span>)}
                            </td>
                            <td className="px-3 py-2 border-b" style={{ borderColor:"#F1EEE8" }}>
                              <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs ${pillClass[st]}`}>
                                {statusLabel[st]}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-b break-all" style={{ borderColor:"#F1EEE8" }}>{r.tags}</td>
                            <td className="px-3 py-2 border-b break-all" style={{ borderColor:"#F1EEE8" }}>
                              {r.fileUrl ? <a className="underline" href={r.fileUrl} target="_blank">فتح</a> : "—"}
                            </td>
                            <td className="px-3 py-2 border-b break-all" style={{ borderColor:"#F1EEE8" }}>
                              {r.description ? (r.description.length>60 ? r.description.slice(0,60)+"…" : r.description) : "—"}
                            </td>
                            <td className="px-3 py-2 border-b" style={{ borderColor:"#F1EEE8" }}>
                              {r.__ok ? (
                                <span className="inline-flex items-center gap-1 text-[#0F5132]"><CheckCircle className="h-4 w-4" /> تم</span>
                              ) : r.__error ? (
                                <span className="inline-flex items-center gap-1 text-[#7A0010]"><AlertCircle className="h-4 w-4" /> {r.__error}</span>
                              ) : (
                                <span className="text-[#6B6B6B]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {importing ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center gap-2 text-sm" style={{ color:"#6B6B6B" }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جارٍ الحفظ… {importProgress.done}/{importProgress.total}
                      </div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"#F1EEE8" }}>
                        <div className="h-full" style={{
                          width: `${Math.round((importProgress.done/importProgress.total)*100)}%`,
                          background: "#EC1A24", transition:"width .25s ease"
                        }}/>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs" style={{ color:"#6B6B6B" }}>
                        تأكد من وجود <b>code</b> و<b>title</b> لكل صف.
                      </span>
                      <Button onClick={onStartImport} disabled={!importRows.length}
                              className="h-10 rounded-full font-semibold" style={{ backgroundColor:"#EC1A24", color:"#fff" }}>
                        حفظ {importRows.length} عنصر
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className={`${cairo.className} relative z-10 anim-fadeUp`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 card-hover"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/iso", label: "نماذج ISO" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                    className="px-3 py-1 rounded-lg transition"
                    style={{ color: active(l.href) ? "#FFFFFF" : "#1D1D1D", backgroundColor: active(l.href) ? "#EC1A24" : "transparent" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-sm" style={{ color: "#1D1D1D" }}>{label}</span>
      {children}
    </label>
  );
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}
