import Link from "next/link";
import { SkipLink } from "@/components/SkipLink";

const pillars = [
  {
    title: "ذاكر أقل وأذكى",
    body: "خطة يومية مبنية على مستواك ونقاط ضعفك — كل عنصر معاه سبب واضح، مش جدول ثابت للكل.",
  },
  {
    title: "افهم غلطاتك",
    body: "مكتبة أخطائك محفوظة تلقائيًا مع مراجعة مجدولة وشرح متدرّج لكل سؤال.",
  },
  {
    title: "اتدرب زي الامتحان",
    body: "بنوك أسئلة مرتبطة بالمنهج، تصحيح فوري، وتدريب موقوت يحاكي ضغط الامتحان.",
  },
  {
    title: "مساعد ذكي معاك",
    body: "مدرس ذكي يشرح خطوة بخطوة ومربوط بالدرس — بحدود استخدام واضحة ومعلومة.",
  },
];

const journey = [
  { step: "١", title: "سجّل وحدد هدفك", body: "الصف والشعبة والهدف — عشان كل حاجة تتظبط عليك." },
  { step: "٢", title: "اعرف مستواك", body: "تشخيص قصير اختياري يحدد نقاط قوتك وضعفك." },
  { step: "٣", title: "ذاكر واتدرب", body: "دروس مركّزة وتدريبات بتصحيح فوري وشرح لكل سؤال." },
  { step: "٤", title: "راجع غلطاتك", body: "الأخطاء تتحفظ لوحدها وتترجعلك في الوقت المناسب." },
  { step: "٥", title: "تابع وتحسّن", body: "تقدمك ونقاط ضعفك وتوصية واضحة بالخطوة الجاية." },
];

const freeFeatures = [
  "تشخيص مبدئي لمستواك",
  "تدريب يومي بحدود مجانية",
  "مكتبة الأخطاء والمراجعة",
  "خطة مبدئية ونقاط ضعفك",
  "استخدام محدود للمساعد الذكي",
];

const plusFeatures = [
  "تدريب أوسع بدون حدود يومية",
  "امتحانات كاملة موقوتة",
  "الخطة الكاملة لكل عناصرها",
  "استخدام أوسع للمساعد الذكي",
  "تقارير وتوصيات مفصلة",
];

const trust = [
  "مبني على منهج الثانوية العامة",
  "تصحيح فوري وشرح لكل سؤال",
  "بدون إعلانات داخل التجربة",
  "بياناتك تخصك وحدك",
];

