import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { deletionPurgeAt } from "@/server/modules/account/service";
import { getNotificationPreferences } from "@/server/modules/notifications/service";
import { AccountActions } from "./AccountActions";
import { NotificationPreferences } from "./NotificationPreferences";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "حسابي",
  robots: { index: false, follow: false },
};

const GRADE_AR: Record<string, string> = {
  sec1: "الأول الثانوي",
  sec2: "الثاني الثانوي",
  sec3: "الثالث الثانوي",
};

const TRACK_AR: Record<string, string> = {
  general: "عام",
  science: "علمي",
  math: "رياضة",
  literary: "أدبي",
};

export default async function SettingsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  await dbConnect();
  const [user, profile, preferences] = await Promise.all([
    UserModel.findById(userId).select("name email status deletionRequestedAt guardianConsentAt").lean(),
    StudentProfileModel.findOne({ userId }).lean(),
    getNotificationPreferences(userId),
  ]);
  if (!user) redirect("/login");

  const pending = user.status === "deletion_pending" && !!user.deletionRequestedAt;
  const purgeLabel = pending
    ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "long", timeZone: "Africa/Cairo" }).format(
        deletionPurgeAt(user.deletionRequestedAt as Date),
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="حسابك"
        title="حسابي"
        description="بيانات حسابك، تصدير بياناتك، وإدارة الحذف."
      />

      <section aria-labelledby="account-info" className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="account-info" className="font-bold text-ink">
          البيانات الأساسية
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-mute">الاسم</dt>
            <dd className="font-medium text-ink">{user.name}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">البريد الإلكتروني</dt>
            <dd dir="ltr" className="font-medium text-ink">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-ink-mute">الصف</dt>
            <dd className="font-medium text-ink">
              {profile?.grade ? (GRADE_AR[profile.grade] ?? profile.grade) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-mute">الشعبة</dt>
            <dd className="font-medium text-ink">
              {profile?.track ? (TRACK_AR[profile.track] ?? profile.track) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <NotificationPreferences initialEmail={preferences.email} />

      <AccountActions
        deletionPending={pending}
        purgeAtLabel={purgeLabel}
        exportHref="/api/account/export"
      />
    </div>
  );
}
