import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { startCheckout } from "@/server/billing/service";
import { findPlan, listActivePlans } from "@/server/billing/plans";
import type { PlanView } from "@/lib/plans";
import { isPlanKey } from "@/lib/plans";

/** GET /api/subscription/plans — public plan list. */
export async function GET() {
  try {
    const plans = await listActivePlans();
    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
}

/** POST /api/subscription/checkout — start Paymob checkout. */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  let body: { planId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  if (!isPlanKey(body.planId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "خطة غير موجودة." }, { status: 400 });

  let plan: PlanView | null;
  try {
    plan = await findPlan(body.planId);
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  if (!plan)
    return NextResponse.json({ code: "VALIDATION", messageAr: "خطة غير موجودة." }, { status: 400 });

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  try {
    const redirectUrl = await startCheckout({
      userId,
      email: (session?.user as { email?: string } | undefined)?.email ?? "student@thanawico.local",
      planId: plan.key,
      successUrl: `${origin}/subscription/success?session_id={session_id}`,
      cancelUrl: `${origin}/subscription?canceled=1`,
    });
    return NextResponse.json({ redirectUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر بدء الدفع.";
    return NextResponse.json({ code: "PAYMENT_ERROR", messageAr: msg }, { status: 500 });
  }
}