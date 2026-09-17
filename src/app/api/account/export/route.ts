import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { exportAccount } from "@/server/modules/account/service";

/** GET /api/account/export — machine-readable JSON export of the session user's data. */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  }

  const data = await exportAccount(userId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="thanawico-export-${userId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
