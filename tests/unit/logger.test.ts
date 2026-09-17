import { afterEach, describe, expect, it, vi } from "vitest";
import { REDACTED, formatLog, logEvent, redact, shouldLog, errorToLog, LOG_LEVELS } from "@/lib/logger";
import { isValidRequestId, newRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";
import { hashUser } from "@/server/logger";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_LEVEL;
});

describe("shouldLog", () => {
  it("respects level thresholds", () => {
    expect(LOG_LEVELS).toEqual(["debug", "info", "warn", "error"]);
    expect(shouldLog("info", "error")).toBe(true);
    expect(shouldLog("info", "info")).toBe(true);
    expect(shouldLog("info", "debug")).toBe(false);
    expect(shouldLog("error", "warn")).toBe(false);
  });
});

describe("redact (README §18)", () => {
  it("masks sensitive keys case-insensitively and recursively", () => {
    const out = redact({
      userHash: "abc",
      Password: "hunter2",
      nested: { accessToken: "t", email: "a@b.c", ok: 1 },
      list: [{ refreshToken: "r" }],
    }) as Record<string, unknown>;
    expect(out.userHash).toBe("abc");
    expect(out.Password).toBe(REDACTED);
    const nested = out.nested as Record<string, unknown>;
    expect(nested.accessToken).toBe(REDACTED);
    expect(nested.email).toBe(REDACTED);
    expect(nested.ok).toBe(1);
    expect((out.list as Record<string, unknown>[])[0].refreshToken).toBe(REDACTED);
  });

  it("handles circular references without throwing", () => {
    const a: Record<string, unknown> = { name: "x" };
    a.self = a;
    expect(() => redact(a)).not.toThrow();
  });
});

describe("formatLog", () => {
  it("produces canonical fields and never leaks secrets", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    const line = formatLog("info", "auth.login", { reqId: "r-1", password: "x", route: "/login" }, at);
    expect(line.at).toBe(at.toISOString());
    expect(line.level).toBe("info");
    expect(line.event).toBe("auth.login");
    expect(line.reqId).toBe("r-1");
    expect(line.password).toBe(REDACTED);
    expect(JSON.stringify(line)).not.toContain("x");
  });
});

describe("errorToLog", () => {
  it("serializes errors and unknown values", () => {
    expect(errorToLog(new TypeError("boom")).message).toBe("boom");
    expect(errorToLog("nope")).toEqual({ name: "UnknownError", message: "nope" });
  });
});

describe("logEvent", () => {
  it("emits JSON and honors LOG_LEVEL", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logEvent("info", "test.info", { reqId: "r-2" });
    logEvent("debug", "test.debug", { reqId: "r-2" });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.event).toBe("test.info");
    expect(parsed.reqId).toBe("r-2");
    expect(debugSpy).not.toHaveBeenCalled();
  });
});

describe("request ids", () => {
  it("generates valid ids and validates headers", () => {
    const id = newRequestId();
    expect(isValidRequestId(id)).toBe(true);
    expect(isValidRequestId("short")).toBe(false);
    expect(isValidRequestId("bad id with spaces")).toBe(false);
    expect(isValidRequestId(null)).toBe(false);
    expect(REQUEST_ID_HEADER).toBe("x-request-id");
  });
});

describe("hashUser", () => {
  it("is stable, anonymous-safe, and not reversible to the raw id", () => {
    expect(hashUser("user-123")).toBe(hashUser("user-123"));
    expect(hashUser("user-123")).not.toBe(hashUser("user-124"));
    expect(hashUser("user-123")).not.toContain("user-123");
    expect(hashUser(null)).toBe("anon");
  });
});
