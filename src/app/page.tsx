import Link from "next/link";
import { SkipLink } from "@/components/SkipLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n";

const dict = getDictionary(DEFAULT_LOCALE);
const { landing, common } = dict;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: landing.faq.items.map((f) => ({
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
            {common.brandName} <span className="text-brand-accent">.</span>
          </Link>
          <nav aria-label={landing.nav.mainAria} className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              {landing.nav.features}
            </a>
            <a href="#how" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              {landing.nav.how}
            </a>
            <a href="#plans" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              {landing.nav.plans}
            </a>
            <a href="#faq" className="rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink">
              {landing.nav.faq}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink">
              {common.auth.login}
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              {common.auth.startFree}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4" id="main" tabIndex={-1}>
        <section className="py-16 text-center md:py-24" aria-labelledby="hero-title">
          <p className="mx-auto mb-4 inline-block rounded-full bg-brand-tint px-3 py-1 text-xs font-medium text-brand-strong">
            {landing.hero.badge}
          </p>
          <h1 id="hero-title" className="text-3xl font-bold leading-snug text-ink md:text-5xl">
            {landing.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-mute md:text-lg">
            {landing.hero.body}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-lg bg-brand-600 px-6 py-3 text-center font-bold text-white hover:bg-brand-700 sm:w-auto"
            >
              {landing.hero.ctaPrimary}
            </Link>
            <Link
              href="/login"
              className="w-full rounded-lg border border-line bg-surface px-6 py-3 text-center font-bold text-ink hover:border-ink-mute sm:w-auto"
            >
              {landing.hero.ctaSecondary}
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-mute">{landing.hero.note}</p>
        </section>

        <section aria-label={landing.trust.label} className="border-y border-line py-6">
          <ul className="grid gap-4 text-center text-sm text-ink-soft sm:grid-cols-2 md:grid-cols-4">
            {landing.trust.items.map((t) => (
              <li key={t} className="flex items-center justify-center gap-2">
                <span aria-hidden className="text-brand-accent">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section id="features" className="scroll-mt-20 py-16" aria-labelledby="features-title">
          <h2 id="features-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            {landing.features.title}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {landing.features.items.map((p) => (
              <article key={p.title} className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="font-bold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-mute">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 rounded-3xl bg-surface px-4 py-16 md:px-8" aria-labelledby="how-title">
          <h2 id="how-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            {landing.how.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-mute">
            {landing.how.body}
          </p>
          <ol className="mt-10 grid gap-6 md:grid-cols-5">
            {landing.how.steps.map((j) => (
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
            {landing.plans.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-mute">
            {landing.plans.body}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-lg font-bold text-ink">{landing.plans.free.name}</h3>
              <p className="mt-1 text-sm text-ink-mute">{landing.plans.free.tagline}</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
                {landing.plans.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden className="text-brand-accent">
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
                {landing.plans.free.cta}
              </Link>
            </article>

            <article className="relative rounded-2xl border-2 border-brand-accent bg-surface p-6">
              <span className="absolute -top-3 start-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                {landing.plans.plus.badge}
              </span>
              <h3 className="text-lg font-bold text-ink">{landing.plans.plus.name}</h3>
              <p className="mt-1 text-sm text-ink-mute">{landing.plans.plus.tagline}</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
                {landing.plans.plus.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden className="text-brand-accent">
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
                {landing.plans.plus.cta}
              </Link>
            </article>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 pb-16" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-center text-2xl font-bold text-ink md:text-3xl">
            {landing.faq.title}
          </h2>
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
            {landing.faq.items.map((f) => (
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
          <h2 className="text-2xl font-bold text-white">{landing.finalCta.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-50">{landing.finalCta.body}</p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-bold text-brand-onlight hover:bg-brand-onlight/10"
          >
            {landing.finalCta.button}
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 text-xs text-ink-mute sm:flex-row">
          <p>{landing.footer.tagline}</p>
          <nav aria-label={landing.footer.navAria} className="flex items-center gap-4">
            <a href="#features" className="hover:text-ink">
              {landing.footer.features}
            </a>
            <a href="#faq" className="hover:text-ink">
              {landing.footer.faq}
            </a>
            <Link href="/login" className="hover:text-ink">
              {common.auth.login}
            </Link>
            <Link href="/register" className="hover:text-ink">
              {common.auth.register}
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              {common.footer.privacy}
            </Link>
            <Link href="/terms" className="hover:text-ink">
              {common.footer.terms}
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
