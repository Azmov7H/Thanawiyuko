import { dbConnect } from "@/server/db/client";
import { getPaymentsProvider } from "@/server/payments/provider";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { SubscriptionModel } from "@/server/modules/billing/subscription.model";
import { PaymentModel } from "@/server/modules/billing/payment.model";
import { evaluateAchievements } from "@/server/modules/gamification/service";
import { cairoDayStartUTC } from "@/lib/cairo";
import { PLANS, PlanId, GRACE_DAYS } from "@/server/payments/config";

/** Check if user has active Plus entitlement (server authority). */
export async function hasPlusAccess(userId: string): Promise<boolean> {
  await dbConnect();
  const sub = await SubscriptionModel.findOne({ studentId: userId, status: "active" }).lean();
  if (!sub) return false;
  const now = new Date();
  const graceEnd = new Date(sub.currentPeriodEnd);
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);
  return now < graceEnd;
}

/** Get current subscription for user. */
export async function getSubscription(userId: string) {
  await dbConnect();
  return SubscriptionModel.findOne({ studentId: userId }).lean();
}

/** Initiate checkout for a plan. */
export async function startCheckout(args: {
  userId: string;
  email: string;
  planId: PlanId;
  successUrl: string;
  cancelUrl: string;
}) {
  await dbConnect();
  const plan = PLANS[args.planId];
  if (!plan) throw new Error("خطة غير صالحة");

  const provider = getPaymentsProvider();
  const session = await provider.createCheckout({
    userId: args.userId,
    email: args.email,
    planId: args.planId,
    amountEGP: plan.priceEGP,
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
  });

  // Store pending subscription (awaiting webhook)
  await import("@/server/modules/billing/subscription.model").then((m) =>
    m.SubscriptionModel.findOneAndUpdate(
      { studentId: args.userId },
      {
        $setOnInsert: { studentId: args.userId },
        $set: {
          tier: "plus",
          plan: args.planId,
          status: "pending",
          provider: "paymob",
          providerRef: session.sessionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000),
        },
      },
      { upsert: true, new: true },
    ),
  );

  return session.redirectUrl;
}

/** Process successful payment webhook. */
export async function handlePaymentSuccess(data: {
  providerRef: string;
  amountEGP: number;
  periodStart: Date;
  periodEnd: Date;
  userId: string; // we'll infer from pending subscription
}) {
  await dbConnect();
  const provider = getPaymentsProvider();

  // Find pending subscription by providerRef
  const sub = await import("@/server/modules/billing/subscription.model").then((m) =>
    m.SubscriptionModel.findOne({ providerRef: data.providerRef, status: "pending" }).lean(),
  );
  if (!sub) {
    // Try to find by userId + recent pending
    const fallback = await import("@/server/modules/billing/subscription.model").then((m) =>
      m.SubscriptionModel.findOne({ studentId: data.userId, status: "pending", provider: "paymob" }).sort({ createdAt: -1 }).lean(),
    );
    if (!fallback) throw new Error("No pending subscription for this payment");
    return processActivaiton(fallback, data);
  }
  return processActivaiton(sub, data);
}

async function processActivaiton(sub: any, data: { providerRef: string; amountEGP: number; periodStart: Date; periodEnd: Date }) {
  await import("@/server/modules/billing/subscription.model").then((m) =>
    m.SubscriptionModel.findByIdAndUpdate(sub._id, {
      $set: {
        status: "active",
        providerRef: data.providerRef,
        currentPeriodStart: data.periodStart,
        currentPeriodEnd: data.periodEnd,
      },
    }),
  );
  await import("@/server/modules/billing/payment.model").then((m) =>
    m.PaymentModel.create({
      subscriptionId: sub._id,
      amountEGP: data.amountEGP,
      currency: "EGP",
      provider: "paymob",
      providerRef: data.providerRef,
      status: "succeeded",
    }),
  );
  // Unlock achievements for new Plus
  const { evaluateAchievements } = await import("@/server/modules/gamification/service");
  await evaluateAchievements(sub.studentId.toString());
}

