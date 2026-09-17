import { dbConnect } from "@/server/db/client";
import { PlanModel } from "@/server/modules/billing/plan.model";
import { PLANS } from "@/server/payments/config";
import { toPlanView } from "@/lib/plans";
import type { PlanView } from "@/lib/plans";

const SEED_KEYS = Object.keys(PLANS) as Array<keyof typeof PLANS>;

/** Idempotently seed the catalog from defaults; admin edits are never overwritten. */
export async function ensurePlansSeeded(): Promise<void> {
  await dbConnect();
  await Promise.all(
    SEED_KEYS.map((key, order) => {
      const p = PLANS[key];
      return PlanModel.updateOne(
        { key },
        {
          $setOnInsert: {
            key,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            priceEGP: p.priceEGP,
            durationDays: p.durationDays,
            popular: p.popular ?? false,
            features: p.features,
            order,
            active: true,
          },
        },
        { upsert: true },
      );
    }),
  );
}

/** Active plans for the pricing page, ordered. */
export async function listActivePlans(): Promise<PlanView[]> {
  await ensurePlansSeeded();
  const rows = await PlanModel.find({ active: true }).sort({ order: 1, priceEGP: 1 }).lean();
  return rows.map((r) => toPlanView(r));
}

/** Resolve one active plan by key (null when missing or deactivated). */
export async function findPlan(key: string): Promise<PlanView | null> {
  await ensurePlansSeeded();
  const row = await PlanModel.findOne({ key, active: true }).lean();
  return row ? toPlanView(row) : null;
}

/** Full catalog for admins (includes inactive). */
export async function listAllPlans(): Promise<PlanView[]> {
  await ensurePlansSeeded();
  const rows = await PlanModel.find({}).sort({ order: 1, priceEGP: 1 }).lean();
  return rows.map((r) => toPlanView(r));
}
