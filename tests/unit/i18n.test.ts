import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  directionFor,
  formatCurrency,
  formatDate,
  formatNumber,
  getDictionary,
  htmlAttributes,
  isEnabledLocale,
  isLocale,
  isRTL,
  localeTag,
  resolveLocale,
  translate,
} from "@/lib/i18n";

describe("i18n config", () => {
  it("defaults to Arabic and treats only en as a known locale", () => {
    expect(DEFAULT_LOCALE).toBe("ar");
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(42)).toBe(false);
  });

  it("clamps to enabled locales (only ar is shipped in MVP)", () => {
    expect(isEnabledLocale("ar")).toBe(true);
    expect(isEnabledLocale("en")).toBe(false);
    expect(resolveLocale("en")).toBe("ar");
    expect(resolveLocale("fr")).toBe("ar");
    expect(resolveLocale(undefined)).toBe("ar");
  });

  it("derives direction and html attributes", () => {
    expect(directionFor("ar")).toBe("rtl");
    expect(directionFor("en")).toBe("ltr");
    expect(isRTL("ar")).toBe(true);
    expect(htmlAttributes("ar")).toEqual({ lang: "ar", dir: "rtl" });
    expect(htmlAttributes("en")).toEqual({ lang: "en", dir: "ltr" });
  });
});

describe("translate", () => {
  const dict = getDictionary("ar");

  it("reads nested keys from the Arabic dictionary", () => {
    expect(translate(dict, "common.brandName")).toBe("ثانويكو");
    expect(translate(dict, "landing.hero.title")).toBe("ذاكر صح، مش كتير.");
  });

  it("falls back to the key when missing or not a string", () => {
    expect(translate(dict, "landing.missing")).toBe("landing.missing");
    expect(translate(dict, "landing.hero")).toBe("landing.hero");
  });

  it("interpolates params and leaves unknown ones intact", () => {
    expect(translate(dict, "common.deletion.banner", { date: "1 يناير 2026" })).toBe(
      "حسابك قيد الحذف — سيتم الحذف النهائي في 1 يناير 2026.",
    );
    expect(translate(dict, "common.deletion.banner")).toContain("{date}");
  });
});

describe("format", () => {
  const at = new Date("2024-01-05T12:00:00Z");

  it("formats dates in Cairo time with Western digits", () => {
    expect(localeTag("ar")).toContain("nu-latn");
    expect(formatDate(at, "ar")).toContain("2024");
  });

  it("formats numbers and currency with Western digits", () => {
    expect(formatNumber(1234, "ar")).toBe("1,234");
    expect(formatCurrency(250, "ar")).toContain("250");
  });
});