const faqs = [
  {
    q: "هل ثانويكو مجاني؟",
    a: "أيوه، تبدأ مجانًا وتجرب التشخيص والتدريب وخطة المذاكرة. الاشتراك المدفوع (Plus) اختياري وبيدي إمكانيات أوسع لما تحتاجه.",
  },
  {
    q: "إيه الفرق بين المجاني و Plus؟",
    a: "المجاني يكفي إنك تبدأ وتكوّن عادة مذاكرة. Plus بيوسّع التدريب، بيفتح الامتحانات الكاملة الموقوتة، الخطة الكاملة، واستخدام أوسع للمساعد الذكي.",
  },
  {
    q: "المحتوى بيغطي إيه؟",
    a: "الثانوية العامة بفروعها (عام، علمي علوم، علمي رياضة، أدبي): مواد ووحدات ودروس، وبنك أسئلة بشرح إلزامي لكل سؤال.",
  },
  {
    q: "هل في إعلانات؟",
    a: "لا. مفيش إعلانات جوه تجربة المذاكرة أو التدريب — التركيز أولوية.",
  },
  {
    q: "بياناتي في أمان؟",
    a: "بياناتك مرتبطة بحسابك وبس، وكلمة السر متخزنة مشفّرة. تقدر تحذف حسابك في أي وقت من الإعدادات.",
  },
  {
    q: "أقدر أستخدمه من الموبايل؟",
    a: "أيوه، التجربة متصممة للموبايل أولًا بالعربي، وتشتغل على الكمبيوتر كمان بنفس السهولة.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SkipLink />
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-ink">
            ثانويكو <span className="text-brand-600">.</span>
          </Link>
          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              المميزات
            </a>
            <a href="#how" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              كيف يعمل
            </a>
            <a href="#plans" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              الباقات
            </a>
            <a href="#faq" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              أسئلة شائعة
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink">
              دخول
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              ابدأ مجانًا
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4" id="main" tabIndex={-1}>
        <section className="py-16 text-center md:py-24" aria-labelledby="hero-title">
          <p className="mx-auto mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            مصمّم لطلاب الثانوية العامة في مصر
          </p>
          <h1 id="hero-title" className="text-3xl font-bold leading-snug text-ink md:text-5xl">
            ذاكر صح، مش كتير.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-mute md:text-lg">
            ثانويكو نظام تعلّم شخصي: يعرف نقاط ضعفك، يرجعلك غلطاتك في وقتها،
            ويمشيك على خطة يومية معمولة ليك — بدل ما تضيّع وقتك في مذاكرة عمياء.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-lg bg-brand-600 px-6 py-3 text-center font-bold text-white hover:bg-brand-700 sm:w-auto"
            >
              أنشئ حسابك مجانًا
            </Link>
            <Link
              href="/login"
              className="w-full rounded-lg border border-line bg-surface px-6 py-3 text-center font-bold text-ink hover:border-ink-mute sm:w-auto"
            >
              عندي حساب
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-mute">ابدأ مجانًا — من غير بطاقة دفع.</p>
        </section>

        <section aria-label="لماذا ثانويكو" className="border-y border-line py-6">
          <ul className="grid gap-4 text-center text-sm text-ink-soft sm:grid-cols-2 md:grid-cols-4">
            {trust.map((t) => (
              <li key={t} className="flex items-center justify-center gap-2">
                <span aria-hidden className="text-brand-600">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section id="features" className="scroll-mt-20 py-16" aria-labelledby="features-title">
          <h2 id="features-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            كل حاجة محتاجها في مكان واحد
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {pillars.map((p) => (
              <article key={p.title} className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="font-bold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-mute">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 rounded-3xl bg-surface px-4 py-16 md:px-8" aria-labelledby="how-title">
          <h2 id="how-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            بتمشي إزاي؟
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-mute">
            رحلة واضحة من أول ما تسجّل لحد ما تشوف نفسك بتتحسن.
          </p>
          <ol className="mt-10 grid gap-6 md:grid-cols-5">
            {journey.map((j) => (
              <li key={j.step} className="text-center">
                <span className="tnum mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {j.step}
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{j.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-mute">{j.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="plans" className="scroll-mt-20 py-16" aria-labelledby="plans-title">
          <h2 id="plans-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            ابدأ مجانًا، وكبّر لما تحتاج
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-mute">
            بدون التزام. تفاصيل الأسعار بتظهر جوه صفحة الاشتراك قبل التفعيل.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-lg font-bold text-ink">المجاني</h3>
              <p className="mt-1 text-sm text-ink-mute">تكوّن عادة المذاكرة وتعرف مستواك.</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden className="text-brand-600">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block rounded-lg border border-line px-4 py-2.5 text-center font-bold text-ink hover:border-ink-mute"
              >
                ابدأ مجانًا
              </Link>
            </article>

            <article className="relative rounded-2xl border-2 border-brand-600 bg-surface p-6">
              <span className="absolute -top-3 start-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                الأكثر تكاملًا
              </span>
              <h3 className="text-lg font-bold text-ink">Thanawico Plus</h3>
              <p className="mt-1 text-sm text-ink-mute">لما تكون جاهز تاخد كل حاجة.</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
                {plusFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden className="text-brand-600">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 block rounded-lg bg-brand-600 px-4 py-2.5 text-center font-bold text-white hover:bg-brand-700"
              >
                ابدأ الآن
              </Link>
            </article>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 pb-16" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            أسئلة شائعة
          </h2>
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-line bg-surface p-4">
                <summary className="cursor-pointer list-none font-medium text-ink marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-mute">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-16 rounded-3xl bg-brand-600 px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">جاهز تبدأ من صح؟</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-50">
            اعمل حسابك في دقيقة، وحدد هدفك، وخد أول جلسة النهارده.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-bold text-brand-700 hover:bg-brand-50"
          >
            ابدأ مجانًا
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 text-xs text-ink-mute sm:flex-row">
          <p>ثانويكو — نسخة تجريبية أولى. المحتوى الكامل يُضاف تدريجيًا.</p>
          <nav aria-label="روابط الفوتر" className="flex items-center gap-4">
            <a href="#features" className="hover:text-ink">
              المميزات
            </a>
            <a href="#faq" className="hover:text-ink">
              أسئلة شائعة
            </a>
            <Link href="/login" className="hover:text-ink">
              دخول
            </Link>
            <Link href="/register" className="hover:text-ink">
              حساب جديد
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-ink">
              الشروط
            </Link>
          </nav>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
