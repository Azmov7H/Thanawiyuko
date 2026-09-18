import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { getEntitlements } from "@/server/billing/entitlements";
import { generateExamResultPdf } from "@/server/modules/exports";
import { PdfDisabledError } from "@/server/modules/pdf";
import { contentDisposition } from "@/server/modules/pdf";
import { logServerError } from "@/server/logger";

export const dynamic = "force-dynamic";

/** GET /api/export/exam/[attemptId] — Plus-gated exam-result PDF for the owner. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId } = s;
  if (!(await getEntitlements(userId)).isPlus) {
    return NextResponse.json(
      { code: "PLUS_REQUIRED", messageAr: "تصدير التقارير PDF متاح لمشتركي بلس." },
      { status: 403 },
    );
  }

  try {
    const result = await generateExamResultPdf(userId, attemptId);
    if (!result.ok) {
      return NextResponse.json(
        {
          code: result.code,
          messageAr:
            result.code === "NOT_SUBMITTED"
              ? "هذا الامتحان لم يُسلَّم بعد. سلّم أولًا ثم صدّر النتيجة."
              : "الامتحان غير موجود.",
        },
        { status: result.code === "NOT_FOUND" ? 404 : 409 },
      );
    }
    return new Response(new Uint8Array(result.pdf.buffer), {
      headers: {
        "Content-Type": result.pdf.contentType,
        "Content-Disposition": contentDisposition(result.pdf.filename),
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
    await logServerError("export.exam.failed", e, {
      route: "/api/export/exam/[attemptId]",
      attemptId,
    });
    return NextResponse.json({ code: "INTERNAL", messageAr: "تعذر إنشاء التقرير." }, { status: 500 });
  }
}