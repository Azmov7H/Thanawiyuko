import { auth } from "@/server/auth/config";
import { canTransition, nextVersion } from "@/lib/content";

export { canTransition, nextVersion };

export class AdminForbidden extends Error {
  code = "FORBIDDEN" as const;
}

/** Throws AdminForbidden unless the session user is admin/super. */
export async function requireAdminUser(): Promise<{ id: string; role: string }> {
  let id: string | undefined;
  let role: string | undefined;
  try {
    const session = await auth();
    const u = session?.user as { id?: string; role?: string } | undefined;
    id = u?.id;
    role = u?.role;
  } catch {
    throw new AdminForbidden("سجّل الدخول أولًا.");
  }
  if (!id || (role !== "admin" && role !== "super")) {
    throw new AdminForbidden("غير مصرح لك بهذا الإجراء.");
  }
  return { id, role };
}

/** Throws AdminForbidden unless the session user is super (§5.1 super-only actions). */
export async function requireSuperUser(): Promise<{ id: string; role: string }> {
  const admin = await requireAdminUser();
  if (admin.role !== "super") throw new AdminForbidden("هذا الإجراء متاح للمشرف الأعلى فقط.");
  return admin;
}
