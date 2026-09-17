import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { REQUEST_ID_HEADER, isValidRequestId, newRequestId } from "@/lib/request-id";
import { errorToLog, logEvent } from "@/lib/logger";
import type { LogLevel } from "@/lib/logger";

/** Stable pseudonym so logs never contain raw user ids (README §18). */
export function hashUser(userId: string | null | undefined): string {
  if (!userId) return "anon";
  return createHash("sha256").update(String(userId)).digest("hex").slice(0, 16);
}

/** Request id set by the proxy, falling back to a fresh id outside a request scope. */
export async function getRequestId(): Promise<string> {
  try {
    const h = await headers();
    const id = h.get(REQUEST_ID_HEADER);
    if (isValidRequestId(id)) return id;
  } catch {
    // not in a request scope
  }
  return newRequestId();
}

export async function logServerEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): Promise<void> {
  const reqId = await getRequestId();
  logEvent(level, event, { reqId, ...fields });
}

export async function logServerError(
  event: string,
  error: unknown,
  fields: Record<string, unknown> = {},
): Promise<void> {
  await logServerEvent("error", event, { ...fields, error: errorToLog(error) });
}
