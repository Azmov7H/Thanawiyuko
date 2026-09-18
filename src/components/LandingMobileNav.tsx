"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { Icon } from "@/components/ui/Icon";

const ANCHORS = [
  { href: "#features", label: "features" },
  { href: "#how", label: "how" },
  { href: "#plans", label: "plans" },
  { href: "#faq", label: "faq" },
] as const;

/** Mobile nav disclosure (icons + labels from the Arabic dictionary). */
export function LandingMobileNav() {
  const [open, setOpen] = useState(false);
  const t = useI18n().t;
  const landing = useI18n().dict.landing;

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="landing-mobile-nav"
        aria-label="القائمة"
        className="rounded-lg p-2 text-ink-soft hover:text-ink"
      >
        <Icon name="chevron" size={22} className={open ? "rotate-180" : undefined} />
      </button>
      {open && (
        <nav
          id="landing-mobile-nav"
          aria-label={landing.nav.mainAria}
          className="fixed inset-x-0 top-16 z-20 border-b border-line bg-surface shadow-card"
        >
          <ul className="mx-auto flex max-w-5xl flex-col px-4 py-1">
            {ANCHORS.map((a) => (
              <li key={a.label}>
                <a
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-base hover:text-ink"
                >
                  {landing.nav[a.label]}
                </a>
              </li>
            ))}
            <li className="flex gap-2 border-t border-line p-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-line px-3 py-2.5 text-center text-sm font-medium text-ink"
              >
                {t("common.auth.login")}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-bold text-white"
              >
                {t("common.auth.startFree")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}