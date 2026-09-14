import Link from "next/link";

const pillars = [
  {
    title: "اتدرب بذكاء",
    body: "بنوك أسئلة مرتبطة بالمنهج مع تصحيح فوري وشرح لكل سؤال.",
  },
  {
    title: "افهم غلطاتك",
    body: "مكتبة أخطائك محفوظة تلقائيًا مع مراجعة مجدولة وشرح بالذكاء الاصطناعي.",
  },
  {
    title: "اعرف خطوتك الجاية",
    body: "خطة يومية مبنية على مستواك ونقاط ضعفك — كل عنصر معاه سبب واضح.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <span className="text-xl font-bold text-ink">
            ثانويكو <span className="text-brand-600">.</span>
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              دخول
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              ابدأ مجانًا
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12">
        <section className="py-8 text-center">
          <h1 className="text-3xl font-bold leading-snug text-ink md:text-4xl">
            ذاكر صح، مش كتير.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-mute">
            نظام التعلم الشخصي لطالب الثانوية: اعرف نقاط ضعفك، راجع غلطاتك،
            وامشي على خطة يومية معمولة ليك — مش جدول ثابت للكل.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"
            >
              أنشئ حسابك مجانًا
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-line bg-surface px-6 py-3 font-bold text-ink hover:border-ink-mute"
            >
              عندي حساب
            </Link>
          </div>
        </section>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.title}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <h2 className="font-bold text-ink">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                {p.body}
              </p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-mute">
        ثانويكو — نسخة تجريبية أولى (M1). المحتوى الدراسي الكامل يُضاف في
        المراحل القادمة.
      </footer>
    </div>
  );
}
