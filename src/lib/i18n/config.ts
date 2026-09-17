export const LOCALES = ["ar", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export const ENABLED_LOCALES: readonly Locale[] = ["ar"];

export const LOCALE_COOKIE = "NEXT_LOCALE";

export type Direction = "rtl" | "ltr";

const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isEnabledLocale(value: unknown): value is Locale {
  return isLocale(value) && ENABLED_LOCALES.includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isEnabledLocale(value) ? value : DEFAULT_LOCALE;
}

export function directionFor(locale: Locale): Direction {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export function isRTL(locale: Locale): boolean {
  return directionFor(locale) === "rtl";
}

export function htmlAttributes(locale: Locale = DEFAULT_LOCALE): {
  lang: string;
  dir: Direction;
} {
  return { lang: locale, dir: directionFor(locale) };
}
