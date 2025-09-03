"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: "#EFE6DE" }}
    >
      <HeaderBar />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8 md:pt-12">
        <div
          className="rounded-[24px] p-6 md:p-10"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}
            >
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <span className="text-sm" style={{ color: "#6B6B6B" }}>
              عن المنصة
            </span>
          </div>

          <h1
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            style={{ color: "#1D1D1D" }}
          >
            منصة الكيانات الشبابية
          </h1>
          <p className="mt-3 md:text-lg leading-relaxed" style={{ color: "#595959" }}>
            منصّة رقمية متكاملة تساعد الكيانات الشبابية على الإدارة، التنظيم، قياس الأثر،
            وتقديم البرامج بكفاءة. نجمع بين سهولة الاستخدام وقوة التحليلات لتسريع نمو
            المجتمع الشبابي.
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
        <h2
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{ color: "#1D1D1D" }}
        >
          ماذا نقدّم؟
        </h2>
        <p className="mb-6" style={{ color: "#6B6B6B" }}>
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
        <div
          className="rounded-2xl p-5 md:p-7"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
          }}
        >
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
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ color: "#1D1D1D" }}
        >
          لماذا تختارنا؟
        </h2>
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
        <div
          className="rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 12px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <h3 className="text-xl md:text-2xl font-bold" style={{ color: "#1D1D1D" }}>
              جاهز تبدأ رحلتك مع المنصة؟
            </h3>
            <p className="mt-1" style={{ color: "#595959" }}>
              سجّل كيانك الآن وابدأ إدارة برامجك وقياس أثرها بسهولة.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full font-semibold"
              style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
            >
              أنشئ حساباً
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full"
              style={{
                color: "#1D1D1D",
                border: "1px solid #E0E0E0",
                backgroundColor: "#FFFFFF",
              }}
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>

      <FooterBar />
    </div>
  );
}

/* ======================= UI Helpers ======================= */

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 6px 12px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}
            >
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
        <div
          className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 6px 12px rgba(0,0,0,0.04)",
            color: "#595959",
          }}
        >
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center h-8 px-3 rounded-full text-xs"
      style={{
        backgroundColor: "#F6F6F6",
        color: "#1D1D1D",
        border: "1px solid #E3E3E3",
      }}
    >
      {children}
    </span>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E7E2DC",
        boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
      }}
    >
      <h3 className="font-semibold text-lg" style={{ color: "#1D1D1D" }}>
        {title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: "#595959" }}>
        {desc}
      </p>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: "#6B6B6B" }}>
        {title}
      </div>
    </div>
  );
}

function ValueCard({ title, points }: { title: string; points: string[] }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E7E2DC",
        boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
      }}
    >
      <h3 className="font-semibold text-lg" style={{ color: "#1D1D1D" }}>
        {title}
      </h3>
      <ul className="mt-2 space-y-2 text-sm">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2" style={{ color: "#595959" }}>
            <span className="mt-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#EC1A24" }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
