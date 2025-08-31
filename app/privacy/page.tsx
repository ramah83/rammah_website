"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  ShieldCheck,
  Lock,
  Database,
  Cookie,
  Mail,
  Phone,
  FileText,
  Globe2,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function PrivacyPage() {
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
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/90 text-sm">سياسة الخصوصية</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            نحمي بياناتك ونحترم خصوصيتك
          </h1>
          <p className="text-white/85 mt-3 md:text-lg leading-relaxed">
            توضح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحفظها داخل منصة الكيانات الشبابية.
            بمتابعتك لاستخدام المنصة فأنت توافق على بنود هذه السياسة.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12 space-y-6">
        <CardGlass>
          <SectionTitle icon={<Database className="h-5 w-5" />} title="البيانات التي نجمعها" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>بيانات الحساب: الاسم، البريد الإلكتروني، كلمة المرور المشفرة، الدور/الكيان.</li>
            <li>بيانات الاستخدام: الصفحات التي تزورها، نوع الجهاز والمتصفح، عنوان الـ IP بشكل مقنع.</li>
            <li>بيانات تفاعلية: التسجيل في البرامج، الحضور، الاستبيانات، الرسائل للدعم.</li>
            <li>ملفات ارتباط (Cookies) لأغراض التخصيص والإحصاء (انظر قسم الكوكيز).</li>
          </ul>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<FileText className="h-5 w-5" />} title="أغراض الاستخدام والأسس القانونية" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>تشغيل المنصة وتقديم الخدمات الأساسية (تنفيذ عقد الاستخدام/المصلحة المشروعة).</li>
            <li>تحسين الأداء وتجربة المستخدم وإحصاءات مجهولة (المصلحة المشروعة/الموافقة).</li>
            <li>التواصل بخصوص التحديثات والدعم الفني (المصلحة المشروعة/الموافقة).</li>
            <li>الامتثال للالتزامات القانونية وحماية الحقوق.</li>
          </ul>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<Lock className="h-5 w-5" />} title="المشاركة والحفظ والأمان" />
          <ul className="list-disc pr-5 text-white/85 space-y-2">
            <li>لا نبيع بياناتك لأي طرف ثالث.</li>
            <li>قد نشارك بياناتًا عند الضرورة مع مزودي خدمة ملتزمين بعقود معالجة بيانات (استضافة/تحليلات/إرسال بريد).</li>
            <li>نحتفظ بالبيانات طوال مدة الحساب أو حسب ما تقتضيه أغراض الجمع والقانون، ثم نقوم بحذفها أو إخفاء هويتها.</li>
            <li>نطبّق ضوابط أمان تقنية وتنظيمية (تشفير، صلاحيات، سجلات وصول).</li>
          </ul>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<Globe2 className="h-5 w-5" />} title="حقوقك على بياناتك" />
          <p className="text-white/85">
            لديك حقوق الوصول، والتصحيح، والحذف، وتقييد أو الاعتراض على المعالجة، وسحب الموافقة متى شئت،
            وطلب نسخة قابلة للنقل من بياناتك. لممارسة هذه الحقوق، تواصل معنا عبر القنوات أدناه.
          </p>
        </CardGlass>

        <CookiesCard />

        <CardGlass>
          <SectionTitle icon={<Users className="h-5 w-5" />} title="خصوصية من هم دون 18 عامًا" />
          <p className="text-white/85">
            خدماتنا موجّهة للشباب عبر كيانات معتمدة. إذا ظننت أن قاصرًا زوّدنا ببيانات دون موافقة،
            يرجى التواصل فورًا لاتخاذ الإجراء المناسب.
          </p>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<FileText className="h-5 w-5" />} title="تحديثات على هذه السياسة" />
          <p className="text-white/85">
            قد نحدّث هذه السياسة من وقت لآخر. سننشر أي تغييرات هنا مع تعديل تاريخ التحديث.
            استمرارك في استخدام المنصة بعد التحديث يعني موافقتك على البنود المعدّلة.
          </p>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<Mail className="h-5 w-5" />} title="التواصل" />
          <div className="text-white/85 space-y-1">
            <p>البريد: <a className="underline hover:text-white" href="mailto:privacy@youth-platform.com">privacy@youth-platform.com</a></p>
            <p>الدعم: <Link className="underline hover:text-white" href="/support">صفحة الدعم</Link></p>
            <p>الهاتف: <a className="underline hover:text-white" href="tel:+201000000000">+20 100 000 0000</a></p>
          </div>
        </CardGlass>

        <div className="h-2" />
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

function CardGlass({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-6 text-white">
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


type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

function CookiesCard() {
  const [prefs, setPrefs] = useState<CookiePrefs>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("cookiePrefs");
      if (raw) setPrefs(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (key: keyof CookiePrefs) =>
    setPrefs((p) => ({ ...p, [key]: key === "necessary" ? true : !p[key] }));

  const save = () => {
    localStorage.setItem("cookiePrefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-6 text-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
          <Cookie className="h-5 w-5" />
        </span>
        <h2 className="text-xl md:text-2xl font-bold">ملفات الارتباط (Cookies)</h2>
      </div>

      <p className="text-white/85 mb-4">
        نستخدم الكوكيز لتحسين تجربتك. يمكنك إدارة تفضيلاتك أدناه. الكوكيز الضرورية مطلوبة لتشغيل الموقع.
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        <CookieToggle
          title="ضرورية"
          desc="لازمة لتسجيل الدخول وتشغيل الأساسيات."
          checked={prefs.necessary}
          onChange={() => toggle("necessary")}
          disabled
        />
        <CookieToggle
          title="تحليلات"
          desc="مساعدة في فهم الاستخدام بشكل إحصائي."
          checked={prefs.analytics}
          onChange={() => toggle("analytics")}
        />
        <CookieToggle
          title="تسويقية"
          desc="محتوى مخصص وإشعارات ذات صلة."
          checked={prefs.marketing}
          onChange={() => toggle("marketing")}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-white text-slate-900 font-semibold"
        >
          احفظ تفضيلاتي
        </button>
        {saved && <span className="text-emerald-200 text-sm">✔ تم الحفظ</span>}
      </div>
    </div>
  );
}

function CookieToggle({
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`rounded-xl ring-1 ring-white/20 bg-white/10 p-4 block ${
        disabled ? "opacity-70" : "hover:bg-white/15"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-white/80 text-sm">{desc}</div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="h-5 w-5 accent-white cursor-pointer"
        />
      </div>
    </label>
  );
}
