"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type NavLink = {
  href: string;
  key: "dashboard" | "practice" | "studyPlan" | "progress" | "settings";
};

/** M1 shell nav: only shipped routes are enabled (no dead ends). */
const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/practice", key: "practice" },
  { href: "/study-plan", key: "studyPlan" },
  { href: "/progress", key: "progress" },
  { href: "/settings", key: "settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav
      aria-label={t("common.nav.mainAria")}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_LINKS.map((item) => {
          const active = pathname === item.href;
          const cls = active ? "text-brand-700 font-bold" : "text-ink-mute";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center ${cls}`}
              >
                <span className="text-sm leading-none">{t(`common.nav.${item.key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside
      aria-label={t("common.nav.mainAria")}
      className="hidden w-56 shrink-0 flex-col gap-1 md:flex"
    >
      {NAV_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={`rounded-lg px-4 py-2.5 text-sm ${
            pathname === item.href
              ? "bg-brand-50 font-bold text-brand-700"
              : "text-ink-soft hover:bg-base"
          }`}
        >
          {t(`common.nav.${item.key}`)}
        </Link>
      ))}
    </aside>
  );
}

import { AiPanel } from "@/components/AiPanel";
import { SkipLink } from "@/components/SkipLink";

export function AppShell({
  children,
  deletionPurgeAt,
}: {
  children: React.ReactNode;
  deletionPurgeAt?: string | null;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-full flex-col">
      <SkipLink />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-bold text-ink">
            {t("common.brandName")} <span className="text-brand-600">.</span>
          </Link>
          <span className="rounded-full bg-base px-3 py-1 text-xs text-ink-mute">
            M1 — الأساس
          </span>
        </div>
      </header>
      {deletionPurgeAt && (
        <div role="status" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-bad">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
            <span>{t("common.deletion.banner", { date: deletionPurgeAt })}</span>
            <Link href="/settings" className="font-bold underline">
              {t("common.deletion.undo")}
            </Link>
          </div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-24 md:pb-6">
        <SideNav />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</main>
      </div>
      <BottomNav />
      <AiPanel />
    </div>
  );
}
