import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = ["/api/auth/", "/login", "/register"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

const ipCounts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const hit = ipCounts.get(key);
  if (!hit || hit.resetAt <= now) {
    ipCounts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (hit.count < max) {
    hit.count += 1;
    return { allowed: true, retryAfter: 0 };
  }
  return { allowed: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Rate limit auth endpoints
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const key = `auth:${ip}:${pathname}`;
    const { allowed, retryAfter } = checkRateLimit(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!allowed) {
      return new NextResponse(JSON.stringify({ code: "RATE_LIMITED", messageAr: "محاولات كثيرة. حاول بعد قليل." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
      });
    }
  }

  // Security headers for all responses
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/api/auth/:path*", "/login", "/register"],
};