import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetRateLimits,
  __setRedisBackend,
  checkRateLimit,
  rateLimit,
} from "@/server/ratelimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimits();
    vi.resetModules();
  });

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

describe("rateLimit (distributed-aware)", () => {
  beforeEach(() => {
    __resetRateLimits();
    __setRedisBackend(null);
  });

  it("falls back to in-memory when no Redis is configured", async () => {
    let rl = await rateLimit("mem", 2, 1000);
    expect(rl.ok).toBe(true);
    rl = await rateLimit("mem", 2, 1000);
    expect(rl.ok).toBe(true);
    rl = await rateLimit("mem", 2, 1000);
    expect(rl.ok).toBe(false);
    expect(rl.retryAfterSec).toBeGreaterThan(0);
  });

  it("uses the distributed backend when configured", async () => {
    const incr = vi.fn(async () => 6);
    const ttl = vi.fn(async () => 30);
    const expire = vi.fn(async () => 1);
    __setRedisBackend({ incr, expire, ttl });

    const rl = await rateLimit("k", 5, 60_000);
    expect(rl.ok).toBe(false);
    expect(rl.retryAfterSec).toBe(30);
    expect(incr).toHaveBeenCalledWith("rl:k");
  });

  it("sets TTL on first incr (no existing key)", async () => {
    const incr = vi.fn(async () => 1);
    const ttl = vi.fn(async () => -1);
    const expire = vi.fn(async () => 1);
    __setRedisBackend({ incr, expire, ttl });

    const rl = await rateLimit("fresh", 5, 60_000);
    expect(rl.ok).toBe(true);
    expect(expire).toHaveBeenCalledWith("rl:fresh", 60);
  });

  it("falls back to memory when the distributed backend errors", async () => {
    const incr = vi.fn(async () => {
      throw new Error("redis down");
    });
    const ttl = vi.fn(async () => 1);
    const expire = vi.fn(async () => 1);
    __setRedisBackend({ incr, expire, ttl });

    const rl = await rateLimit("down", 3, 1000);
    expect(rl.ok).toBe(true);
    const again = await rateLimit("down", 3, 1000);
    expect(again.ok).toBe(true);
  });
});