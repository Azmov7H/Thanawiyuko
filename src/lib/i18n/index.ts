import { DEFAULT_LOCALE, resolveLocale, type Locale } from "./config";
import { ar, type Dictionary } from "./dictionaries/ar";

export * from "./config";
export * from "./translate";
export * from "./format";
export type { Dictionary } from "./dictionaries/ar";

const dictionaries: Partial<Record<Locale, Dictionary>> = { ar };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[resolveLocale(locale)] ?? ar;
}
