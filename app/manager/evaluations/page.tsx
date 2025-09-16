// app/manager/evaluations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Cairo } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

const cairo = Cairo({ subsets:["arabic","latin"], weight:["400","600","700","800"], display:"swap" });

type Role = "unionSupervisor" | "entityManager" | "user";
type Session = { id:string; name:string; email:string; role:Role; entityId?:string|null };

const PALETTE = { black:"#1D1D1D", red:"#EC1A24", beige:"#EFE6DE", border:"#E7E2DC", soft:"#F6F6F6", muted:"#6B6B6B" };

function buildSessionHeaders(): HeadersInit {
  const h: Record<string,string> = {};
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

function isPdf(u?: string|null) { return !!u && /\.pdf($|\?)/i.test(u); }
function isImage(u?: string|null) { return !!u && /\.(png|jpe?g|gif|webp|avif|bmp|svg)($|\?)/i.test(u); }

export default function ManagerEvaluationsPage() {
  const [session, setSession] = useState<Session|null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(()=> {
    try { const raw = localStorage.getItem("session"); if (raw) setSession(JSON.parse(raw)); } catch {}
  }, []);

  useEffect(()=> {
    if (!session || session.role !== "entityManager") return;
    setLoading(true); setErr("");
    const q = session.entityId ? `?entityId=${encodeURIComponent(String(session.entityId))}` : "";
    fetch(`/api/new-evaluations${q}`, { cache:"no-store", headers: buildSessionHeaders() })
      .then(async r => r.ok ? r.json() : Promise.reject(await r.text().catch(()=> "تعذر التحميل")))
      .then((arr:any[]) => setRows(Array.isArray(arr)?arr:[]))
      .catch((e:any)=> setErr(String(e||"تعذر التحميل")))
      .finally(()=> setLoading(false));
  }, [session]);

  if (!session || session.role !== "entityManager") {
    return (
      <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ background:PALETTE.beige }}>
        <HeaderBar />
        <div className="mx-auto max-w-6xl w-full p-4">
          <div className="rounded-2xl p-4" style={{ background:"#fff", border:`1px solid ${PALETTE.border}` }}>
            هذه الصفحة متاحة لمدير الكيان فقط.
          </div>
        </div>
        <FooterBar />
      </div>
    );
  }

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ background:PALETTE.beige }}>
      <HeaderBar />
      <main className="mx-auto max-w-6xl w-full p-4 pb-10">
        <h1 className="text-2xl font-extrabold mb-4" style={{ color:PALETTE.black }}>تقييمات الفعاليات — كياني</h1>

        {loading ? (
          <div className="rounded-xl p-4" style={{ background:"#fff", border:`1px solid ${PALETTE.border}` }}>جارِ التحميل…</div>
        ) : err ? (
          <div className="rounded-xl p-4 text-red-600" style={{ background:"#fff", border:`1px solid ${PALETTE.border}` }}>{err}</div>
        ) : !rows.length ? (
          <div className="rounded-xl p-4" style={{ background:"#fff", border:`1px solid ${PALETTE.border}` }}>لا توجد تقييمات حتى الآن.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map(r => {
              const p = (() => { try { return JSON.parse(r.payload); } catch { return null; } })();
              if (!p) return null;
              const photos: string[] = Array.isArray(p?.files?.photos) ? p.files.photos : [];
              return (
                <Card key={r.id} className="rounded-2xl" style={{ borderColor:PALETTE.border, background:"#fff", boxShadow:"0 6px 12px rgba(0,0,0,0.05)" }}>
                  <CardHeader>
                    <CardTitle className="text-lg" style={{ color:PALETTE.black }}>
                      {p?.event?.title || "فعالية"} — {p?.event?.date ? new Date(p.event.date).toLocaleDateString("ar-EG") : "بدون تاريخ"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {photos.length > 0 && (
                      <div>
                        <div className="mb-2 text-sm" style={{ color:PALETTE.muted }}>الصور ({photos.length})</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {photos.map((src, i) => (
                            <a key={src+i} href={src} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border" style={{ borderColor:PALETTE.border }}>
                              {isImage(src) ? (
                                <img src={src} alt={`صورة ${i+1}`} className="w-full h-32 object-cover" />
                              ) : (
                                <div className="p-2 text-[11px] break-all">{src}</div>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-sm flex flex-wrap gap-x-4 gap-y-2" style={{ color:PALETTE.muted }}>
                      <span>عدد الحضور: <strong style={{ color:PALETTE.black }}>{p?.attendees ?? 0}</strong></span>
                      <span>نسبة تحقيق الأهداف: <strong style={{ color:PALETTE.black }}>{p?.scores?.goals ?? "-"}/5</strong></span>
                    </div>

                    {p?.notes ? (
                      <div className="text-sm" style={{ color:PALETTE.black }}>
                        <span className="font-semibold">ملاحظات:</span> {p.notes}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {p?.files?.attendance && (
                        <TinyPreview title="قائمة الحضور" url={p.files.attendance} />
                      )}
                      {p?.files?.survey && (
                        <TinyPreview title="تقرير استطلاع الرأي" url={p.files.survey} />
                      )}
                    </div>

                    <div className="text-xs" style={{ color:PALETTE.muted }}>
                      مقدَّم بواسطة: <strong style={{ color:PALETTE.black }}>{p?.submittedBy?.name}</strong> — {new Date(r.createdAt).toLocaleString("ar-EG")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <FooterBar />
    </div>
  );
}

function TinyPreview({ title, url }: { title:string; url:string }) {
  return (
    <div className="rounded-xl border p-3 bg-white" style={{ borderColor:PALETTE.border }}>
      <div className="text-sm mb-2" style={{ color:PALETTE.black }}>{title}</div>
      {isPdf(url) ? (
        <iframe src={url} className="w-full h-44 rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : isImage(url) ? (
        <img src={url} alt={title} className="w-full h-44 object-cover rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : (
        <div className="text-xs break-all" style={{ color:PALETTE.muted }}>{url}</div>
      )}
      <div className="mt-2 text-[12px]">
        <a href={url} target="_blank" rel="noreferrer" className="underline">فتح</a>
      </div>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href:string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border shadow-[0_6px_12px_rgba(0,0,0,0.04)]" style={{ borderColor: PALETTE.border }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: PALETTE.soft, border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color={PALETTE.black} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: PALETTE.black }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href:"/profile", label:"الملف الشخصي" },
              { href:"/dashboard", label:"لوحة التحكم" },
              { href:"/support", label:"الدعم" },
              { href:"/about", label:"عن المنصة" },
            ].map(l=>(
              <Link key={l.href} href={l.href} className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}>
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
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs" style={{ background:"#FFFFFF", border:`1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)", color:"#595959" }}>
          <p>© {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline" style={{ color: PALETTE.black }}>الخصوصية</Link>
            <span style={{ color: "#B9B9B9" }}>•</span>
            <Link href="/terms" className="hover:underline" style={{ color: PALETTE.black }}>الشروط</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
