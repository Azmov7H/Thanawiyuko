"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, directionFor, type Direction, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./index";
import { translate, type TranslateParams } from "./translate";

type LocaleContextValue = {
  locale: Locale;
  dir: Direction;
  dict: Dictionary;
  t: (key: string, params?: TranslateParams) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dir: directionFor(locale),
      dict,
      t: (key, params) => translate(dict, key, params),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within a LocaleProvider");
  return ctx;
}
