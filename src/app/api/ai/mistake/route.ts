import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { hasPlusAccess } from "@/server/billing/service";
import { runMistakeExplainer } from "@/server/ai/service";

/** POST /api/ai/mistake — instant mistake explanation (non-streaming). */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  let body: {
    questionStem: string;
    options: Array<{ key: string; text: string }>;
    chosenKey: string;
    chosenText: string;
    correctKey: string;
    correctText: string;
    storedExplanation: string;
    topicId: string;
    conceptTag?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  if (!body.questionStem?.trim() || !body.options?.length)
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات السؤال ناقصة." }, { status: 400 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  const isPlus = await hasPlusAccess(userId);

  try {
    const result = await runMistakeExplainer({ userId, isPlus, ...body });
    return NextResponse.json({ explanation: result.content, quotaRemaining: result.quota, cached: result.cached });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ في الشرح";
    if (msg === "QUOTA_EXCEEDED") {
      return NextResponse.json({ code: "QUOTA_EXCEEDED", messageAr: "وصلت للحد اليومي. ارجع بكرة أو فعّل Plus." }, { status: 429 });
    }
    return NextResponse.json({ code: "AI_ERROR", messageAr: msg }, { status: 500 });
  }
}