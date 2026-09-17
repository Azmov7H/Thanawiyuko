import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { cancelAccountDeletion } from "@/server/modules/account/service";

/** POST /api/account/delete-cancel — revert a pending deletion. */
export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }
  const reverted = await cancelAccountDeletion(userId);
  return NextResponse.json({ ok: true, reverted });
}
