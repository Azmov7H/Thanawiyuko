import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { getSubscription, hasPlusAccess, cancelSubscription } from "@/server/billing/service";
import { listActivePlans } from "@/server/billing/plans";

/** GET /api/subscription — current subscription status + plans. */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  const [sub, plus, plans] = await Promise.all([
    getSubscription(userId),
    hasPlusAccess(userId),
    listActivePlans(),
  ]);

  return NextResponse.json({
    subscription: sub
      ? {
          tier: sub.tier,
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    hasPlusAccess: plus,
    plans,
  });
}

/** POST /api/subscription/cancel — cancel subscription (end of period). */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  let body: { immediate?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    await cancelSubscription(userId, body.immediate ?? false);
    return NextResponse.json({ ok: true, messageAr: body.immediate ? "تم الإلغاء فورًا." : "سيتم الإلغاء في نهاية الفترة." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر الإلغاء.";
    return NextResponse.json({ code: "CANCEL_FAILED", messageAr: msg }, { status: 400 });
  }
}