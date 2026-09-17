import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { buildPlanContext } from "@/server/modules/planning/plan-input";
import { generatePlan } from "@/lib/planner";
import { cairoDayKey } from "@/lib/cairo";
import { getEntitlements } from "@/server/billing/entitlements";

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
  const today = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: today }).lean();
  if (!plan) {
    // Auto-generate preview (not persisted until user accepts or regens with cap)
    const context = await buildPlanContext(userId, profile);
    const items = generatePlan(context.planInput);
    plan = { items, date: today } as { items: typeof items; date: string };
  }
  const allItems = plan?.items ?? [];
  const items = ent.adaptivePlan ? allItems : allItems.slice(0, ent.studyPlanPreviewItems);
  return NextResponse.json({
    plan: items,
    date: today,
    adaptive: ent.adaptivePlan,
    upgradeRequired: !ent.adaptivePlan,
  });
}

export async function POST() {
  const s = await studentOfSession();
  if (!s) return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;
  const ent = await getEntitlements(userId);
  if (!ent.adaptivePlan) {
    return NextResponse.json(
      { code: "PLUS_REQUIRED", messageAr: "الخطة اليومية المتكيفة متاحة لمشتركي بلس." },
      { status: 403 },
    );
  }
  const today = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: today });
  if (plan && plan.status === "active") {
    // Plus-gated regen (3/day); preview always allowed
    return NextResponse.json({ plan: plan.items, date: today, regensUsed: 0, canRegen: true });
  }
  // First-time generation
  const context = await buildPlanContext(userId, profile);
  const items = generatePlan(context.planInput);
  plan = await StudyPlanModel.create({ studentId: userId, date: today, items, status: "active" });
  return NextResponse.json({ plan: plan.items, date: today, created: true });
}