import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { getPaymentsProvider } from "@/server/payments/provider";
import { SubscriptionModel } from "@/server/modules/billing/subscription.model";
import { PaymentModel } from "@/server/modules/billing/payment.model";
import { evaluateAchievements } from "@/server/modules/gamification/service";
import { GRACE_DAYS } from "@/server/payments/config";
import { findPlan } from "@/server/billing/plans";
import { hashUser, logServerError } from "@/server/logger";

async function notifySubscriptionEvent(
  userId: string,
  input: { titleAr: string; bodyAr: string; link?: string },
): Promise<void> {
  try {
    const { createNotification } = await import("@/server/modules/notifications/service");
    const { UserModel } = await import("@/server/modules/auth/user.model");
    const user = await UserModel.findById(userId).select("email").lean();
    await createNotification({
      userId,
      type: "subscription_event",
      titleAr: input.titleAr,
      bodyAr: input.bodyAr,
      link: input.link ?? "/subscription/manage",
      emailTo: user?.email ?? null,
    });
  } catch (e) {
    await logServerError("notifications.subscription_event.failed", e, {
      user: hashUser(String(userId)),
    });
  }
}

type PlainSub = {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  plan: string | null;
};

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function graceEndOf(sub: { currentPeriodEnd: Date }): Date {
  return addDays(new Date(sub.currentPeriodEnd), GRACE_DAYS);
}

function isId(value: string): boolean {
  return mongoose.isValidObjectId(value);
}

/** Check if user has active Plus entitlement (server authority). */
export async function hasPlusAccess(userId: string): Promise<boolean> {
  await dbConnect();
  const sub = await SubscriptionModel.findOne({
    studentId: userId,
    status: { $in: ["active", "grace", "past_due"] },
  }).lean();
  if (!sub) return false;
  return new Date() < graceEndOf(sub);
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
  planId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  await dbConnect();
  const plan = await findPlan(args.planId);
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

  const existing = await SubscriptionModel.findOne({ studentId: args.userId }).lean();
  const keepStatus = existing && existing.status !== "pending" && existing.status !== "cancelled";
  await SubscriptionModel.findOneAndUpdate(
    { studentId: args.userId },
    {
      $setOnInsert: { studentId: args.userId },
      $set: {
        tier: "plus",
        plan: args.planId,
        status: keepStatus && existing ? existing.status : "pending",
        provider: "paymob",
        providerRef: session.sessionId,
        currentPeriodStart: existing?.currentPeriodStart ?? new Date(),
        currentPeriodEnd: keepStatus && existing ? existing.currentPeriodEnd : addDays(new Date(), plan.durationDays),
      },
    },
    { upsert: true, new: true },
  );

  return session.redirectUrl;
}

async function activateSubscription(sub: PlainSub, data: { providerRef: string; amountEGP: number; periodStart: Date; planId?: string | null }) {
  const planId = data.planId ?? sub.plan ?? "monthly";
  const plan = await findPlan(planId);
  const days = plan?.durationDays ?? 30;
  const periodStart = data.periodStart;
  const periodEnd = addDays(periodStart, days);

  await SubscriptionModel.findByIdAndUpdate(sub._id, {
    $set: {
      status: "active",
      tier: "plus",
      plan: planId,
      provider: "paymob",
      providerRef: data.providerRef,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  try {
    await PaymentModel.create({
      subscriptionId: sub._id,
      studentId: sub.studentId,
      amountEGP: data.amountEGP,
      currency: "EGP",
      provider: "paymob",
      providerRef: data.providerRef,
      status: "succeeded",
    });
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000)) throw error;
  }

  await evaluateAchievements(sub.studentId.toString());
  await notifySubscriptionEvent(sub.studentId.toString(), {
    titleAr: "اشتراك بلس مفعّل",
    bodyAr: "تم تفعيل اشتراكك في خطة بلس. كل الامتحانات والمحتوى الحصري متاح لك الآن.",
  });
}

/** Process successful payment webhook (idempotent by providerRef). */
export async function handlePaymentSuccess(data: {
  providerRef: string;
  amountEGP: number;
  periodStart: Date;
  userId?: string;
  planId?: string | null;
}) {
  await dbConnect();

  const existing = await PaymentModel.findOne({ providerRef: data.providerRef }).select("_id").lean();
  if (existing) return { ok: true, idempotent: true };

  let sub: PlainSub | null = null;
  if (data.userId && isId(data.userId)) {
    sub = await SubscriptionModel.findOne({ studentId: data.userId, provider: "paymob" })
      .sort({ createdAt: -1 })
      .lean();
  }
  if (!sub) sub = await SubscriptionModel.findOne({ providerRef: data.providerRef }).lean();
  if (!sub) throw new Error("No pending subscription for this payment");

  await activateSubscription(sub, data);
  return { ok: true };
}

/** Handle failed payment / renewal. */
export async function handlePaymentFailed(providerRef: string, userId?: string) {
  await dbConnect();

  const existing = await PaymentModel.findOne({ providerRef }).select("_id").lean();
  if (existing) return;

  let sub: PlainSub | null = null;
  if (userId && isId(userId)) {
    sub = await SubscriptionModel.findOne({ studentId: userId, provider: "paymob" })
      .sort({ createdAt: -1 })
      .lean();
  }
  if (!sub) sub = await SubscriptionModel.findOne({ providerRef }).lean();
  if (!sub) throw new Error("No subscription for failed payment");

  await SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "past_due" } });

  await notifySubscriptionEvent(sub.studentId.toString(), {
    titleAr: "تعذّر تجديد الاشتراك",
    bodyAr: "لم نتمكن من تجديد اشتراك بلس. عندك فترة سماح قبل التوقف — فعّل طريقة الدفع من صفحة الاشتراك.",
  });

  try {
    await PaymentModel.create({
      subscriptionId: sub._id,
      studentId: sub.studentId,
      amountEGP: 0,
      currency: "EGP",
      provider: "paymob",
      providerRef,
      status: "failed",
    });
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000)) throw error;
  }
}

