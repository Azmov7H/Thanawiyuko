import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { AdminForbidden, requireAdminUser } from "@/server/modules/admin/guard";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";

const listQuery = z.object({
  entity: z.string().max(40).optional(),
  action: z.string().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

function err(code: string, messageAr: string, status: number) {
  return NextResponse.json({ code, messageAr }, { status });
}

/** GET /api/admin/audit — read-only audit trail (README §5.1). */
export async function GET(req: Request) {
  try {
    await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminForbidden) return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  const url = new URL(req.url);
  const parsed = listQuery.safeParse({
    entity: url.searchParams.get("entity") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) return err("VALIDATION", "استعلام غير صالح.", 400);

  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }

  const filter: Record<string, unknown> = {};
  if (parsed.data.entity) filter.entity = parsed.data.entity;
  if (parsed.data.action) filter.action = parsed.data.action;

  const limit = 50;
  const skip = (parsed.data.page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ at: -1 }).skip(skip).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: items.map((a) => ({
      id: String(a._id),
      actorId: String(a.actorId),
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      before: a.before ?? null,
      after: a.after ?? null,
      reason: a.reason ?? null,
      at: a.at,
    })),
    total,
    page: parsed.data.page,
    limit,
  });
}
