import { NextResponse } from "next/server";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/features";

const GATE_MESSAGES: Partial<Record<FeatureFlag, string>> = {
  MAINTENANCE_MODE: "الخدمة متوقفة مؤقتًا للصيانة.",
  AI_ENABLED: "المساعد الذكي غير متاح حاليًا.",
  PAYMENTS_ENABLED: "الاشتراكات غير متاحة حاليًا.",
  EXAMS_ENABLED: "الامتحانات غير متاحة حاليًا.",
};

export function featureGate(flag: FeatureFlag): NextResponse | null {
  if (isFeatureEnabled(flag)) return null;
  const retryAfterSeconds = 60;
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "FEATURE_DISABLED",
        flag,
        messageAr: GATE_MESSAGES[flag] ?? "هذه الميزة غير متاحة حاليًا.",
      },
    },
    {
      status: 503,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}