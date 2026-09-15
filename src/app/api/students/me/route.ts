import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { onboardingPatchSchema } from "@/lib/validators";
import { normalizeTrack } from "@/lib/academic";

async function me() {
  const session = await auth();
  const id = session?.user && (session.user as { id?: string }).id;
  if (!id) return null;
  return id;
}

/** GET /api/students/me — own academic profile (owner-only, §5). */
export async function GET() {
  const id = await me();
  if (!id)
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  try {
    await dbConnect();
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." },
      { status: 503 },
    );
  }
  const profile = await StudentProfileModel.findOne({ userId: id }).lean();
  if (!profile)
    return NextResponse.json(
      { code: "NOT_FOUND", messageAr: "الملف غير موجود." },
      { status: 404 },
    );
  return NextResponse.json({ profile });
}

/** PATCH /api/students/me — resumable onboarding + academic updates. */
export async function PATCH(req: Request) {
  const id = await me();
  if (!id)
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "بيانات غير صالحة." },
      { status: 400 },
    );
  }
  const parsed = onboardingPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "VALIDATION",
        messageAr: "راجع البيانات المدخلة.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  try {
    await dbConnect();
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." },
      { status: 503 },
    );
  }
  const { step, done, targetExamDate, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  // Track-grade rule (M2): sec1/sec2 have no streams — force "general".
  // Confirmation UX for mid-year changes ships with the plan-freeze flow (M5).
  if (typeof update.grade === "string") {
    update.track = normalizeTrack(
      update.grade as "sec1" | "sec2" | "sec3",
      typeof update.track === "string" ? update.track : null,
    );
  }
  if (targetExamDate !== undefined)
    update.targetExamDate = targetExamDate ? new Date(targetExamDate) : null;
  if (step !== undefined) update["onboardingState.step"] = step;
  if (done !== undefined) update["onboardingState.done"] = done;

  const profile = await StudentProfileModel.findOneAndUpdate(
    { userId: id },
    { $set: update },
    { new: true },
  ).lean();
  if (!profile)
    return NextResponse.json(
      { code: "NOT_FOUND", messageAr: "الملف غير موجود." },
      { status: 404 },
    );
  return NextResponse.json({ profile });
}
