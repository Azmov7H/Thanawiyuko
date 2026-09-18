"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { Icon, type IconName } from "@/components/ui/Icon";

type NavLink = {
  href: string;
  key: "dashboard" | "practice" | "studyPlan" | "progress" | "settings";
  icon: IconName;
};

/** M1 shell nav: only shipped routes are enabled (no dead ends). */
const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", key: "dashboard", icon: "home" },
  { href: "/practice", key: "practice", icon: "practice" },
  { href: "/study-plan", key: "studyPlan", icon: "plan" },
  { href: "/progress", key: "progress", icon: "progress" },
  { href: "/settings", key: "settings", icon: "settings" },
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
          const cls = active ? "text-brand-strong font-bold" : "text-ink-mute";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 ${cls}`}
              >
                <Icon name={item.icon} size={22} />
                <span className="text-xs leading-none">{t(`common.nav.${item.key}`)}</span>
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
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
            pathname === item.href
              ? "bg-brand-tint font-bold text-brand-strong"
              : "text-ink-soft hover:bg-base"
          }`}
        >
          <Icon name={item.icon} size={20} />
          <span>{t(`common.nav.${item.key}`)}</span>
        </Link>
      ))}
    </aside>
  );
}

import { AiPanel } from "@/components/AiPanel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SkipLink } from "@/components/SkipLink";
import { NotificationBell } from "@/components/NotificationBell";

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
            {t("common.brandName")} <span className="text-brand-accent">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>
      {deletionPurgeAt && (
        <div role="status" className="border-b border-danger-line bg-danger-bg px-4 py-2 text-sm text-bad">
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
