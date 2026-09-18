import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { markNotificationRead } from "@/server/modules/notifications/service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }

  await dbConnect();
  const { id } = await params;
  const updated = await markNotificationRead(userId, id);
  if (!updated) {
    return NextResponse.json(
      { code: "NOT_FOUND", messageAr: "الإشعار غير موجود." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}