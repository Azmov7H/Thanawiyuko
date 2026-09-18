"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t(isDark ? "common.theme.toggleLightLabel" : "common.theme.toggleDarkLabel")}
      title={t(isDark ? "common.theme.toggleLightLabel" : "common.theme.toggleDarkLabel")}
      aria-pressed={isDark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:border-ink-mute hover:text-ink ${className}`}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41 1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