/** Handle failed payment / renewal. */
export async function handlePaymentFailed(providerRef: string, userId: string) {
  await dbConnect();
  const { SubscriptionModel } = await import("@/server/modules/billing/subscription.model");
  const sub = await SubscriptionModel.findOne({ providerRef, studentId: userId }).lean();
  await SubscriptionModel.findOneAndUpdate({ providerRef, studentId: userId }, { $set: { status: "past_due" } });
  const { PaymentModel } = await import("@/server/modules/billing/payment.model");
  await PaymentModel.create({
    subscriptionId: sub?._id,
    studentId: userId,
    amountEGP: 0,
    currency: "EGP",
    provider: "paymob",
    providerRef,
    status: "failed",
  });
}

/** Grace period check — called daily by cron. */
export async function reconcileGracePeriod(): Promise<void> {
  await dbConnect();
  const now = new Date();
  const subs = await import("@/server/modules/billing/subscription.model").then((m) =>
    m.SubscriptionModel.find({
      status: { $in: ["active", "past_due"] },
      currentPeriodEnd: { $lt: now },
    }).lean(),
  );
  for (const sub of subs) {
    const graceEnd = new Date(sub.currentPeriodEnd);
    graceEnd.setDate(graceEnd.getDate() + 3); // GRACE_DAYS
    if (now > graceEnd) {
      await import("@/server/modules/billing/subscription.model").then((m) =>
        m.SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "cancelled", tier: "free" } }),
      );
      // Downgrade entitlement — student loses Plus features
    } else if (sub.status === "active") {
      // Entered grace period
      await import("@/server/modules/billing/subscription.model").then((m) =>
        m.SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "grace" } }),
      );
    }
  }
}

/** Manual cancel (user or admin). */
export async function cancelSubscription(userId: string, immediate = false) {
  await dbConnect();
  const sub = await import("@/server/modules/billing/subscription.model").then((m) =>
    m.SubscriptionModel.findOne({ studentId: userId, status: { $in: ["active", "grace", "past_due"] } }).lean(),
  );
  if (!sub) throw new Error("لا يوجد اشتراك نشط");

  const provider = getPaymentsProvider();
  await provider.cancelSubscription(sub.providerRef);

  if (immediate) {
    await import("@/server/modules/billing/subscription.model").then((m) =>
      m.SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "cancelled", tier: "free" } }),
    );
  } else {
    // Let it expire at period end
    await import("@/server/modules/billing/subscription.model").then((m) =>
      m.SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { cancelAtPeriodEnd: true } }),
    );
  }
}

/** Manual refund (admin only). */
export async function refundPayment(paymentId: string, adminId: string, reason: string) {
  await dbConnect();
  const payment = await import("@/server/modules/billing/payment.model").then((m) =>
    m.PaymentModel.findById(paymentId).lean(),
  );
  if (!payment || payment.status !== "succeeded") throw new Error("لا يمكن استرداد هذه الدفعة");

  const provider = getPaymentsProvider();
  await provider.cancelSubscription(payment.providerRef); // best effort

  await import("@/server/modules/billing/payment.model").then((m) =>
    m.PaymentModel.findByIdAndUpdate(paymentId, { $set: { status: "refunded", refundedAt: new Date(), refundReason: reason, refundedBy: adminId } }),
  );
  // Downgrade if this was the only active payment
  const sub = await import("@/server/modules/billing/subscription.model").then((m) =>
    m.SubscriptionModel.findById(payment.subscriptionId).lean(),
  );
  if (sub) {
    const other = await import("@/server/modules/billing/payment.model").then((m) =>
      m.PaymentModel.find({ subscriptionId: sub._id, status: "succeeded", _id: { $ne: paymentId } }).lean(),
    );
    if (other.length === 0) {
      await import("@/server/modules/billing/subscription.model").then((m) =>
        m.SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "cancelled", tier: "free" } }),
      );
    }
  }
  await import("@/server/modules/admin/audit-log.model").then((m) =>
    m.AuditLogModel.create({ actorId: adminId, action: "payment.refund", entity: "payment", entityId: paymentId, reason }),
  );
}

/** Get invoice list for user. */
export async function getInvoices(userId: string) {
  await dbConnect();
  const { SubscriptionModel } = await import("@/server/modules/billing/subscription.model");
  const subIds = await SubscriptionModel.find({ studentId: userId }).distinct("_id");
  const { PaymentModel } = await import("@/server/modules/billing/payment.model");
  const payments = await PaymentModel.find({ subscriptionId: { $in: subIds } })
    .sort({ createdAt: -1 })
    .lean();
  return payments.map((p) => ({
    id: String(p._id),
    amountEGP: p.amountEGP,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt,
    providerRef: p.providerRef,
  }));
}