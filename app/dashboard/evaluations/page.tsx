"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400","600","700","800"], display: "swap" });

type Role = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: Role; entityId?: string | null };

type EvalRow = {
  id: string;
  eventId: string;
  entityId?: string | null;
  submittedBy: string;
  payload: {
    eventId: string;
    submittedBy: string;
    submittedName: string;
    submittedEmail: string;
    attendees?: number;
    goalsScore?: number;
    notes?: string;
    files?: { label: string; url: string }[];
  };
  createdAt: string;
};

type EventLite = { id: string; title: string; date?: string | null };

const PALETTE = { black:"#1D1D1D", red:"#EC1A24", beige:"#EFE6DE", border:"#E7E2DC", soft:"#F6F6F6", muted:"#6B6B6B" };

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = {};
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

export default function EvaluationsForManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem("session");
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {}
  }, [mounted]);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        
        const r = await fetch("/api/events/evaluations", { cache:"no-store", headers: buildSessionHeaders(false) });
        const data = await r.json().catch(() => []);
        if (!live) return;
        const arr: EvalRow[] = Array.isArray(data) ? data : [];
        setRows(arr);

        
        const ids: string[] = Array.from(
          new Set<string>((arr || []).map(d => String(d?.eventId || "")))
        ).filter(Boolean);

        const evs: EventLite[] = [];
        for (const id of ids) {
          const er = await fetch(`/api/events/${encodeURIComponent(String(id))}`, { method:"GET", cache:"no-store" })
            .catch(() => null as any);
          if (er?.ok) {
            const ej = await er.json().catch(() => null);
            if (ej) evs.push({ id: ej.id, title: ej.title, date: ej.date || null });
          }
        }
        if (!live) return;
        setEvents(evs);
      } catch {
        if (!live) return;
        setRows([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [mounted]);

  const titleOf = (id: string) => events.find(e => String(e.id) === String(id))?.title || "فعالية";
  const dateOf  = (id: string) => events.find(e => String(e.id) === String(id))?.date;

  const grouped = useMemo(() => {
    const m: Record<string, EvalRow[]> = {};
    for (const r of rows) (m[r.eventId] ||= []).push(r);
    Object.values(m).forEach(arr => arr.sort((a,b) => (b.createdAt > a.createdAt ? 1 : -1)));
    return m;
  }, [rows]);

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ backgroundColor: PALETTE.beige }}>
      <HeaderBar />
      <div className="mx-auto max-w-6xl w-full p-4">
        <Card className="rounded-[22px] border" style={{ borderColor: PALETTE.border, background:"#fff" }}>
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold" style={{ color: PALETTE.black }}>
              تقييمات الفعاليات (مدير الكيان)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-4 rounded-xl" style={{ background: PALETTE.soft, border:`1px solid ${PALETTE.border}`, color: PALETTE.muted }}>
                جارِ التحميل...
              </div>
            ) : !rows.length ? (
              <div className="p-4 rounded-xl" style={{ background: PALETTE.soft, border:`1px solid ${PALETTE.border}`, color: PALETTE.muted }}>
                لا توجد تقييمات حتى الآن.
              </div>
            ) : (
              Object.entries(grouped).map(([eventId, list]) => (
                <section key={eventId} className="mb-6">
                  <h3 className="mb-2 font-bold" style={{ color: PALETTE.black }}>
                    {titleOf(eventId)}
                    {dateOf(eventId) ? ` — ${new Date(dateOf(eventId)!).toLocaleDateString("ar-EG")}` : ""}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    {list.map(row => (
                      <EvaluationCard key={row.id} row={row} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <FooterBar />
    </div>
  );
}

function EvaluationCard({ row }: { row: EvalRow }) {
  const p = row.payload || {};
  const files = Array.isArray(p.files) ? p.files : [];

  const imageFiles = files.filter(f => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.url));
  const pdfFiles   = files.filter(f => /\.pdf$/i.test(f.url));
  const otherFiles = files.filter(f => !imageFiles.includes(f) && !pdfFiles.includes(f));

  return (
    <Card className="rounded-2xl border" style={{ borderColor: PALETTE.border }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: PALETTE.muted }}>
              المُرسِل: <strong style={{ color: PALETTE.black }}>{p.submittedName}</strong> • {p.submittedEmail}
            </div>
            <div className="text-xs" style={{ color: PALETTE.muted }}>
              بتاريخ: {new Date(row.createdAt).toLocaleString("ar-EG")}
            </div>
          </div>
          <span className="h-8 px-3 rounded-full grid place-items-center text-sm"
                style={{ background: PALETTE.soft, border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}>
            {p.goalsScore ?? "—"}/5
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm" style={{ color: PALETTE.black }}>
          عدد الحضور: <strong>{typeof p.attendees === "number" ? p.attendees : "—"}</strong>
        </div>
        {p.notes ? (
          <div className="text-sm p-3 rounded-lg" style={{ background:"#FAFAFA", border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}>
            {p.notes}
          </div>
        ) : null}

        {imageFiles.length ? <AutoCarousel images={imageFiles.map(f => ({ src: f.url, alt: f.label || "صورة" }))} /> : null}

        {pdfFiles.length ? (
          <div className="text-sm">
            <div className="mb-1 font-semibold" style={{ color: PALETTE.black }}>ملفات PDF:</div>
            <ul className="list-disc pr-5 space-y-1">
              {pdfFiles.map((f, i) => (
                <li key={i}>
                  <a href={f.url} target="_blank" className="underline" rel="noreferrer">{f.label || "ملف"}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {otherFiles.length ? (
          <div className="text-sm">
            <div className="mb-1 font-semibold" style={{ color: PALETTE.black }}>ملفات أخرى:</div>
            <ul className="list-disc pr-5 space-y-1">
              {otherFiles.map((f, i) => (
                <li key={i}>
                  <a href={f.url} target="_blank" className="underline" rel="noreferrer">{f.label || "ملف"}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AutoCarousel({ images }: { images: { src: string; alt?: string }[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!images.length) return;
    const id = setInterval(() => setI(v => (v + 1) % images.length), 3000);
    return () => clearInterval(id);
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div className="relative overflow-hidden rounded-xl"
         style={{ height: 220, border:`1px solid ${PALETTE.border}`, background: "#FFF" }}>
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img.src}
          alt={img.alt || ""}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
        {images.map((_, idx) => (
          <span key={idx}
                className={`inline-block w-2 h-2 rounded-full ${idx === i ? "opacity-100" : "opacity-50"}`}
                style={{ background: PALETTE.red }} />
        ))}
      </div>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border shadow-[0_6px_12px_rgba(0,0,0,0.04)]" style={{ borderColor: PALETTE.border }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: PALETTE.soft, border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color={PALETTE.black} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: PALETTE.black }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text!" />
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs"
             style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#595959" }}>
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
