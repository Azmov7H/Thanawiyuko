/** Plain-text extraction from markdown-ish content for PDF rendering. */

export function mdToPlain(input: string, maxLength?: number): string {
  let text = String(input ?? "");
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/`([^`]*)`/g, "$1");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^[-*+]\s+/gm, "• ");
  text = text.replace(/^\d+\.\s+/gm, "");
  text = text.replace(/\s+/g, " ").trim();
  if (maxLength != null && text.length > maxLength) {
    text = text.slice(0, maxLength).trimEnd() + "…";
  }
  return text;
}

export function formatCairoDate(iso: string | Date, style: "long" | "short" = "long"): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: style,
    timeZone: "Africa/Cairo",
  }).format(date);
}

export function secondsPlain(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} ث`;
  return `${Math.floor(s / 60)} د ${s % 60} ث`;
}

export const ACTION_AR: Record<string, string> = {
  practice: "تدريب",
  review: "مراجعة",
  lesson: "درس",
};