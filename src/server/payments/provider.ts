import { createHmac } from "node:crypto";

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
      console.warn("[Payments] Paymob credentials not fully set — provider will fail on calls");
    }
  }

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Paymob ${res.status}: ${txt}`);
    }
    return res.json();
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
    const token = auth.token;

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
      order_id: order.id,
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

    const redirectUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.integrationId}?payment_token=${paymentKey.token}`;

    return {
      sessionId: paymentKey.token,
      redirectUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  verifyWebhook(payload: string, signature: string): PaymentResult | SubscriptionEvent | null {
    // Paymob sends HMAC-SHA512 of the JSON payload
    const expected = createHmac("sha512", this.hmacSecret).update(payload).digest("hex");
    if (expected !== signature) return null;

    const data = JSON.parse(payload);
    // Success transaction callback
    if (data.type === "TRANSACTION" && data.obj?.success === true) {
      const obj = data.obj;
      return {
        success: true,
        providerRef: String(obj.id),
        amountEGP: obj.amount_cents / 100,
        currency: obj.currency,
        paidAt: new Date(obj.created_at),
        raw: data,
      };
    }
    return null;
  }

  async cancelSubscription(providerRef: string): Promise<boolean> {
    // Paymob doesn't have a direct subscription cancel; we handle via our DB grace/downgrade
    console.log("[Payments] Cancel requested for", providerRef, "— handled via entitlement downgrade");
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