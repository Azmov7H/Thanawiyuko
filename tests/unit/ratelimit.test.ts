import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimits, checkRateLimit } from "@/server/ratelimit";

describe("checkRateLimit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows up to the limit then blocks", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", 5, 60_000).ok).toBe(true);
    }
    const blocked = checkRateLimit("k", 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window", () => {
    const now = Date.now();
    expect(checkRateLimit("k2", 1, 1_000, now).ok).toBe(true);
    expect(checkRateLimit("k2", 1, 1_000, now + 500).ok).toBe(false);
    expect(checkRateLimit("k2", 1, 1_000, now + 1_001).ok).toBe(true);
  });
});
