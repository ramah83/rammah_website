"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Shield, Scale, AlertTriangle, CheckCircle2, Globe2, Mail } from "lucide-react";

export default function TermsPage() {
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8 md:pt-12">
        <div className="rounded-[24px] p-6 md:p-10" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Scale className="h-5 w-5" color="#1D1D1D" />
            </div>
            <span className="text-sm" style={{ color: "#6B6B6B" }}>الشروط والأحكام</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: "#1D1D1D" }}>
            شروط استخدام منصة الكيانات الشبابية
          </h1>
          <p className="mt-3 md:text-lg leading-relaxed" style={{ color: "#595959" }}>
            باستخدامك للمنصة، فأنت توافق على الالتزام بهذه الشروط، بالإضافة إلى سياسة الخصوصية. يرجى قراءة البنود بعناية.
          </p>
          <p className="mt-2 text-sm" style={{ color: "#7A7A7A" }}>آخر تحديث: 31 أغسطس 2025</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8">
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" color="#1D1D1D" /> الفهرس
          </h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm" style={{ color: "#1D1D1D" }}>
            <li><a className="hover:underline" href="#intro">المقدمة والقبول</a></li>
            <li><a className="hover:underline" href="#service">الخدمات وحدود الاستخدام</a></li>
            <li><a className="hover:underline" href="#accounts">الحسابات والأمان</a></li>
            <li><a className="hover:underline" href="#conduct">الاستخدامات الممنوعة</a></li>
            <li><a className="hover:underline" href="#content">المحتوى والملكية الفكرية</a></li>
            <li><a className="hover:underline" href="#fees">الرسوم والدفع (إن وجدت)</a></li>
            <li><a className="hover:underline" href="#disclaimer">إخلاء المسؤولية</a></li>
            <li><a className="hover:underline" href="#liability">حدود المسؤولية</a></li>
            <li><a className="hover:underline" href="#changes">التعديلات وإنهاء الخدمة</a></li>
            <li><a className="hover:underline" href="#law">القانون والاختصاص</a></li>
            <li><a className="hover:underline" href="#contact">التواصل</a></li>
          </ul>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 mb-10">
        <CardGlass id="intro">
          <SectionTitle icon={<CheckCircle2 className="h-5 w-5" color="#1D1D1D" />} title="1) المقدمة والقبول" />
          <p style={{ color: "#595959" }}>
            هذه الشروط تنظّم استخدامك لمنصة الكيانات الشبابية. بدخولك أو استخدامك للخدمات، تقرّ بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط وسياسة الخصوصية. إذا لم توافق على أي بند، يرجى التوقف عن استخدام المنصة.
          </p>
        </CardGlass>

        <CardGlass id="service">
          <SectionTitle icon={<Globe2 className="h-5 w-5" color="#1D1D1D" />} title="2) الخدمات وحدود الاستخدام" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>نوفر أدوات لإدارة الكيانات والبرامج والأعضاء وقياس الأثر.</li>
            <li>يُسمح بالوصول والاستخدام وفق سياسات المنصة والصلاحيات المخوّلة لكل دور.</li>
            <li>نحتفظ بالحق في تعديل أو تعليق أو إيقاف أي جزء من الخدمات وفق الحاجة.</li>
          </ul>
        </CardGlass>

        <CardGlass id="accounts">
          <SectionTitle icon={<Shield className="h-5 w-5" color="#1D1D1D" />} title="3) الحسابات والأمان" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>تلتزم بتقديم معلومات صحيحة والحفاظ على سرية بيانات الدخول.</li>
            <li>تتحمل مسؤولية جميع الأنشطة التي تتم عبر حسابك.</li>
            <li>يحق لنا تعليق/إيقاف الحساب عند مخالفة الشروط أو الاشتباه بإساءة الاستخدام.</li>
          </ul>
        </CardGlass>

        <CardGlass id="conduct">
          <SectionTitle icon={<AlertTriangle className="h-5 w-5" color="#1D1D1D" />} title="4) الاستخدامات الممنوعة" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>أي نشاط غير قانوني أو ينتهك حقوق الآخرين.</li>
            <li>محاولات الاختراق أو تعطيل الخدمة أو تجاوز الضوابط الأمنية.</li>
            <li>نشر محتوى مُسيء، أو مضلل، أو ينتهك الخصوصية والملكية الفكرية.</li>
            <li>جمع بيانات دون موافقة أصحابها أو لأغراض غير مصرح بها.</li>
          </ul>
        </CardGlass>

        <CardGlass id="content">
          <SectionTitle icon={<FileText className="h-5 w-5" color="#1D1D1D" />} title="5) المحتوى والملكية الفكرية" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>تحتفظ بحقوقك في المحتوى الذي تقدّمه، وتمنحنا ترخيصًا محدودًا لتشغيل الخدمات.</li>
            <li>جميع علامات وشعارات وواجهات المنصة مملوكة للمنصة ولا يجوز استخدامها دون إذن.</li>
            <li>قد نزيل أو نقيّد المحتوى المخالف للشروط أو القانون.</li>
          </ul>
        </CardGlass>

        <CardGlass id="fees">
          <SectionTitle icon={<Scale className="h-5 w-5" color="#1D1D1D" />} title="6) الرسوم والدفع (إن وجدت)" />
          <p style={{ color: "#595959" }}>
            قد نوفر باقات مجانية ومدفوعة. تُعرض الأسعار وطرق الدفع وشروط الإلغاء في صفحات الخطة/الفوترة وقت الاشتراك. أي مبالغ مدفوعة قد لا تكون قابلة للاسترداد إلا وفق السياسة المحددة وقت الشراء.
          </p>
        </CardGlass>

        <CardGlass id="disclaimer">
          <SectionTitle icon={<AlertTriangle className="h-5 w-5" color="#1D1D1D" />} title="7) إخلاء المسؤولية" />
          <p style={{ color: "#595959" }}>
            تُقدّم الخدمات "كما هي" و"كما هي متاحة" دون ضمانات صريحة أو ضمنية بما في ذلك على سبيل المثال لا الحصر ضمانات الملاءمة لغرض معيّن أو عدم الانتهاك. قد تتعرض الخدمات لانقطاعات أو تحديثات.
          </p>
        </CardGlass>

        <CardGlass id="liability">
          <SectionTitle icon={<Scale className="h-5 w-5" color="#1D1D1D" />} title="8) حدود المسؤولية" />
          <p style={{ color: "#595959" }}>
            إلى الحد الذي يسمح به القانون، لا نتحمل مسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية أو خسائر في الأرباح أو البيانات نتيجة لاستخدامك للخدمات. في جميع الأحوال، يكون حدّ مسؤوليتنا الإجمالي عمّا تدفعه مقابل الخدمات خلال آخر 12 شهرًا (إن وجد).
          </p>
        </CardGlass>

        <CardGlass id="changes">
          <SectionTitle icon={<FileText className="h-5 w-5" color="#1D1D1D" />} title="9) التعديلات وإنهاء الخدمة" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>قد نُجري تحديثات على الشروط وسننشرها هنا مع تاريخ سريانها.</li>
            <li>يحق لأي طرف إنهاء الاستخدام في أي وقت. عند الإنهاء، قد يُقيّد الوصول لبعض البيانات أو الخدمات.</li>
          </ul>
        </CardGlass>

        <CardGlass id="law">
          <SectionTitle icon={<Scale className="h-5 w-5" color="#1D1D1D" />} title="10) القانون والاختصاص القضائي" />
          <p style={{ color: "#595959" }}>
            تخضع هذه الشروط وتُفسَّر وفق القوانين المعمول بها في <strong>جمهورية مصر العربية</strong>، وتختص محاكم القاهرة بالفصل في أي نزاع ينشأ عنها، ما لم يُتفق على خلاف ذلك كتابةً.
          </p>
        </CardGlass>

        <CardGlass id="contact">
          <SectionTitle icon={<Mail className="h-5 w-5" color="#1D1D1D" />} title="11) التواصل" />
          <div className="space-y-1" style={{ color: "#595959" }}>
            <p>للاستفسارات القانونية: <a className="underline" href="mailto:legal@youth-platform.com">legal@youth-platform.com</a></p>
          </div>
        </CardGlass>

        <div className="rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}>
          <div>
            <h3 className="text-xl md:text-2xl font-bold" style={{ color: "#1D1D1D" }}>الاستمرار يعني الموافقة</h3>
            <p className="mt-1" style={{ color: "#595959" }}>
              باستخدامك للخدمات بعد هذا التاريخ، تُعتبر موافقًا على الشروط المذكورة أعلاه.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="inline-flex items-center justify-center h-11 px-5 rounded-full font-semibold" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
              العودة للرئيسية
            </Link>
            <Link href="/about" className="inline-flex items-center justify-center h-11 px-5 rounded-full" style={{ color: "#1D1D1D", border: "1px solid #E0E0E0", backgroundColor: "#FFFFFF" }}>
              عن المنصة
            </Link>
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
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
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

function CardGlass({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="rounded-2xl p-6 scroll-mt-24" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>{icon}</span>
      <h2 className="text-xl md:text-2xl font-bold" style={{ color: "#1D1D1D" }}>{title}</h2>
    </div>
  );
}
