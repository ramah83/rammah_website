"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone, MessageSquare, Users, MapPin, Clock, Facebook, Github } from "lucide-react";
import { useState } from "react";

export default function SupportPage() {
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col">

      <div className="absolute inset-0 -z-10">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/LoginPage.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d3c8f] via-[#1368d6] to-[#0a2e6a] opacity-90" />
      </div>

      <div className="pointer-events-none -z-0">
        <div className="absolute -top-10 right-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-28 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-24 right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/4 translate-y-1/4 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-10 md:pt-16">
        <div className="rounded-[24px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-6 md:p-10 text-white shadow-[0_28px_80px_-24px_rgba(0,0,0,0.55)]">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">الدعم والمساعدة</h1>
          <p className="text-white/85 mt-3 md:text-lg leading-relaxed">
            احنا هنا علشان نساعدك. تواصل معنا عبر البريد أو الهاتف، أو ابعتلنا رسالة من النموذج، وهيرد عليك فريقنا بأسرع وقت.
          </p>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <ContactTile
              icon={<Mail className="h-5 w-5" />}
              title="البريد الإلكتروني"
              value="support@youth-platform.com"
              href="mailto:support@youth-platform.com"
            />
            <ContactTile
              icon={<Phone className="h-5 w-5" />}
              title="الهاتف"
              value="+20 100 000 0000"
              href="tel:+201000000000"
            />
            <ContactTile
              icon={<MessageSquare className="h-5 w-5" />}
              title="المحادثة"
              value="ابدأ محادثة فورية"
              href="#contact"
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12 grid lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-6 text-white"
          id="contact"
        >
          <h2 className="text-2xl font-bold mb-1">راسلنا</h2>
          <p className="text-white/80 mb-5 text-sm">املأ البيانات وسيتم الرد عليك عبر البريد.</p>
          <ContactForm />
        </div>

        <aside className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-6 text-white space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Clock className="h-5 w-5" /> ساعات العمل
            </h3>
            <ul className="text-white/85 text-sm space-y-1">
              <li>الأحد - الخميس: 9 ص — 5 م</li>
              <li>الجمعة - السبت: دعم طوارئ بالبريد</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5" /> العنوان
            </h3>
            <p className="text-white/85 text-sm">القاهرة، مصر — المقر الرئيسي</p>

            <div className="mt-3 h-36 w-full rounded-xl overflow-hidden ring-1 ring-white/20">
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
            <h3 className="font-semibold text-lg mb-2">تابعنا</h3>
            <div className="flex items-center gap-3">
              <SocialIcon href="https://facebook.com" label="Facebook">
                <Facebook className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="https://github.com" label="GitHub">
                <Github className="h-5 w-5" />
              </SocialIcon>
            </div>
          </div>
        </aside>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12 mb-10">
        <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">الأسئلة الشائعة</h2>
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
  const linkCls = (href: string) =>
    `px-3 py-1 rounded-lg transition ${
      pathname === href ? "bg-white/15 text-white" : "text-white/85 hover:text-white"
    }`;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={linkCls("/")}>الرئيسية</Link>
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="mt-6 h-12 w-full rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-between px-4">
          <p className="text-white/80 text-xs">
            © {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة
          </p>
          <div className="flex items-center gap-3 text-xs">
            <Link className="text-white/80 hover:text-white" href="/privacy">الخصوصية</Link>
            <span className="text-white/30">•</span>
            <Link className="text-white/80 hover:text-white" href="/terms">الشروط</Link>
     </div>
        </div>
      </div>
    </footer>
  );
}

function ContactTile({
  icon,
  title,
  value,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white/10 hover:bg-white/15 transition backdrop-blur-xl ring-1 ring-white/20 p-4 text-white flex items-center gap-3"
    >
      <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">{icon}</span>
      <span>
        <div className="text-sm text-white/80">{title}</div>
        <div className="font-semibold">{value}</div>
      </span>
    </Link>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="h-10 w-10 flex items-center justify-center rounded-full bg-white/95 hover:bg-white ring-1 ring-white/40 text-slate-900"
    >
      {children}
    </a>
  );
}

function ContactForm() {
  const [state, setState] = useState<{
    name: string;
    email: string;
    subject: string;
    message: string;
    sent?: boolean;
  }>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((s) => ({ ...s, sent: true }));
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="الاسم الكامل">
        <input
          required
          type="text"
          className="SupportInput"
          placeholder="اكتب اسمك"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
        />
      </Field>
      <Field label="البريد الإلكتروني">
        <input
          required
          type="email"
          className="SupportInput"
          placeholder="name@example.com"
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
        />
      </Field>
      <Field label="الموضوع" className="md:col-span-2">
        <input
          required
          type="text"
          className="SupportInput"
          placeholder="اكتب عنوان الرسالة"
          value={state.subject}
          onChange={(e) => setState((s) => ({ ...s, subject: e.target.value }))}
        />
      </Field>
      <Field label="الرسالة" className="md:col-span-2">
        <textarea
          required
          className="SupportInput min-h-[140px] resize-y"
          placeholder="اكتب رسالتك بالتفصيل..."
          value={state.message}
          onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))}
        />
      </Field>
      <div className="md:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-white text-slate-900 font-semibold"
        >
          إرسال الرسالة
        </button>
        {state.sent && <span className="text-emerald-200 text-sm">✔ تم الإرسال (تجريبي)</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-white/90 text-sm">{label}</span>
      {children}
    </label>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white/10 ring-1 ring-white/20 p-4">
      <button
        type="button"
        className="w-full text-right flex justify-between items-center font-semibold text-white/90"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2 text-white/80 text-sm">{a}</div>}
    </div>
  );
}

const style = `
.SupportInput {
  @apply w-full rounded-xl bg-white text-slate-900 placeholder:text-slate-400 
         border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-300 
         px-3 py-2 transition;
}
`;
if (typeof document !== "undefined" && !document.getElementById("support-inline-style")) {
  const tag = document.createElement("style");
  tag.id = "support-inline-style";
  tag.innerHTML = style;
  document.head.appendChild(tag);
}
