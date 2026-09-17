import { dbConnect } from "@/server/db/client";
import { getAiProvider } from "./provider";
import { loadAiConfig } from "./config";
import { loadPrompt, renderPrompt } from "./config";
import { LessonModel } from "@/server/modules/academic/content.models";
import { TopicModel } from "@/server/modules/academic/content.models";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { AIConversationModel } from "@/server/modules/ai/conversation.model";
import { cairoDayStartUTC } from "@/lib/cairo";

const config = loadAiConfig();

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/** Per-user daily quota check + increment. */
export async function checkAndConsumeQuota(userId: string, isPlus: boolean): Promise<{ ok: boolean; remaining: number; resetAt: Date }> {
  await dbConnect();
  const today = cairoDayStartUTC();
  const tomorrow = cairoDayStartUTC(new Date(today.getTime() + 24 * 60 * 60 * 1000));
  const limit = isPlus ? config.dailyQuota.plus : config.dailyQuota.free;

  let conv = await AIConversationModel.findOne({ studentId: userId, quotaPeriod: today }).lean();
  if (conv && (conv.quota?.used ?? 0) >= limit) {
    return { ok: false, remaining: 0, resetAt: tomorrow };
  }

  if (conv) {
    conv = await AIConversationModel.findOneAndUpdate(
      { studentId: userId, quotaPeriod: today, "quota.used": { $lt: limit } },
      { $inc: { "quota.used": 1 } },
      { new: true },
    ).lean();
    if (!conv) return { ok: false, remaining: 0, resetAt: tomorrow };
  } else {
    try {
      conv = await AIConversationModel.findOneAndUpdate(
        { studentId: userId, quotaPeriod: today },
        {
          $setOnInsert: { studentId: userId, quotaPeriod: today, "quota.limit": limit },
          $inc: { "quota.used": 1 },
        },
        { upsert: true, new: true },
      ).lean();
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      conv = await AIConversationModel.findOneAndUpdate(
        { studentId: userId, quotaPeriod: today, "quota.used": { $lt: limit } },
        { $inc: { "quota.used": 1 } },
        { new: true },
      ).lean();
      if (!conv) return { ok: false, remaining: 0, resetAt: tomorrow };
    }
  }

  const used = conv.quota?.used ?? 1;
  return { ok: used <= limit, remaining: Math.max(0, limit - used), resetAt: tomorrow };
}

/** Identical-explanation cache (7 days by default). */
const explanationCache = new Map<string, { content: string; expires: number }>();

export function getCachedExplanation(key: string): string | null {
  const hit = explanationCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.content;
  if (hit) explanationCache.delete(key);
  return null;
}

export function setCachedExplanation(key: string, content: string, ttl = config.explanationCacheTtl * 1000) {
  explanationCache.set(key, { content, expires: Date.now() + ttl });
}

/** RAG: fetch top-3 lesson chunks for a topic. */
export async function getLessonContext(topicId: string): Promise<{ title: string; summary: string; chunks: string[] } | null> {
  await dbConnect();
  const topic = await TopicModel.findById(topicId).select("titleAr").lean();
  if (!topic) return null;
  const lessons = await LessonModel.find({ topicId, status: "published" }).select("titleAr bodyMD").sort({ order: 1 }).lean();
  if (lessons.length === 0) return null;
  const chunks: string[] = [];
  for (const l of lessons) {
    const parts = l.bodyMD.split("\n\n").filter((p: string) => p.trim().length > 50);
    for (const p of parts.slice(0, 2)) chunks.push(`[${l.titleAr}] ${p}`);
    if (chunks.length >= 3) break;
  }
  return { title: topic.titleAr, summary: `درس ${topic.titleAr} — ${lessons.length} أجزاء`, chunks: chunks.slice(0, 3) };
}

