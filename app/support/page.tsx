"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone, MessageSquare, Users, MapPin, Clock, Facebook, Github } from "lucide-react";
import { useState } from "react";

export default function SupportPage() {
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8 md:pt-12">
        <div className="rounded-[24px] p-6 md:p-10" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: "#1D1D1D" }}>الدعم والمساعدة</h1>
          <p className="mt-3 md:text-lg leading-relaxed" style={{ color: "#595959" }}>
            احنا هنا علشان نساعدك. تواصل معنا عبر البريد أو الهاتف، أو ابعتلنا رسالة من النموذج، وهيرد عليك فريقنا بأسرع وقت.
          </p>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <ContactTile icon={<Mail className="h-5 w-5" color="#1D1D1D" />} title="البريد الإلكتروني" value="support@youth-platform.com" href="mailto:support@youth-platform.com" />
            <ContactTile icon={<Phone className="h-5 w-5" color="#1D1D1D" />} title="الهاتف" value="+20 100 000 0000" href="tel:+201000000000" />
            <ContactTile icon={<MessageSquare className="h-5 w-5" color="#1D1D1D" />} title="المحادثة" value="ابدأ محادثة فورية" href="#contact" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-6" id="contact" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#1D1D1D" }}>راسلنا</h2>
          <p className="mb-5 text-sm" style={{ color: "#6B6B6B" }}>املأ البيانات وسيتم الرد عليك عبر البريد.</p>
          <ContactForm />
        </div>

        <aside className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2" style={{ color: "#1D1D1D" }}>
              <Clock className="h-5 w-5" color="#1D1D1D" /> ساعات العمل
            </h3>
            <ul className="text-sm space-y-1" style={{ color: "#595959" }}>
              <li>الأحد - الخميس: 9 ص — 5 م</li>
              <li>الجمعة - السبت: دعم طوارئ بالبريد</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2" style={{ color: "#1D1D1D" }}>
              <MapPin className="h-5 w-5" color="#1D1D1D" /> العنوان
            </h3>
            <p className="text-sm" style={{ color: "#595959" }}>القاهرة، مصر — المقر الرئيسي</p>

            <div className="mt-3 h-36 w-full rounded-xl overflow-hidden" style={{ border: "1px solid #E7E2DC" }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.143793326688!2d31.235711!3d30.044419!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145840c7f1234567%3A0xabcdef1234567890!2z2YXYs9is2K8g2KfZhNis2YXYp9mE2KfZhQ!5e0!3m2!1sar!2seg!4v1700000000000!5m2!1sar!2seg"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: "#1D1D1D" }}>تابعنا</h3>
            <div className="flex items-center gap-3">
              <SocialIcon href="https://www.facebook.com/Mohndsoun.men.Agel.Masr.Mostdama?mibextid=ZbWKwL" label="Facebook">
                <Facebook className="h-5 w-5" color="#1D1D1D" />
              </SocialIcon>
              <SocialIcon href="https://ese-eg.com/?fbclid=IwY2xjawMhUdpleHRuA2FlbQIxMABicmlkETFXSFlLbEVLaE1zZTY5eXV4AR7mg33M-CIojvB7lRY7eX0-SM6s3ApNdZJYKdY7eX0rDNNrtkyb_4POr_eLjw_aem_EnO-xFvyPJQIaPVs1HkLiw" label="GitHub">
                <Github className="h-5 w-5" color="#1D1D1D" />
              </SocialIcon>
            </div>
          </div>
        </aside>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12 mb-10">
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#1D1D1D" }}>الأسئلة الشائعة</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FaqItem q="كيف أسجّل كيان جديد؟" a="من خلال صفحة الرئيسية اضغط على إنشاء حساب واتبع الخطوات. ستتلقى بريد تأكيد." />
            <FaqItem q="هل يوجد باقات مختلفة؟" a="نعم، لدينا باقة مجانية وباقات مدفوعة للكيانات الكبيرة. تواصل معنا لمعرفة التفاصيل." />
            <FaqItem q="كيف أستورد بيانات الأعضاء؟" a="من لوحة التحكم > الاستيراد. نوفر قوالب CSV جاهزة." />
            <FaqItem q="كيف أحصل على تقارير الأثر؟" a="من صفحة التقارير يمكن إنشاء تقارير PDF/Excel وفق مؤشرات محددة." />
          </div>
        </div>
      </section>

      <FooterBar />
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>
              منصة الكيانات الشبابية
            </Link>
          </div>

          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/profile", label: "الملف الشخصي" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{
                  color: active(l.href) ? "#FFFFFF" : "#1D1D1D",
                  backgroundColor: active(l.href) ? "#EC1A24" : "transparent",
                }}
              >
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
        <div className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#595959" }}>
          <p>© {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline" style={{ color: "#1D1D1D" }}>
              الخصوصية
            </Link>
            <span style={{ color: "#B9B9B9" }}>•</span>
            <Link href="/terms" className="hover:underline" style={{ color: "#1D1D1D" }}>
              الشروط
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ContactTile({ icon, title, value, href }: { icon: React.ReactNode; title: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl transition p-4 flex items-center gap-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
      <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
        {icon}
      </span>
      <span>
        <div className="text-sm" style={{ color: "#6B6B6B" }}>{title}</div>
        <div className="font-semibold" style={{ color: "#1D1D1D" }}>{value}</div>
      </span>
    </Link>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="h-10 w-10 flex items-center justify-center rounded-full" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E7E7", color: "#1D1D1D" }}>
      {children}
    </a>
  );
}

function ContactForm() {
  const [state, setState] = useState<{ name: string; email: string; subject: string; message: string; sent?: boolean }>({ name: "", email: "", subject: "", message: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((s) => ({ ...s, sent: true }));
  };

  const inputCls =
    "w-full rounded-xl px-3 py-2 transition focus:outline-none focus:ring-2";
  const inputStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E3E3E3",
    color: "#1D1D1D",
  };
  const focusedStyle: React.CSSProperties = {};

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="الاسم الكامل">
        <input
          required
          type="text"
          className={inputCls}
          style={inputStyle}
          placeholder="اكتب اسمك"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
        />
      </Field>
      <Field label="البريد الإلكتروني">
        <input
          required
          type="email"
          className={inputCls}
          style={inputStyle}
          placeholder="name@example.com"
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
        />
      </Field>
      <Field label="الموضوع" className="md:col-span-2">
        <input
          required
          type="text"
          className={inputCls}
          style={inputStyle}
          placeholder="اكتب عنوان الرسالة"
          value={state.subject}
          onChange={(e) => setState((s) => ({ ...s, subject: e.target.value }))}
        />
      </Field>
      <Field label="الرسالة" className="md:col-span-2">
        <textarea
          required
          className={inputCls + " min-h-[140px] resize-y"}
          style={inputStyle}
          placeholder="اكتب رسالتك بالتفصيل..."
          value={state.message}
          onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))}
        />
      </Field>
      <div className="md:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full font-semibold"
          style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
        >
          إرسال الرسالة
        </button>
        {state.sent && <span className="text-sm" style={{ color: "#1D1D1D" }}>✔ تم الإرسال (تجريبي)</span>}
      </div>
    </form>
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
      <button
        type="button"
        className="w-full text-right flex justify-between items-center font-semibold"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ color: "#1D1D1D" }}
      >
        <span>{q}</span>
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2 text-sm" style={{ color: "#595959" }}>{a}</div>}
    </div>
  );
}
