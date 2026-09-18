import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { AdminForbidden, requireAdminUser } from "@/server/modules/admin/guard";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import { UserModel } from "@/server/modules/auth/user.model";
import { TeacherProfileModel } from "@/server/modules/academic/teacher-profile.model";
import { canAssignRole, canManageUser } from "@/lib/admin";
import type { AdminActorRole, TargetUserRole } from "@/lib/admin";

const listQuery = z.object({
  q: z.string().max(80).optional(),
  role: z.enum(["student", "teacher", "admin", "super"]).optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const patchBody = z
  .object({
    userId: z.string().min(1),
    action: z.enum(["suspend", "activate", "set-role"]),
    role: z.enum(["student", "teacher", "admin"]).optional(),
    reason: z.string().max(300).nullable().optional(),
  })
  .refine((v) => v.action !== "set-role" || Boolean(v.role), { message: "حدد الدور." });

function err(code: string, messageAr: string, status: number) {
  return NextResponse.json({ code, messageAr }, { status });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** GET /api/admin/users — search students/admins (never returns secrets). */
export async function GET(req: Request) {
  let actor: { id: string; role: string };
  try {
    actor = await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminForbidden) return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  const url = new URL(req.url);
  const parsed = listQuery.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) return err("VALIDATION", "استعلام غير صالح.", 400);

  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }

  const filter: Record<string, unknown> = {};
  if (parsed.data.q) {
    const rx = new RegExp(escapeRegex(parsed.data.q.trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (parsed.data.role) filter.role = parsed.data.role;
  if (parsed.data.status) filter.status = parsed.data.status;

  const limit = 50;
  const skip = (parsed.data.page - 1) * limit;
  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .select("name email role status createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return NextResponse.json({
    viewerRole: actor.role,
    items: items.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    })),
    total,
    page: parsed.data.page,
    limit,
  });
}

/** PATCH /api/admin/users — suspend/activate/set-role (audited, role-scoped). */
export async function PATCH(req: Request) {
  let actor: { id: string; role: string };
  try {
    actor = await requireAdminUser();
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

  const target = await UserModel.findById(parsed.data.userId);
  if (!target) return err("NOT_FOUND", "المستخدم غير موجود.", 404);
  if (String(target._id) === actor.id) return err("FORBIDDEN", "لا يمكنك تعديل حسابك.", 403);

  const actorRole = actor.role as AdminActorRole;
  const targetRole = target.role as TargetUserRole;
  const before = { role: target.role, status: target.status };

  let action: string;
  if (parsed.data.action === "set-role") {
    if (!parsed.data.role || !canAssignRole(actorRole, targetRole, parsed.data.role))
      return err("FORBIDDEN", "غير مصرح لك بتغيير هذا الدور.", 403);
    target.role = parsed.data.role;
    action = "user.set-role";
  } else {
    if (!canManageUser(actorRole, targetRole))
      return err("FORBIDDEN", "غير مصرح لك بإدارة هذا المستخدم.", 403);
    target.status = parsed.data.action === "suspend" ? "suspended" : "active";
    action = parsed.data.action === "suspend" ? "user.suspend" : "user.activate";
  }
  await target.save();

  if (parsed.data.action === "set-role" && parsed.data.role === "teacher") {
    const existing = await TeacherProfileModel.exists({ userId: target._id });
    if (!existing) await TeacherProfileModel.create({ userId: target._id });
  }

  await AuditLogModel.create({
    actorId: actor.id,
    action,
    entity: "user",
    entityId: String(target._id),
    before,
    after: { role: target.role, status: target.status },
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({
    item: {
      id: String(target._id),
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
    },
  });
}
