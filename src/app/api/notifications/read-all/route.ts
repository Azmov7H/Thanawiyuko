import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { markAllNotificationsRead } from "@/server/modules/notifications/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }

  await dbConnect();
  const marked = await markAllNotificationsRead(userId);
  return NextResponse.json({ ok: true, marked });
}