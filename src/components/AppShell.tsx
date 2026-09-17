"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  soon?: boolean;
};

/** M1 shell nav: only shipped routes are enabled; the rest show قريبًا (no dead ends). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/practice", label: "تدرب" },
  { href: "/study-plan", label: "خطتي" },
  { href: "/progress", label: "التقدم" },
  { href: "/settings", label: "المزيد", soon: true },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href && !item.soon;
          const cls = item.soon
            ? "cursor-not-allowed opacity-50"
            : active
              ? "text-brand-700 font-bold"
              : "text-ink-mute";
          const content = (
            <>
              <span className="text-sm leading-none">{item.label}</span>
              {item.soon && (
                <span className="mt-1 rounded-full bg-base px-1.5 py-0.5 text-[10px] text-ink-mute">
                  قريبًا
                </span>
              )}
            </>
          );
          return (
            <li key={item.href}>
              {item.soon ? (
                <span
                  aria-disabled="true"
                  className={`flex min-h-16 flex-col items-center justify-center ${cls}`}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center ${cls}`}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="التنقل الرئيسي"
      className="hidden w-56 shrink-0 flex-col gap-1 md:flex"
    >
      {NAV_ITEMS.map((item) =>
        item.soon ? (
          <span
            key={item.href}
            aria-disabled="true"
            className="flex cursor-not-allowed items-center justify-between rounded-lg px-4 py-2.5 text-sm text-ink-mute opacity-60"
          >
            {item.label}
            <span className="rounded-full bg-base px-2 py-0.5 text-[10px]">
              قريبًا
            </span>
          </span>
        ) : (
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
            {item.label}
          </Link>
        ),
      )}
    </aside>
  );
}

import { AiPanel } from "@/components/AiPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-bold text-ink">
            ثانويكو <span className="text-brand-600">.</span>
          </Link>
          <span className="rounded-full bg-base px-3 py-1 text-xs text-ink-mute">
            M1 — الأساس
          </span>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-24 md:pb-6">
        <SideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
      <AiPanel />
    </div>
  );
}
