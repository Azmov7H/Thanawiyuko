import { newRequestId } from "@/lib/request-id";

export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "idtoken",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "api_key",
  "hmac",
  "signature",
  "card",
  "cardnumber",
  "cvv",
  "phone",
  "email",
  "transcript",
  "messages",
]);

export const REDACTED = "[redacted]";

export function shouldLog(threshold: LogLevel, level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(threshold);
}

function minLevel(): LogLevel {
  const raw = typeof process !== "undefined" ? process.env.LOG_LEVEL?.toLowerCase() : undefined;
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error" ? raw : "info";
}

export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth > 6) return "[truncated]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(val, depth + 1, seen);
  }
  return out;
}

export function errorToLog(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    const includeStack = typeof process === "undefined" || process.env.NODE_ENV !== "production";
    return includeStack
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: error.name, message: error.message };
  }
  return { name: "UnknownError", message: String(error) };
}

export function formatLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown>,
  now: Date = new Date(),
): Record<string, unknown> {
  const redacted = redact(fields) as Record<string, unknown>;
  return { at: now.toISOString(), level, event, ...redacted };
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  if (!shouldLog(minLevel(), level)) return;
  let line: string;
  try {
    line = JSON.stringify(formatLog(level, event, fields));
  } catch {
    line = JSON.stringify({ at: new Date().toISOString(), level, event, serializationError: true });
  }
  const sink = console[level] ?? console.log;
  sink(line);
}

export function requestFields(reqId?: string, route?: string, userHash?: string): Record<string, unknown> {
  return { reqId: reqId ?? newRequestId(), ...(route ? { route } : {}), ...(userHash ? { userHash } : {}) };
}
