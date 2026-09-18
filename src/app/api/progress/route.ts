import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { getProgressSnapshot } from "@/server/modules/progress/service";
import { getEntitlements } from "@/server/billing/entitlements";

/** GET /api/progress — unified progress snapshot (dashboard feed). */
export async function GET() {
  const s = await studentOfSession();
  if (!s) return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;
  const ent = await getEntitlements(userId);
  const snapshot = await getProgressSnapshot(userId, profile);

  return NextResponse.json({
    xp: snapshot.xp,
    streak: snapshot.streak,
    subjects: snapshot.subjects,
    weakTopics: snapshot.weakTopics,
    readiness: snapshot.readiness,
    next: snapshot.next,
    mistakesDue: snapshot.mistakesDue,
    plan: ent.adaptivePlan ? snapshot.plan : snapshot.plan.slice(0, ent.studyPlanPreviewItems),
    upgradeRequired: !ent.adaptivePlan,
  });
}