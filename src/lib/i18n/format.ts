import { CAIRO_TZ } from "@/lib/cairo";
import { DEFAULT_LOCALE, type Locale } from "./config";

const LOCALE_TAGS: Record<Locale, string> = {
  ar: "ar-EG-u-nu-latn",
  en: "en-EG",
};

export function localeTag(locale: Locale = DEFAULT_LOCALE): string {
  return LOCALE_TAGS[locale];
}

export function formatDate(value: Date | number | string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: CAIRO_TZ,
    dateStyle: "long",
  }).format(new Date(value));
}

export function formatDateTime(
  value: Date | number | string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: CAIRO_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeTag(locale), options).format(value);
}

export function formatCurrency(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  currency = "EGP",
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "percent",
    ...options,
  }).format(value);
}
