import { NextResponse } from "next/server";
import { getPaymentsProvider } from "@/server/payments/provider";
import { handlePaymentSuccess, handlePaymentFailed } from "@/server/billing/service";
import { featureGate } from "@/server/feature-gate";
import { logServerError } from "@/server/logger";

/** POST /api/subscription/webhook — Paymob callback (raw body for HMAC). */
export async function POST(req: Request) {
  const gated = featureGate("PAYMENTS_ENABLED");
  if (gated) return gated;
  const signature =
    req.headers.get("x-paymob-signature") ??
    req.headers.get("hmac") ??
    new URL(req.url).searchParams.get("hmac") ??
    "";
  const rawBody = await req.text();

  const provider = getPaymentsProvider();
  const result = provider.verifyWebhook(rawBody, signature);
  if (!result) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  if ("success" in result) {
    try {
      if (result.success) {
        await handlePaymentSuccess({
          providerRef: result.providerRef,
          amountEGP: result.amountEGP,
          periodStart: result.paidAt,
          userId: result.studentId ?? "",
          planId: (result.planId as "monthly" | "semester" | "annual" | undefined) ?? null,
        });
      } else {
        await handlePaymentFailed(result.providerRef, result.studentId ?? "");
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      await logServerError("payments.webhook.failed", e, {
        route: "/api/subscription/webhook",
        providerRef: result.providerRef,
      });
      return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "unsupported_event" }, { status: 400 });
}