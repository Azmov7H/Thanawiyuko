import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { getEntitlements } from "@/server/billing/entitlements";
import { generateProgressReportPdf } from "@/server/modules/exports";
import { PdfDisabledError } from "@/server/modules/pdf";
import { contentDisposition } from "@/server/modules/pdf";
import { logServerError } from "@/server/logger";

export const dynamic = "force-dynamic";

/** GET /api/export/progress — Plus-gated progress report PDF (T-K2). */
export async function GET() {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;
  if (!(await getEntitlements(userId)).isPlus) {
    return NextResponse.json(
      { code: "PLUS_REQUIRED", messageAr: "تصدير التقارير PDF متاح لمشتركي بلس." },
      { status: 403 },
    );
  }

  try {
    const pdf = await generateProgressReportPdf(userId, profile);
    return new Response(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": pdf.contentType,
        "Content-Disposition": contentDisposition(pdf.filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof PdfDisabledError) {
      return NextResponse.json(
        { code: "PDF_DISABLED", messageAr: "تصدير PDF غير مفعّل حاليًا." },
        { status: 503 },
      );
    }
    await logServerError("export.progress.failed", e, { route: "/api/export/progress" });
    return NextResponse.json({ code: "INTERNAL", messageAr: "تعذر إنشاء التقرير." }, { status: 500 });
  }
}