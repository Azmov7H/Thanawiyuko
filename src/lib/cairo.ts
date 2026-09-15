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

const wallFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAIRO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function cairoOffsetMs(atUTCms: number): number {
  const parts = wallFmt.formatToParts(new Date(atUTCms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUTC - atUTCms;
}

/**
 * UTC instant of 00:00 Cairo for the Cairo day containing `date`.
 * Handles +2/+3 DST via two offset iterations.
 */
export function cairoDayStartUTC(date: Date = new Date()): Date {
  const [y, m, d] = dayFmt.format(date).split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  for (let i = 0; i < 3; i++) guess = Date.UTC(y, m - 1, d, 0, 0, 0) - cairoOffsetMs(guess);
  return new Date(guess);
}
