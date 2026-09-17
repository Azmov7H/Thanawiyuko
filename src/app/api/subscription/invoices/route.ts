import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { getInvoices } from "@/server/billing/service";

/** GET /api/subscription/invoices — invoice history. */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  const invoices = await getInvoices(userId);
  return NextResponse.json({ invoices });
}