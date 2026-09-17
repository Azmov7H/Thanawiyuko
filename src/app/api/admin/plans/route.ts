import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { AdminForbidden, requireAdminUser } from "@/server/modules/admin/guard";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import { PlanModel } from "@/server/modules/billing/plan.model";
import { listAllPlans } from "@/server/billing/plans";

const patchBody = z.object({
  key: z.string().min(1).max(40),
  reason: z.string().max(300).nullable().optional(),
  fields: z
    .object({
      nameAr: z.string().min(1).max(80).optional(),
      nameEn: z.string().min(1).max(80).optional(),
      priceEGP: z.number().int().min(0).max(1_000_000).optional(),
      durationDays: z.number().int().min(1).max(3650).optional(),
      popular: z.boolean().optional(),
      features: z.array(z.string().min(1).max(200)).max(30).optional(),
      order: z.number().int().min(0).max(100).optional(),
      active: z.boolean().optional(),
    })
    .refine((f) => Object.keys(f).length > 0, { message: "لا توجد تغييرات." }),
});

function err(code: string, messageAr: string, status: number) {
  return NextResponse.json({ code, messageAr }, { status });
}

/** GET /api/admin/plans — full catalog (includes inactive). */
export async function GET() {
  try {
    await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminForbidden) return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  try {
    const items = await listAllPlans();
    return NextResponse.json({ items });
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }
}

/** PATCH /api/admin/plans — edit price/duration/features/ordering/status (audited). */
export async function PATCH(req: Request) {
  let admin: { id: string };
  try {
    admin = await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminForbidden) return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION", "بيانات غير صالحة.", 400);
  }
  const parsed = patchBody.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "راجع البيانات المدخلة.", 400);

  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }
  const plan = await PlanModel.findOne({ key: parsed.data.key });
  if (!plan) return err("NOT_FOUND", "الخطة غير موجودة.", 404);

  const before = plan.toObject();
  plan.set(parsed.data.fields);
  await plan.save();

  await AuditLogModel.create({
    actorId: admin.id,
    action: "plan.update",
    entity: "plan",
    entityId: parsed.data.key,
    before: {
      priceEGP: before.priceEGP,
      durationDays: before.durationDays,
      features: before.features,
      popular: before.popular,
      active: before.active,
      order: before.order,
    },
    after: { ...parsed.data.fields },
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({ item: plan.toObject() });
}
