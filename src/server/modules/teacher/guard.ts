import { auth } from "@/server/auth/config";

export class TeacherForbidden extends Error {
  code = "FORBIDDEN" as const;
}

/** Throws TeacherForbidden unless the session user holds the internal teacher role. */
export async function requireTeacherUser(): Promise<{ id: string }> {
  let session: unknown;
  try {
    session = await auth();
  } catch {
    throw new TeacherForbidden("سجّل الدخول أولًا.");
  }
  const u = session as { user?: { id?: string; role?: string } } | null;
  if (!u?.user?.id || u.user.role !== "teacher") {
    throw new TeacherForbidden("غير مصرح لك بهذا الإجراء.");
  }
  return { id: u.user.id };
}