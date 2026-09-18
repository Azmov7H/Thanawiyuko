import { Redis } from "@upstash/redis";

/**
 * Fixed-window rate limiter.
 * Distributed (Upstash Redis) when `UPSTASH_REDIS_REST_URL`/`_REST_TOKEN` are set;
 * otherwise a per-process in-memory bucket. Distributed failures fall back to memory.
 */

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (hit.count < limit) {
    hit.count += 1;
    return { ok: true, retryAfterSec: 0 };
  }
  return {
    ok: false,
    retryAfterSec: Math.ceil((hit.resetAt - now) / 1000),
  };
}

/** Test-only reset. */
export function __resetRateLimits() {
  buckets.clear();
}

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, ttlSec: number): Promise<number>;
  ttl(key: string): Promise<number>;
};

let redis: RedisLike | null = null;
let redisProbed = false;

function getRedis(): RedisLike | null {
  if (!redisProbed) {
    redisProbed = true;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) redis = new Redis({ url, token });
  }
  return redis;
}

/** Test-only: pin a fake distributed backend (null forces memory). */
export function __setRedisBackend(client: RedisLike | null) {
  redisProbed = true;
  redis = client;
}

async function distributedRateLimit(
  client: RedisLike,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const redisKey = `rl:${key}`;
  const count = await client.incr(redisKey);
  const ttlSec = Math.ceil(windowMs / 1000);
  let ttl = await client.ttl(redisKey);
  if (ttl < 0) {
    await client.expire(redisKey, ttlSec);
    ttl = ttlSec;
  }
  if (count <= limit) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: ttl };
}

/** Distributed-aware limiter: Upstash when configured, else in-memory. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const backend = getRedis();
  if (backend) {
    try {
      return await distributedRateLimit(backend, key, limit, windowMs);
    } catch {
      // Distributed backend unreachable — fall back to per-process memory.
    }
  }
  return checkRateLimit(key, limit, windowMs, now);
}