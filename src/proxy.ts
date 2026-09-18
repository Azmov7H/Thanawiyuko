import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REQUEST_ID_HEADER, isValidRequestId, newRequestId } from "@/lib/request-id";

const AUTH_PATHS = ["/api/auth/", "/login", "/register"];
const MAINTENANCE_ALLOW = ["/health", "/api/health"];
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

  const incoming = req.headers.get(REQUEST_ID_HEADER);
  const reqId = isValidRequestId(incoming) ? incoming : newRequestId();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, reqId);

  // Kill switch: maintenance mode blocks everything but health checks.
  const maintenance = process.env.FEATURE_MAINTENANCE_MODE;
  if (maintenance === "1" || maintenance?.toLowerCase() === "true") {
    if (!MAINTENANCE_ALLOW.some((p) => pathname.startsWith(p))) {
      return new NextResponse(
        JSON.stringify({ code: "MAINTENANCE_MODE", messageAr: "الخدمة متوقفة مؤقتًا للصيانة." }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "3600",
            [REQUEST_ID_HEADER]: reqId,
          },
        },
      );
    }
  }

  // Rate limit auth endpoints
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const key = `auth:${ip}:${pathname}`;
    const { allowed, retryAfter } = checkRateLimit(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!allowed) {
      return new NextResponse(JSON.stringify({ code: "RATE_LIMITED", messageAr: "محاولات كثيرة. حاول بعد قليل." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter), [REQUEST_ID_HEADER]: reqId },
      });
    }
  }

  // Security headers for all responses
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(REQUEST_ID_HEADER, reqId);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};