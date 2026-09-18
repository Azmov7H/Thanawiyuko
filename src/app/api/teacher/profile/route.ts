import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { TeacherProfileModel } from "@/server/modules/academic/teacher-profile.model";
import { TeacherForbidden, requireTeacherUser } from "@/server/modules/teacher/guard";
import { teacherProfileSchema } from "@/lib/validators";

function err(code: string, messageAr: string, status: number) {
  return NextResponse.json({ code, messageAr }, { status });
}

function serialize(profile: {
  headline: string;
  bio: string;
  subjectAreas: string[];
  isPublic: boolean;
}) {
  return {
    headline: profile.headline,
    bio: profile.bio,
    subjectAreas: profile.subjectAreas,
    isPublic: profile.isPublic,
  };
}

/** GET /api/teacher/profile — the caller's own teacher profile stub (creates on first access). */
export async function GET() {
  let actor: { id: string };
  try {
    actor = await requireTeacherUser();
  } catch (e) {
    if (e instanceof TeacherForbidden) return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }

  let profile = await TeacherProfileModel.findOne({ userId: actor.id }).lean();
  if (!profile) profile = await TeacherProfileModel.create({ userId: actor.id }).then((d) => d.toObject());

  return NextResponse.json(serialize(profile));
}

/** PATCH /api/teacher/profile — update own profile stub (teacher-only). */
export async function PATCH(req: Request) {
  let actor: { id: string };
  try {
    actor = await requireTeacherUser();
  } catch (e) {
    if (e instanceof TeacherForbidden) return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION", "بيانات غير صالحة.", 400);
  }
  const parsed = teacherProfileSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "راجع البيانات المدخلة.", 400);
  if ((parsed.data.subjectAreas ?? []).length === 0) {
    return err("VALIDATION", "أضف مجالًا واحدًا على الأقل.", 400);
  }

  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }

  const update: Partial<{
    headline: string;
    bio: string;
    subjectAreas: string[];
    isPublic: boolean;
  }> = {};
  if (parsed.data.headline !== undefined) update.headline = parsed.data.headline;
  if (parsed.data.bio !== undefined) update.bio = parsed.data.bio;
  if (parsed.data.subjectAreas !== undefined) update.subjectAreas = parsed.data.subjectAreas;
  if (parsed.data.isPublic !== undefined) update.isPublic = parsed.data.isPublic;

  const profile = await TeacherProfileModel.findOneAndUpdate(
    { userId: actor.id },
    { $set: update, $setOnInsert: { userId: actor.id } },
    { upsert: true, new: true },
  )
    .lean();

  return NextResponse.json(serialize(profile));
}