import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { UserModel } from "@/server/modules/auth/user.model";
import { deletionPurgeAt } from "@/server/modules/account/service";
import { AppShell } from "@/components/AppShell";

/** Student area guard: session required. Fail closed → /login on any auth/DB error. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function currentUserId(): Promise<{ id: string; role?: string } | null> {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    return user?.id ? { id: user.id, role: user.role } : null;
  } catch {
    return null;
  }
}

async function deletionLabel(userId: string): Promise<string | null> {
  try {
    await dbConnect();
    const u = await UserModel.findById(userId)
      .select("status deletionRequestedAt")
      .lean();
    if (u?.status === "deletion_pending" && u.deletionRequestedAt) {
      return new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "long",
        timeZone: "Africa/Cairo",
      }).format(deletionPurgeAt(u.deletionRequestedAt));
    }
  } catch {
    return null;
  }
  return null;
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const who = await currentUserId();
  if (!who) redirect("/login");
  if (who.role === "teacher") redirect("/teacher");

  const purgeLabel = await deletionLabel(who.id);

  return <AppShell deletionPurgeAt={purgeLabel}>{children}</AppShell>;
}

export async function requireProfile() {
  const who = await currentUserId();
  if (!who) redirect("/login");
  let profile;
  try {
    await dbConnect();
    profile = await StudentProfileModel.findOne({ userId: who.id }).lean();
  } catch {
    redirect("/login");
  }
  if (!profile) redirect("/onboarding");
  return profile;
}
