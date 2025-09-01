"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ShieldCheck, Lock, Database, Cookie, Mail, FileText, Globe2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8 md:pt-12">
        <div className="rounded-[24px] p-6 md:p-10" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color="#1D1D1D" />
            </div>
            <span className="text-sm" style={{ color: "#6B6B6B" }}>سياسة الخصوصية</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: "#1D1D1D" }}>
            نحمي بياناتك ونحترم خصوصيتك
          </h1>
          <p className="mt-3 md:text-lg leading-relaxed" style={{ color: "#595959" }}>
            توضح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحفظها داخل منصة الكيانات الشبابية. بمتابعتك لاستخدام المنصة فأنت توافق على بنود هذه السياسة.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-8 md:mt-12 space-y-6">
        <CardGlass>
          <SectionTitle icon={<Database className="h-5 w-5" color="#1D1D1D" />} title="البيانات التي نجمعها" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>بيانات الحساب: الاسم، البريد الإلكتروني، كلمة المرور المشفرة، الدور/الكيان.</li>
            <li>بيانات الاستخدام: الصفحات التي تزورها، نوع الجهاز والمتصفح، عنوان الـ IP بشكل مقنع.</li>
            <li>بيانات تفاعلية: التسجيل في البرامج، الحضور، الاستبيانات، الرسائل للدعم.</li>
            <li>ملفات ارتباط (Cookies) لأغراض التخصيص والإحصاء (انظر قسم الكوكيز).</li>
          </ul>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<FileText className="h-5 w-5" color="#1D1D1D" />} title="أغراض الاستخدام والأسس القانونية" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>تشغيل المنصة وتقديم الخدمات الأساسية (تنفيذ عقد الاستخدام/المصلحة المشروعة).</li>
            <li>تحسين الأداء وتجربة المستخدم وإحصاءات مجهولة (المصلحة المشروعة/الموافقة).</li>
            <li>التواصل بخصوص التحديثات والدعم الفني (المصلحة المشروعة/الموافقة).</li>
            <li>الامتثال للالتزامات القانونية وحماية الحقوق.</li>
          </ul>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<Lock className="h-5 w-5" color="#1D1D1D" />} title="المشاركة والحفظ والأمان" />
          <ul className="list-disc pr-5 space-y-2" style={{ color: "#595959" }}>
            <li>لا نبيع بياناتك لأي طرف ثالث.</li>
            <li>قد نشارك بياناتًا عند الضرورة مع مزودي خدمة ملتزمين بعقود معالجة بيانات (استضافة/تحليلات/إرسال بريد).</li>
            <li>نحتفظ بالبيانات طوال مدة الحساب أو حسب ما تقتضيه أغراض الجمع والقانون، ثم نقوم بحذفها أو إخفاء هويتها.</li>
            <li>نطبّق ضوابط أمان تقنية وتنظيمية (تشفير، صلاحيات، سجلات وصول).</li>
          </ul>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<Globe2 className="h-5 w-5" color="#1D1D1D" />} title="حقوقك على بياناتك" />
          <p style={{ color: "#595959" }}>
            لديك حقوق الوصول، والتصحيح، والحذف، وتقييد أو الاعتراض على المعالجة، وسحب الموافقة متى شئت، وطلب نسخة قابلة للنقل من بياناتك. لممارسة هذه الحقوق، تواصل معنا عبر القنوات أدناه.
          </p>
        </CardGlass>

        <CookiesCard />

        <CardGlass>
          <SectionTitle icon={<Users className="h-5 w-5" color="#1D1D1D" />} title="خصوصية من هم دون 18 عامًا" />
          <p style={{ color: "#595959" }}>
            خدماتنا موجّهة للشباب عبر كيانات معتمدة. إذا ظننت أن قاصرًا زوّدنا ببيانات دون موافقة، يرجى التواصل فورًا لاتخاذ الإجراء المناسب.
          </p>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<FileText className="h-5 w-5" color="#1D1D1D" />} title="تحديثات على هذه السياسة" />
          <p style={{ color: "#595959" }}>
            قد نحدّث هذه السياسة من وقت لآخر. سننشر أي تغييرات هنا مع تعديل تاريخ التحديث. استمرارك في استخدام المنصة بعد التحديث يعني موافقتك على البنود المعدّلة.
          </p>
        </CardGlass>

        <CardGlass>
          <SectionTitle icon={<Mail className="h-5 w-5" color="#1D1D1D" />} title="التواصل" />
          <div className="space-y-1" style={{ color: "#595959" }}>
            <p>البريد: <a className="underline" href="mailto:privacy@youth-platform.com">privacy@youth-platform.com</a></p>
            <p>الدعم: <Link className="underline" href="/support">صفحة الدعم</Link></p>
            <p>الهاتف: <a className="underline" href="tel:+201000000000">+20 100 000 0000</a></p>
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
              { href: "/", label: "الرئيسية" },
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

function CardGlass({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
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

type CookiePrefs = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

function CookiesCard() {
  const [prefs, setPrefs] = useState<CookiePrefs>({ necessary: true, analytics: false, marketing: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("cookiePrefs");
      if (raw) setPrefs(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (key: keyof CookiePrefs) => setPrefs((p) => ({ ...p, [key]: key === "necessary" ? true : !p[key] }));

  const save = () => {
    localStorage.setItem("cookiePrefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
          <Cookie className="h-5 w-5" color="#1D1D1D" />
        </span>
        <h2 className="text-xl md:text-2xl font-bold" style={{ color: "#1D1D1D" }}>ملفات الارتباط (Cookies)</h2>
      </div>

      <p className="mb-4" style={{ color: "#595959" }}>
        نستخدم الكوكيز لتحسين تجربتك. يمكنك إدارة تفضيلاتك أدناه. الكوكيز الضرورية مطلوبة لتشغيل الموقع.
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        <CookieToggle title="ضرورية" desc="لازمة لتسجيل الدخول وتشغيل الأساسيات." checked={prefs.necessary} onChange={() => toggle("necessary")} disabled />
        <CookieToggle title="تحليلات" desc="مساعدة في فهم الاستخدام بشكل إحصائي." checked={prefs.analytics} onChange={() => toggle("analytics")} />
        <CookieToggle title="تسويقية" desc="محتوى مخصص وإشعارات ذات صلة." checked={prefs.marketing} onChange={() => toggle("marketing")} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="inline-flex items-center justify-center h-11 px-6 rounded-full font-semibold" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
          احفظ تفضيلاتي
        </button>
        {saved && <span className="text-sm" style={{ color: "#1D1D1D" }}>✔ تم الحفظ</span>}
      </div>
    </div>
  );
}

function CookieToggle({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className="rounded-xl p-4 block" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 4px 10px rgba(0,0,0,0.04)", opacity: disabled ? 0.75 : 1 }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold" style={{ color: "#1D1D1D" }}>{title}</div>
          <div className="text-sm" style={{ color: "#6B6B6B" }}>{desc}</div>
        </div>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="h-5 w-5 cursor-pointer" />
      </div>
    </label>
  );
}
