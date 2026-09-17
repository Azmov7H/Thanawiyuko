import { NextResponse } from "next/server";
import { getPaymentsProvider } from "@/server/payments/provider";
import { handlePaymentSuccess, handlePaymentFailed } from "@/server/billing/service";

/** POST /api/subscription/webhook — Paymob callback (raw body for HMAC). */
export async function POST(req: Request) {
  const signature = req.headers.get("x-paymob-signature") ?? req.headers.get("hmac") ?? "";
  const rawBody = await req.text();

  const provider = getPaymentsProvider();
  const result = provider.verifyWebhook(rawBody, signature);
  if (!result) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  if ("success" in result && result.success) {
    try {
      await handlePaymentSuccess({
        providerRef: result.providerRef,
        amountEGP: result.amountEGP,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000), // will be overridden by service
        userId: "", // service infers from pending subscription
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[Webhook] payment success error:", e);
      return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
    }
  }

  // Failure
  try {
    // We don't have userId here; Paymob includes merchant_order_id which we can parse
    await handlePaymentFailed("", "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "failure_processing_failed" }, { status: 500 });
  }
}