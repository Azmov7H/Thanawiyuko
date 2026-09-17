export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,80}$/;

export function isValidRequestId(value: string | null | undefined): value is string {
  return typeof value === "string" && REQUEST_ID_RE.test(value);
}

export function newRequestId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