/** Get recent mistake concept tags (anonymized). */
export async function getRecentMistakeTags(userId: string, limit = 5): Promise<string[]> {
  await dbConnect();
  const mistakes = await MistakeModel.find({ studentId: userId, resolvedAt: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("conceptTag")
    .lean();
  return mistakes.map((m) => m.conceptTag).filter((t): t is string => !!t);
}

/** Get student level string. */
export async function getStudentLevel(userId: string): Promise<string> {
  await dbConnect();
  const profile = await StudentProfileModel.findOne({ userId }).lean();
  if (!profile) return "طالب ثانوي";
  const gradeMap: Record<string, string> = { sec1: "أول ثانوي", sec2: "ثاني ثانوي", sec3: "ثالث ثانوي" };
  const trackMap: Record<string, string> = { general: "عام", science: "علمي علوم", math: "علمي رياضة", literary: "أدبي" };
  return `${gradeMap[profile.grade ?? "sec3"]} ${trackMap[profile.track ?? "general"]}`;
}

/** Log AI interaction for eval + cost tracking. */
export async function logAiCall(data: {
  studentId: string;
  type: "tutor" | "mistake";
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  helpful?: boolean;
}): Promise<void> {
  await dbConnect();
  // In production, write to a dedicated AI log collection or analytics pipeline.
  // For MVP, just console.log with structured data.
  console.log("[AI_LOG]", JSON.stringify({ ...data, at: new Date().toISOString() }));
}

/** Build tutor prompt with context. */
export async function buildTutorPrompt(userId: string, question: string, lessonContext: { title: string; summary: string; chunks: string[] } | null, examActive = false, hintLevel = 1) {
  const [level, mistakes] = await Promise.all([getStudentLevel(userId), getRecentMistakeTags(userId)]);
  const prompt = loadPrompt("tutor", "v1");
  const context = lessonContext
    ? { title: lessonContext.title, summary: lessonContext.summary, chunks: lessonContext.chunks.join("\n\n---\n\n") }
    : { title: "غير محدد", summary: "لا يوجد سياق درس", chunks: "لا يوجد محتوى مرتبط." };
  return renderPrompt(prompt.user, {
    studentLevel: level,
    lessonTitle: context.title,
    lessonSummary: context.summary,
    lessonChunks: context.chunks,
    recentMistakes: mistakes.length ? mistakes.join("، ") : "لا توجد أخطاء حديثة",
    userQuestion: question,
    examActive: String(examActive),
    hintLevel: String(hintLevel),
  });
}

/** Build mistake explainer prompt. */
export async function buildMistakePrompt(data: {
  questionStem: string;
  options: Array<{ key: string; text: string }>;
  chosenKey: string;
  chosenText: string;
  correctKey: string;
  correctText: string;
  storedExplanation: string;
  studentLevel: string;
}) {
  const prompt = loadPrompt("mistake-explainer", "v1");
  return renderPrompt(prompt.user, {
    questionStem: data.questionStem,
    optionsList: data.options.map((o) => `${o.key}) ${o.text}`).join("\n"),
    chosenKey: data.chosenKey,
    chosenText: data.chosenText,
    correctKey: data.correctKey,
    correctText: data.correctText,
    storedExplanation: data.storedExplanation,
    studentLevel: data.studentLevel,
  });
}

/** Core tutor call with quota + caching + streaming. */
export async function runTutorStream(args: {
  userId: string;
  isPlus: boolean;
  question: string;
  topicId?: string;
  examActive?: boolean;
  hintLevel?: number;
  onToken: (chunk: string) => void;
  signal?: AbortSignal;
}) {
  const quota = await checkAndConsumeQuota(args.userId, args.isPlus);
  if (!quota.ok) throw new Error("QUOTA_EXCEEDED");

  const tier: "tutor" | "tutorPremium" = args.isPlus ? "tutorPremium" : "tutor";
  const lessonCtx = args.topicId ? await getLessonContext(args.topicId) : null;
  const system = loadPrompt("tutor", "v1").system;
  const userPrompt = await buildTutorPrompt(args.userId, args.question, lessonCtx, args.examActive, args.hintLevel);

  // Cache key for identical (question + topic + tier)
  const cacheKey = `tutor:${args.userId}:${tier}:${args.topicId ?? "none"}:${Buffer.from(args.question).toString("base64").slice(0, 32)}`;
  const cached = getCachedExplanation(cacheKey);
  if (cached && !args.examActive) {
    for (const ch of cached.split("")) args.onToken(ch);
    await logAiCall({ studentId: args.userId, type: "tutor", model: tier, tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs: 0, cached: true });
    return { content: cached, model: tier, tokensIn: 0, tokensOut: 0, costUsd: 0, quota: quota.remaining, cached: true };
  }

  const provider = getAiProvider();
  const start = Date.now();
  const result = await provider.completeStream({
    model: tier,
    system,
    user: userPrompt,
    maxTokens: config.responseCap,
    onToken: args.onToken,
    signal: args.signal,
  });

  if (!args.examActive) setCachedExplanation(cacheKey, result.content);
  await logAiCall({ studentId: args.userId, type: "tutor", model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: result.costUsd, latencyMs: Date.now() - start, cached: false });
  return { content: result.content, quota: quota.remaining, cached: false };
}

/** Core mistake explainer (non-streaming, cheaper). */
export async function runMistakeExplainer(args: {
  userId: string;
  isPlus: boolean;
  questionStem: string;
  options: Array<{ key: string; text: string }>;
  chosenKey: string;
  chosenText: string;
  correctKey: string;
  correctText: string;
  storedExplanation: string;
  topicId: string;
  conceptTag?: string;
}) {
  const quota = await checkAndConsumeQuota(args.userId, args.isPlus);
  if (!quota.ok) throw new Error("QUOTA_EXCEEDED");

  const tier: "tutor" | "tutorPremium" = args.isPlus ? "tutorPremium" : "tutor";
  const level = await getStudentLevel(args.userId);
  const system = loadPrompt("mistake-explainer", "v1").system;
  const user = await buildMistakePrompt({ ...args, studentLevel: level });

  const cacheKey = `mistake:${args.userId}:${args.topicId}:${args.chosenKey}:${args.correctKey}`;
  const cached = getCachedExplanation(cacheKey);
  if (cached) {
    await logAiCall({ studentId: args.userId, type: "mistake", model: tier, tokensIn: 0, tokensOut: 0, costUsd: 0, latencyMs: 0, cached: true });
    return { content: cached, quota: quota.remaining, cached: true };
  }

  const provider = getAiProvider();
  const start = Date.now();
  const result = await provider.complete({
    model: tier,
    system,
    user,
    maxTokens: config.responseCap,
  });

  setCachedExplanation(cacheKey, result.content);
  await logAiCall({ studentId: args.userId, type: "mistake", model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: result.costUsd, latencyMs: Date.now() - start, cached: false });
  return { content: result.content, quota: quota.remaining, cached: false };
}