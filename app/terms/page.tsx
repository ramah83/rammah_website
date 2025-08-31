"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  FileText,
  Shield,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Globe2,
  Mail,
} from "lucide-react";

export default function TermsPage() {
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
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/90 text-sm">الشروط والأحكام</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            شروط استخدام منصة الكيانات الشبابية
          </h1>
          <p className="text-white/85 mt-3 md:text-lg leading-relaxed">
            باستخدامك للمنصة، فأنت توافق على الالتزام بهذه الشروط، بالإضافة إلى سياسة الخصوصية.
            يرجى قراءة البنود بعناية.
          </p>
          <p className="text-white/70 mt-2 text-sm">آخر تحديث: 31 أغسطس 2025</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 text-white">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" /> الفهرس
          </h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-white/90 text-sm">
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
          <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} title="1) المقدمة والقبول" />
          <p className="text-white/85">
            هذه الشروط تنظّم استخدامك لمنصة الكيانات الشبابية. بدخولك أو استخدامك للخدمات، تقرّ بأنك
            قرأت وفهمت ووافقت على الالتزام بهذه الشروط وسياسة الخصوصية. إذا لم توافق على أي بند، يرجى
            التوقف عن استخدام المنصة.
          </p>
        </CardGlass>

        <CardGlass id="service">
          <SectionTitle icon={<Globe2 className="h-5 w-5" />} title="2) الخدمات وحدود الاستخدام" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>نوفر أدوات لإدارة الكيانات والبرامج والأعضاء وقياس الأثر.</li>
            <li>يُسمح بالوصول والاستخدام وفق سياسات المنصة والصلاحيات المخوّلة لكل دور.</li>
            <li>نحتفظ بالحق في تعديل أو تعليق أو إيقاف أي جزء من الخدمات وفق الحاجة.</li>
          </ul>
        </CardGlass>

        <CardGlass id="accounts">
          <SectionTitle icon={<Shield className="h-5 w-5" />} title="3) الحسابات والأمان" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>تلتزم بتقديم معلومات صحيحة والحفاظ على سرية بيانات الدخول.</li>
            <li>تتحمل مسؤولية جميع الأنشطة التي تتم عبر حسابك.</li>
            <li>يحق لنا تعليق/إيقاف الحساب عند مخالفة الشروط أو الاشتباه بإساءة الاستخدام.</li>
          </ul>
        </CardGlass>

        <CardGlass id="conduct">
          <SectionTitle icon={<AlertTriangle className="h-5 w-5" />} title="4) الاستخدامات الممنوعة" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>أي نشاط غير قانوني أو ينتهك حقوق الآخرين.</li>
            <li>محاولات الاختراق أو تعطيل الخدمة أو تجاوز الضوابط الأمنية.</li>
            <li>نشر محتوى مُسيء، أو مضلل، أو ينتهك الخصوصية والملكية الفكرية.</li>
            <li>جمع بيانات دون موافقة أصحابها أو لأغراض غير مصرح بها.</li>
          </ul>
        </CardGlass>

        <CardGlass id="content">
          <SectionTitle icon={<FileText className="h-5 w-5" />} title="5) المحتوى والملكية الفكرية" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>تحتفظ بحقوقك في المحتوى الذي تقدّمه، وتمنحنا ترخيصًا محدودًا لتشغيل الخدمات.</li>
            <li>جميع علامات وشعارات وواجهات المنصة مملوكة للمنصة ولا يجوز استخدامها دون إذن.</li>
            <li>قد نزيل أو نقيّد المحتوى المخالف للشروط أو القانون.</li>
          </ul>
        </CardGlass>

        <CardGlass id="fees">
          <SectionTitle icon={<Scale className="h-5 w-5" />} title="6) الرسوم والدفع (إن وجدت)" />
          <p className="text-white/85">
            قد نوفر باقات مجانية ومدفوعة. تُعرض الأسعار وطرق الدفع وشروط الإلغاء في صفحات الخطة/الفوترة
            وقت الاشتراك. أي مبالغ مدفوعة قد لا تكون قابلة للاسترداد إلا وفق السياسة المحددة وقت الشراء.
          </p>
        </CardGlass>

        <CardGlass id="disclaimer">
          <SectionTitle icon={<AlertTriangle className="h-5 w-5" />} title="7) إخلاء المسؤولية" />
          <p className="text-white/85">
            تُقدّم الخدمات &quot;كما هي&quot; و&quot;كما هي متاحة&quot; دون ضمانات صريحة أو ضمنية بما في ذلك
            على سبيل المثال لا الحصر ضمانات الملاءمة لغرض معيّن أو عدم الانتهاك. قد تتعرض الخدمات
            لانقطاعات أو تحديثات.
          </p>
        </CardGlass>

        <CardGlass id="liability">
          <SectionTitle icon={<Scale className="h-5 w-5" />} title="8) حدود المسؤولية" />
          <p className="text-white/85">
            إلى الحد الذي يسمح به القانون، لا نتحمل مسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية أو
            خسائر في الأرباح أو البيانات نتيجة لاستخدامك للخدمات. في جميع الأحوال، يكون حدّ مسؤوليتنا
            الإجمالي عمّا تدفعه مقابل الخدمات خلال آخر 12 شهرًا (إن وجد).
          </p>
        </CardGlass>

        <CardGlass id="changes">
          <SectionTitle icon={<FileText className="h-5 w-5" />} title="9) التعديلات وإنهاء الخدمة" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>قد نُجري تحديثات على الشروط وسننشرها هنا مع تاريخ سريانها.</li>
            <li>يحق لأي طرف إنهاء الاستخدام في أي وقت. عند الإنهاء، قد يُقيّد الوصول لبعض البيانات أو الخدمات.</li>
          </ul>
        </CardGlass>

        <CardGlass id="law">
          <SectionTitle icon={<Scale className="h-5 w-5" />} title="10) القانون والاختصاص القضائي" />
          <p className="text-white/85">
            تخضع هذه الشروط وتُفسَّر وفق القوانين المعمول بها في <strong>جمهورية مصر العربية</strong>،
            وتختص محاكم القاهرة بالفصل في أي نزاع ينشأ عنها، ما لم يُتفق على خلاف ذلك كتابةً.
          </p>
        </CardGlass>

        <CardGlass id="contact">
          <SectionTitle icon={<Mail className="h-5 w-5" />} title="11) التواصل" />
          <div className="text-white/85 space-y-1">
            <p>للاستفسارات القانونية: <a className="underline hover:text-white" href="mailto:legal@youth-platform.com">legal@youth-platform.com</a></p>
            <p>الدعم: <Link className="underline hover:text-white" href="/support">صفحة الدعم</Link></p>
            <p>الخصوصية: <Link className="underline hover:text-white" href="/privacy">سياسة الخصوصية</Link></p>
          </div>
        </CardGlass>

        <div className="rounded-[22px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-bold">الاستمرار يعني الموافقة</h3>
            <p className="text-white/85 mt-1">
              باستخدامك للخدمات بعد هذا التاريخ، تُعتبر موافقًا على الشروط المذكورة أعلاه.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-white text-slate-900 font-semibold"
            >
              العودة للرئيسية
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full ring-1 ring-white/60 text-white hover:bg-white/10"
            >
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
            <Link href="/privacy" className={linkCls("/privacy")}>الخصوصية</Link>
            <Link href="/terms" className={linkCls("/terms")}>الشروط</Link>
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

function CardGlass({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-6 text-white scroll-mt-24">
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">{icon}</span>
      <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
    </div>
  );
}
