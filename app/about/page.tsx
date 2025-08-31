"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col">
      {/* الخلفية (غيّر الصورة من /public/LoginPage.png لو حابب) */}
      <div className="absolute inset-0 -z-10">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/LoginPage.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d3c8f] via-[#1368d6] to-[#0a2e6a] opacity-90" />
      </div>

      {/* زخارف ناعمة */}
      <div className="pointer-events-none -z-0">
        <div className="absolute -top-10 right-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-28 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-24 right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/4 translate-y-1/4 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      {/* Header */}
      <HeaderBar />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-10 md:pt-16">
        <div className="rounded-[24px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-6 md:p-10 text-white shadow-[0_28px_80px_-24px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Users className="h-5 w-5 text-white/95" />
            </div>
            <span className="text-white/90 text-sm">عن المنصة</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            منصة الكيانات الشبابية
          </h1>
          <p className="text-white/85 mt-3 md:text-lg leading-relaxed">
            منصّة رقمية متكاملة تساعد الكيانات الشبابية على الإدارة، التنظيم، قياس الأثر، وتقديم
            البرامج بكفاءة. نجمع بين سهولة الاستخدام وقوة التحليلات لتسريع نمو المجتمع الشبابي.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge>إدارة الكيانات</Badge>
            <Badge>برامج وتسجيل</Badge>
            <Badge>لوحات متابعة</Badge>
            <Badge>تقارير وتأثير</Badge>
          </div>
        </div>
      </section>

      {/* المزايا */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12">
        <h2 className="text-white text-2xl md:text-3xl font-bold mb-4">ماذا نقدّم؟</h2>
        <p className="text-white/80 mb-6">
          أدوات متكاملة لإدارة الأعضاء والفعاليات والبرامج، مع تقارير لحظية ولوحات قياس أثر.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            title="إدارة الأعضاء والكيانات"
            desc="سجلات ذكية للأعضاء، أدوار وصلاحيات، وربط بين الكيانات والبرامج."
          />
          <FeatureCard
            title="برامج وفعاليات"
            desc="إنشاء فعاليات، استقبال تسجيلات الشباب، حضور وتقييم بسيط وسريع."
          />
          <FeatureCard
            title="تحليلات وتقارير"
            desc="لوحات معلومات لحظية، مؤشرات أداء، وتقارير PDF/Excel جاهزة للمشاركة."
          />
          <FeatureCard
            title="التواصل والإشعارات"
            desc="إشعارات بريدية وداخلية، نشرات، ورسائل موجهة بحسب الاهتمامات."
          />
          <FeatureCard
            title="تكامل وواجهات API"
            desc="الربط مع أنظمة أخرى بسهولة، واستيراد/تصدير البيانات بسلاسة."
          />
          <FeatureCard
            title="أمان وخصوصية"
            desc="أدوار وصلاحيات دقيقة، تشفير للبيانات، والامتثال لأفضل الممارسات."
          />
        </div>
      </section>

      {/* أرقام سريعة */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 md:p-7 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <Stat title="كيان مسجّل" value="120+" />
            <Stat title="برنامج مُدار" value="450+" />
            <Stat title="مشارك نشط" value="20K+" />
            <Stat title="مؤشر أثر" value="95%" />
          </div>
        </div>
      </section>

      {/* لماذا نحن */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12">
        <h2 className="text-white text-2xl md:text-3xl font-bold mb-4">لماذا تختارنا؟</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ValueCard
            title="سهولة وتجربة مستخدم"
            points={[
              "واجهة مبسطة تعمل على الجوال والكمبيوتر",
              "تجربة تسجيل قصيرة وسلسة للشباب",
              "قوالب جاهزة لتسريع العمل",
            ]}
          />
          <ValueCard
            title="قرارات مبنية على البيانات"
            points={[
              "لوحات قياس أثر جاهزة",
              "تقارير آلية وفورية",
              "مؤشرات تساعد على تحسين البرامج",
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-10 mb-10">
        <div className="rounded-[22px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-bold">جاهز تبدأ رحلتك مع المنصة؟</h3>
            <p className="text-white/85 mt-1">
              سجّل كيانك الآن وابدأ إدارة برامجك وقياس أثرها بسهولة.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-white text-slate-900 font-semibold"
            >
              أنشئ حساباً
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full ring-1 ring-white/60 text-white hover:bg-white/10"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterBar />
    </div>
  );
}

/* ======================= UI Helpers ======================= */

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
            <Link href="/" className="text-white font-semibold">
              منصة الكيانات الشبابية
            </Link>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center h-8 px-3 rounded-full bg-white/15 ring-1 ring-white/25 text-white/95 text-xs">
      {children}
    </span>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 text-white">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-white/85 mt-1 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-2xl md:text-3xl font-extrabold">{value}</div>
      <div className="text-white/80 text-sm">{title}</div>
    </div>
  );
}

function ValueCard({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 text-white">
      <h3 className="font-semibold text-lg">{title}</h3>
      <ul className="mt-2 space-y-2 text-white/85 text-sm">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-white/70" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
