import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { TeacherProfileModel } from "@/server/modules/academic/teacher-profile.model";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileEditor } from "./ProfileEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الملف الشخصي",
  robots: { index: false, follow: false },
};

export default async function TeacherProfilePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  await dbConnect();
  let profile = await TeacherProfileModel.findOne({ userId }).lean();
  if (!profile) profile = await TeacherProfileModel.create({ userId }).then((d) => d.toObject());

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="منصة المعلمين"
        title="الملف الشخصي"
        description="بيانات تظهر في منشورك العام (عند تفعيلها، V2) وتستخدم في أنظمة المحتوى الداخلية."
      />
      <ProfileEditor
        initial={{
          headline: profile.headline,
          bio: profile.bio,
          subjectAreas: profile.subjectAreas,
          isPublic: profile.isPublic,
        }}
      />
    </div>
  );
}