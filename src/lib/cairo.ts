/** Cairo-time helpers. Day boundary is 00:00 Africa/Cairo everywhere (§4). */

export const CAIRO_TZ = "Africa/Cairo";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAIRO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" key for the Cairo calendar day containing `date`. */
export function cairoDayKey(date: Date = new Date()): string {
  return dayFmt.format(date);
}

/** True if both instants fall on the same Cairo calendar day. */
export function isSameCairoDay(a: Date, b: Date): boolean {
  return cairoDayKey(a) === cairoDayKey(b);
}
