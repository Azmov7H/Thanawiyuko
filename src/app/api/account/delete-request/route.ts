import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import { verifyPassword } from "@/lib/password";
import { deleteAccountSchema } from "@/lib/validators";
import { checkRateLimit } from "@/server/ratelimit";
import { deletionPurgeAt, requestAccountDeletion } from "@/server/modules/account/service";

const WINDOW_MS = 60 * 60 * 1000;

/** POST /api/account/delete-request — start the 30-day deletion grace period. */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }

  const rl = checkRateLimit(`delete-request:${userId}`, 5, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { code: "RATE_LIMITED", messageAr: "محاولات كثيرة. حاول لاحقًا." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "بيانات غير صالحة." },
      { status: 400 },
    );
  }
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "أدخل كلمة المرور لتأكيد الحذف." },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." },
      { status: 503 },
    );
  }

  const user = await UserModel.findById(userId).select("+passwordHash").lean();
  if (!user) {
    return NextResponse.json(
      { code: "NOT_FOUND", messageAr: "الحساب غير موجود." },
      { status: 404 },
    );
  }

  if (user.status === "deletion_pending" && user.deletionRequestedAt) {
    return NextResponse.json({
      ok: true,
      deletionRequestedAt: user.deletionRequestedAt,
      purgeAt: deletionPurgeAt(user.deletionRequestedAt),
    });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { code: "INVALID_PASSWORD", messageAr: "كلمة المرور غير صحيحة." },
      { status: 403 },
    );
  }

  const { deletionRequestedAt, purgeAt } = await requestAccountDeletion(userId);
  return NextResponse.json({ ok: true, deletionRequestedAt, purgeAt });
}
