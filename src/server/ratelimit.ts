/** Tiny in-memory fixed-window rate limiter (per process).
 *  MVP guard for auth endpoints. P12/V1.1: move to Redis for multi-instance.
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
