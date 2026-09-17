import { createHmac, timingSafeEqual } from "node:crypto";
import { logEvent } from "@/lib/logger";

export interface CheckoutSession {
  sessionId: string;
  redirectUrl: string;
  expiresAt: Date;
}

export interface PaymentResult {
  success: boolean;
  providerRef: string; // Paymob transaction ID
  amountEGP: number;
  currency: string;
  paidAt: Date;
  raw: unknown;
  studentId?: string;
  planId?: string;
}

export interface SubscriptionEvent {
  type: "subscription_created" | "subscription_renewed" | "subscription_cancelled" | "payment_failed" | "payment_succeeded";
  userId: string;
  planId: string;
  providerRef: string;
  amountEGP: number;
  periodStart: Date;
  periodEnd: Date;
  raw: unknown;
}

export interface PaymentsProvider {
  /** Create a checkout session for a new subscription. */
  createCheckout(args: {
    userId: string;
    email: string;
    planId: string;
    amountEGP: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;

  /** Verify a webhook payload and return the parsed event. */
  verifyWebhook(payload: string, signature: string): PaymentResult | SubscriptionEvent | null;

  /** Cancel a subscription (best effort). */
  cancelSubscription(providerRef: string): Promise<boolean>;
}

/** Paymob implementation. */
export class PaymobProvider implements PaymentsProvider {
  private apiKey: string;
  private hmacSecret: string;
  private baseUrl = "https://accept.paymob.com/api";
  private integrationId: string; // Paymob integration ID (card/wallet)

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY ?? "";
    this.hmacSecret = process.env.PAYMOB_HMAC_SECRET ?? "";
    this.integrationId = process.env.PAYMOB_INTEGRATION_ID ?? "";
    if (!this.apiKey || !this.hmacSecret || !this.integrationId) {
      logEvent("warn", "payments.provider.misconfigured", { provider: "paymob" });
    }
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Paymob ${res.status}: ${txt}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  async createCheckout(args: {
    userId: string;
    email: string;
    planId: string;
    amountEGP: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    // 1) Auth token
    const auth = await this.post("/auth/tokens", { api_key: this.apiKey });
    const token = String(auth.token);

    // 2) Create order
    const order = await this.post("/ecommerce/orders", {
      auth_token: token,
      delivery_needed: "false",
      amount_cents: args.amountEGP * 100,
      currency: "EGP",
      items: [],
      merchant_order_id: `thanawico_${args.userId}_${args.planId}_${Date.now()}`,
    });

    // 3) Payment key
    const paymentKey = await this.post("/acceptance/payment_keys", {
      auth_token: token,
      amount_cents: args.amountEGP * 100,
      expiration: 3600,
      order_id: String(order.id),
      billing_data: {
        email: args.email,
        first_name: "Student",
        last_name: "Thanawico",
        phone_number: "+201000000000",
        apartment: "NA",
        floor: "NA",
        street: "NA",
        building: "NA",
        city: "Cairo",
        country: "EG",
        state: "Cairo",
        postal_code: "11511",
        shipping_method: "PKG",
      },
      currency: "EGP",
      integration_id: this.integrationId,
      lock_order_when_paid: "true",
    });

    const redirectUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.integrationId}?payment_token=${String(paymentKey.token)}`;

    return {
      sessionId: String(paymentKey.token),
      redirectUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  verifyWebhook(payload: string, signature: string): PaymentResult | SubscriptionEvent | null {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }

    if (!this.verifySignature(data, signature)) return null;

    if (data.type === "TRANSACTION") {
      const obj = (data.obj ?? {}) as Record<string, unknown>;
      const order = (obj.order ?? {}) as Record<string, unknown>;
      const { studentId, planId } = this.parseMerchantOrder(order.merchant_order_id);
      return {
        success: obj.success === true,
        providerRef: String(obj.id ?? ""),
        amountEGP: Number(obj.amount_cents ?? 0) / 100,
        currency: String(obj.currency ?? "EGP"),
        paidAt: new Date(Number(obj.created_at ?? Date.now())),
        raw: data,
        studentId,
        planId,
      };
    }
    return null;
  }

  private verifySignature(data: Record<string, unknown>, signature: string): boolean {
    if (!signature || !this.hmacSecret) return false;
    const expected = this.computeHmac(data);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private computeHmac(data: Record<string, unknown>): string {
    const hmac = createHmac("sha512", this.hmacSecret);
    if (data.type === "TRANSACTION") {
      const obj = (data.obj ?? {}) as Record<string, unknown>;
      const order = (obj.order ?? {}) as Record<string, unknown>;
      const source = (obj.source_data ?? {}) as Record<string, unknown>;
      const fields = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        order.id,
        obj.owner,
        obj.pending,
        source.pan,
        source.sub_type,
        source.type,
        obj.success,
      ];
      hmac.update(fields.map((f) => this.stringifyField(f)).join(""));
    } else {
      hmac.update(JSON.stringify(data));
    }
    return hmac.digest("hex");
  }

  private stringifyField(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  private parseMerchantOrder(merchantOrderId: unknown): { studentId?: string; planId?: string } {
    if (typeof merchantOrderId !== "string") return {};
    const parts = merchantOrderId.split("_");
    if (parts[0] === "thanawico" && parts.length >= 4) {
      return { studentId: parts[1], planId: parts[2] };
    }
    return {};
  }

  async cancelSubscription(providerRef: string): Promise<boolean> {
    // Paymob doesn't have a direct subscription cancel; we handle via our DB grace/downgrade
    logEvent("info", "payments.cancel_requested", { provider: "paymob", providerRef });
    return true;
  }
}

/** Factory — single point to swap. */
let _paymentsProvider: PaymentsProvider | null = null;
export function getPaymentsProvider(): PaymentsProvider {
  if (!_paymentsProvider) _paymentsProvider = new PaymobProvider();
  return _paymentsProvider;
}

export function setPaymentsProvider(p: PaymentsProvider) {
  _paymentsProvider = p;
}