/** Grace period check — called daily by cron. */
export async function reconcileGracePeriod(): Promise<void> {
  await dbConnect();
  const now = new Date();
  const subs = await SubscriptionModel.find({
    status: { $in: ["active", "past_due"] },
    currentPeriodEnd: { $lt: now },
  }).lean();
  for (const sub of subs) {
    if (now > graceEndOf(sub)) {
      await SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "cancelled", tier: "free" } });
      await notifySubscriptionEvent(sub.studentId.toString(), {
        titleAr: "انتهى اشتراك بلس",
        bodyAr: "انتهت فترة الاشتراك وفترة السماح. ما زال بإمكانك استخدام ثانويكو مجانًا والاشتراك متى شئت.",
      });
    } else if (sub.status === "active") {
      await SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "grace" } });
      await notifySubscriptionEvent(sub.studentId.toString(), {
        titleAr: "فترة السماح بدأت",
        bodyAr: "انتهت مدة اشتراكك ودخلت فترة السماح. جدّد اشتراكك خلال الأيام القادمة للاستمرار في بلس.",
      });
    }
  }
}

/** Manual cancel (user or admin). */
export async function cancelSubscription(userId: string, immediate = false) {
  await dbConnect();
  const sub = await SubscriptionModel.findOne({
    studentId: userId,
    status: { $in: ["active", "grace", "past_due"] },
  }).lean();
  if (!sub) throw new Error("لا يوجد اشتراك نشط");

  const provider = getPaymentsProvider();
  await provider.cancelSubscription(sub.providerRef ?? "");

  if (immediate) {
    await SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "cancelled", tier: "free" } });
  } else {
    await SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { cancelAtPeriodEnd: true } });
  }
  await notifySubscriptionEvent(userId, {
    titleAr: "تم إلغاء الاشتراك",
    bodyAr: immediate
      ? "أُلغي اشتراك بلس الخاص بك. يمكنك الاشتراك مجددًا في أي وقت."
      : "سيُلغى اشتراك بلس في نهاية الفترة الحالية، ولن يُخصم منك بعدها.",
  });
}

/** Manual refund (admin only). */
export async function refundPayment(paymentId: string, adminId: string, reason: string) {
  await dbConnect();
  const payment = await PaymentModel.findById(paymentId).lean();
  if (!payment || payment.status !== "succeeded") throw new Error("لا يمكن استرداد هذه الدفعة");

  const provider = getPaymentsProvider();
  await provider.cancelSubscription(payment.providerRef ?? "");

  await PaymentModel.findByIdAndUpdate(paymentId, {
    $set: { status: "refunded", refundedAt: new Date(), refundReason: reason, refundedBy: adminId },
  });

  const sub = await SubscriptionModel.findById(payment.subscriptionId).lean();
  if (sub) {
    const other = await PaymentModel.find({ subscriptionId: sub._id, status: "succeeded", _id: { $ne: payment._id } }).lean();
    if (other.length === 0) {
      await SubscriptionModel.findByIdAndUpdate(sub._id, { $set: { status: "cancelled", tier: "free" } });
    }
  }
  const { AuditLogModel } = await import("@/server/modules/admin/audit-log.model");
  await AuditLogModel.create({ actorId: adminId, action: "payment.refund", entity: "payment", entityId: paymentId, reason });

  if (sub) await notifySubscriptionEvent(sub.studentId.toString(), {
    titleAr: "تم استرداد مبلغ الدفعة",
    bodyAr: "تم تحويل المبلغ المسترد إلى المحفظة/البنك الذي سددت منه. قد يستغرق ظهوره من يوم إلى 5 أيام عمل.",
  });
}

/** Get invoice list for user. */
export async function getInvoices(userId: string) {
  await dbConnect();
  const subIds = await SubscriptionModel.find({ studentId: userId }).distinct("_id");
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