import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/server/modules/notifications/service";
import { notificationPreferencesSchema } from "@/lib/validators";
import { rateLimit } from "@/server/ratelimit";
import { hashUser, logServerError } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }

  await dbConnect();
  const prefs = await getNotificationPreferences(userId);
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }

  const rl = await rateLimit(`notif-prefs:${userId}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { code: "RATE_LIMITED", messageAr: "طلبات كثيرة. حاول بعد قليل." },
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

  const parsed = notificationPreferencesSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      {
        code: "VALIDATION",
        messageAr: "أرسل إعدادًا واحدًا على الأقل (email أو push).",
      },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
    const prefs = await updateNotificationPreferences(userId, parsed.data);
    return NextResponse.json(prefs);
  } catch (e) {
    await logServerError("notifications.prefs.update.failed", e, { user: hashUser(userId) });
    return NextResponse.json(
      { code: "INTERNAL", messageAr: "تعذر حفظ الإعدادات. حاول لاحقًا." },
      { status: 500 },
    );
  }
}