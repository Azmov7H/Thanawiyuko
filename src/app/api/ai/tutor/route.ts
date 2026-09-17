import mongoose from "mongoose";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { hasPlusAccess } from "@/server/billing/service";
import { dbConnect } from "@/server/db/client";
import { runTutorStream } from "@/server/ai/service";
import { AIConversationModel } from "@/server/modules/ai/conversation.model";
import { cairoDayStartUTC } from "@/lib/cairo";

const tutorRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  topicId: z.string().optional(),
  examActive: z.boolean().optional().default(false),
  hintLevel: z.number().int().min(0).max(3).optional().default(1),
  conversationId: z.string().optional(),
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** POST /api/ai/tutor — streaming tutor chat (SSE). */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  let parsed;
  try {
    parsed = tutorRequestSchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "السؤال مطلوب وبصيغة صالحة." }, { status: 400 });

  const data = parsed.data;
  if (data.topicId && !mongoose.isValidObjectId(data.topicId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف الموضوع غير صالح." }, { status: 400 });
  if (data.conversationId && !mongoose.isValidObjectId(data.conversationId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف المحادثة غير صالح." }, { status: 400 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  const isPlus = await hasPlusAccess(userId);
  let conv = data.conversationId
    ? await AIConversationModel.findOne({ _id: data.conversationId, studentId: userId }).lean()
    : null;

  if (data.conversationId && !conv)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "المحادثة غير موجودة." }, { status: 404 });

  if (!conv) {
    conv = await AIConversationModel.create({
      studentId: userId,
      topicId: data.topicId ?? null,
      title: data.question.slice(0, 60),
      messages: [],
      quotaPeriod: cairoDayStartUTC(),
      quota: { limit: isPlus ? 100 : 10, used: 0 },
      status: "active",
    });
  }

  const userMessage = {
    role: "user" as const,
    content: data.question,
    model: "client",
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    createdAt: new Date(),
    cached: false,
  };

  try {
    await AIConversationModel.findByIdAndUpdate(conv._id, {
      $push: { messages: { $each: [userMessage], $slice: -200 } },
    });
  } catch (error) {
    console.error("[AI] failed to persist user message:", error);
    return NextResponse.json({ code: "INTERNAL", messageAr: "تعذر حفظ المحادثة." }, { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runTutorStream({
          userId,
          isPlus,
          question: data.question,
          topicId: data.topicId,
          examActive: data.examActive,
          hintLevel: data.hintLevel,
          onToken: (chunk) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`));
          },
          signal: req.signal,
        });

        const assistantMessage = {
          role: "assistant" as const,
          content: result.content,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
          createdAt: new Date(),
          cached: result.cached,
        };
        await AIConversationModel.findByIdAndUpdate(conv._id, {
          $push: { messages: { $each: [assistantMessage], $slice: -200 } },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              quotaRemaining: result.quota,
              conversationId: String(conv._id),
            })}\n\n`,
          ),
        );
        controller.close();
      } catch (error) {
        const msg = errorMessage(error, "خطأ في الذكاء الاصطناعي");
        const code = msg === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "AI_ERROR";
        const messageAr =
          code === "QUOTA_EXCEEDED"
            ? "وصلت للحد اليومي. ارجع بكرة أو فعّل Plus."
            : msg;
        await AIConversationModel.findByIdAndUpdate(conv._id, {
          $push: {
            messages: {
              $each: [
                {
                  role: "system",
                  content: messageAr,
                  model: "system",
                  tokensIn: 0,
                  tokensOut: 0,
                  costUsd: 0,
                  createdAt: new Date(),
                  cached: false,
                },
              ],
              $slice: -200,
            },
          },
        }).catch(() => undefined);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", code, messageAr })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
