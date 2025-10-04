"use client";

import * as React from "react";
import { Cairo } from "next/font/google";
import { User, Mail, Phone, MapPin, Hash, Shield, Users, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700", "800"] });

const COLORS = {
  text: "#1D1D1D",
  muted: "#6B6B6B",
  card: "#FFFFFF",
  border: "#E7E2DC",
  line: "#E3E3E3",
  soft: "#F6F6F6",
  band: "#B89A5B",
};

export type CardPerson = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  nationalId?: string | null;
  role: "unionSupervisor" | "entityManager" | "user";
  entityName?: string | null;
  avatar?: string | null;
  status?: "active" | "suspended" | "pending" | "rejected" | string | null;
};

const roleLabel: Record<CardPerson["role"], string> = {
  unionSupervisor: "مسؤول اتحاد الكيانات",
  entityManager: "مسؤول كيان",
  user: "عضو",
};

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 text-[12px] leading-4">
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-md"
            style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
        {icon}
      </span>
      <span className="text-[#6B6B6B]">{label}:</span>
      <span className="font-semibold">{value || "—"}</span>
    </div>
  );
}

export function MembershipCard({ person }: { person: CardPerson }) {
  const suspended = person.status === "suspended";

  // نص الكيان حسب الدور
  const entityValue =
    person.role === "unionSupervisor"
      ? "مسؤول عن كل الكيانات"
      : person.role === "entityManager"
      ? `مسؤول كيان — ${person.entityName || "—"}`
      : person.entityName || "—";

  // 👇 QR يشير إلى PDF الكارت (API اللي فوق)
  const pdfUrl = React.useMemo(() => {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : ""; // على السيرفر هيكون فاضي، لكن الـ QR بيتولد على الكلاينت
    return `${origin}/api/card/${encodeURIComponent(person.id)}`;
  }, [person.id]);

  return (
    <div dir="rtl" className={cairo.className} id="cardRoot">
      <div
        id="cardBox"
        className="relative rounded-[22px] overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.12)] print:shadow-none"
        style={{
          width: 860,
          height: 540,
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {/* الشريط العلوي */}
        <div className="w-full h-[64px] flex items-center justify-center" style={{ background: COLORS.band, color: "#fff" }}>
          <div className="text-[26px] font-extrabold">بطاقة عضوية — منصة الكيانات الشبابية</div>
        </div>

        {/* جسم الكارت */}
        <div className="grid grid-cols-[220px_1fr] gap-6 p-6">
          {/* العمود الأيسر */}
          <div className="flex flex-col items-center">
            <div className="w-[180px] h-[220px] rounded-2xl overflow-hidden grid place-items-center"
                 style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              {person.avatar ? (
                <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-extrabold text-[#6B6B6B]">
                  {person.name?.trim()?.charAt(0) || "?"}
                </span>
              )}
            </div>

            <div className="mt-3 px-3 h-8 rounded-full text-sm font-semibold grid place-items-center"
                 style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              {roleLabel[person.role]}
            </div>

            {suspended && (
              <div className="mt-2 inline-flex items-center gap-1 px-3 h-8 rounded-full text-sm"
                   style={{ background: "#FFF0F0", border: "1px solid #F5C2C7", color: "#7A0010" }}>
                <AlertTriangle className="h-4 w-4" />
                موقوف مؤقتًا
              </div>
            )}
          </div>

          {/* العمود الأيمن */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="text-[28px] font-extrabold">{person.name}</div>
              <div className="text-sm mt-1 text-[#6B6B6B]">
                {person.role === "user" ? "عضو في" : person.role === "entityManager" ? "يدير كيان" : "صلاحية"}{" "}
                <strong className="text-[#1D1D1D]">
                  {person.role === "unionSupervisor" ? "كل الكيانات" : (person.entityName || "—")}
                </strong>
              </div>

              <div className="h-[1px] my-4" style={{ background: COLORS.line }} />

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field icon={<User className="h-3.5 w-3.5" />} label="الاسم" value={person.name} />
                <Field icon={<Hash className="h-3.5 w-3.5" />} label="الرقم القومي" value={person.nationalId} />
                <Field icon={<Mail className="h-3.5 w-3.5" />} label="البريد" value={person.email} />
                <Field icon={<Phone className="h-3.5 w-3.5" />} label="الهاتف" value={person.phone} />
                <Field icon={<MapPin className="h-3.5 w-3.5" />} label="المدينة" value={person.city} />
                <Field icon={<Shield className="h-3.5 w-3.5" />} label="الصفة" value={roleLabel[person.role]} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-md"
                      style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs text-[#6B6B6B]">الكيان</div>
                  <div className="font-semibold">{entityValue}</div>
                </div>
              </div>

              {/* QR + رقم العضوية */}
              <div className="text-right flex flex-col items-end">
                <div className="text-xs text-[#6B6B6B]">الكارت (QR)</div>
                <div className="mt-1">
                  <QRCodeSVG value={pdfUrl} size={96} includeMargin={false} level="M" />
                </div>
               <div className="mt-1 text-[11px] font-bold text-[#B89A5B]" dir="ltr">
 User ID: {person.id}
</div>
              </div>
            </div>
          </div>
        </div>

        {/* الفوتر */}
        <div className="absolute bottom-0 left-0 right-0 h-[48px] px-6 flex items-center justify-between"
             style={{ background: "#FBFBFB", borderTop: `1px solid ${COLORS.border}`, color: "#6B6B6B" }}>
          <span>بطاقة رقمية صالحة داخل المنصة</span>
          <span>© {new Date().getFullYear()} منصة الكيانات الشبابية</span>
        </div>
      </div>

      {/* إعدادات الطباعة */}
      <style jsx global>{`
        @page { size: A6 landscape; margin: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          body * { visibility: hidden !important; }
          #cardRoot, #cardRoot * { visibility: visible !important; }
          #cardRoot {
            position: fixed; inset: 0; margin: auto;
            background: transparent !important; box-shadow: none !important;
          }
          #cardBox { transform: scale(0.68); transform-origin: center; box-shadow: none !important; }
          #printCardBtn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
