import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { runTutorStream } from "@/server/ai/service";
import { AIConversationModel } from "@/server/modules/ai/conversation.model";

/** POST /api/ai/tutor — streaming tutor chat (SSE). */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isPlus = (session?.user as { role?: string } | undefined)?.role === "student" && true; // plus check later via subscription
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  let body: { question: string; topicId?: string; examActive?: boolean; hintLevel?: number; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  if (!body.question?.trim())
    return NextResponse.json({ code: "VALIDATION", messageAr: "السؤال مطلوب." }, { status: 400 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  // Create or get conversation
  let conv = body.conversationId
    ? await AIConversationModel.findOne({ _id: body.conversationId, studentId: userId }).lean()
    : null;
  if (!conv) {
    conv = await AIConversationModel.create({
      studentId: userId,
      topicId: body.topicId ?? null,
      title: body.question.slice(0, 60),
      messages: [],
      quotaPeriod: new Date(),
      quota: { limit: 10, used: 0 },
    });
  }

  // Stream response
  const encoder = new TextEncoder();
  let fullContent = "";
  let quotaRemaining = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runTutorStream({
          userId,
          isPlus: true, // TODO: real plus check
          question: body.question,
          topicId: body.topicId,
          examActive: body.examActive,
          hintLevel: body.hintLevel,
          onToken: (chunk) => {
            fullContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`));
          },
          signal: req.signal,
        }).then((r) => {
          quotaRemaining = r.quota;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", quotaRemaining })}\n\n`));
          controller.close();
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "خطأ في الذكاء الاصطناعي";
        if (msg === "QUOTA_EXCEEDED") {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", code: "QUOTA_EXCEEDED", messageAr: "وصلت للحد اليومي. ارجع بكرة أو فعّل Plus." })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", code: "AI_ERROR", messageAr: msg })}\n\n`));
        }
        controller.close();
      }
    },
  });

  // Persist conversation after stream (fire-and-forget)
  stream
    .getReader()
    .read()
    .then(() => {})
    .catch(() => {});

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}