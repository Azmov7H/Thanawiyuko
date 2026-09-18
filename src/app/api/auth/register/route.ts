import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { registerSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/server/ratelimit";
import { createNotification } from "@/server/modules/notifications/service";
import { hashUser, logServerError } from "@/server/logger";

const WINDOW_MS = 60_000;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

/** POST /api/auth/register — student self-registration (one account = one profile). */
export async function POST(req: Request) {
  const rl = checkRateLimit(`register:${clientIp(req)}`, 5, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        messageAr: "محاولات كثيرة. حاول بعد قليل.",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "بيانات غير صالحة." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
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
      { code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا. حاول لاحقًا." },
      { status: 503 },
    );
  }

  const exists = await UserModel.findOne({ email: parsed.data.email }).lean();
  if (exists) {
    // Generic message: do not confirm whether the email is registered (§16).
    return NextResponse.json(
      {
        code: "CONFLICT",
        messageAr: "تعذر إنشاء الحساب بهذه البيانات. جرّب الدخول.",
      },
      { status: 409 },
    );
  }

  const user = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    role: "student",
    guardianConsentAt: new Date(),
  });
  await StudentProfileModel.create({ userId: user._id });

  try {
    await createNotification({
      userId: String(user._id),
      type: "welcome",
      titleAr: "أهلاً بيك في ثانويكو",
      bodyAr:
        "كمل بياناتك وحدد هدفك، والخطة والمكتبة هتتظبط على مستواك.",
      link: "/onboarding",
      emailTo: parsed.data.email,
    });
  } catch (e) {
    await logServerError("notifications.welcome.failed", e, { user: hashUser(String(user._id)) });
  }

  return NextResponse.json({ ok: true, userId: String(user._id) }, { status: 201 });
}
