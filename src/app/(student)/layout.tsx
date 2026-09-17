import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { AppShell } from "@/components/AppShell";

/** Student area guard: session required. Fail closed → /login on any auth/DB error. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function currentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    const id = session?.user && (session.user as { id?: string }).id;
    return id ?? null;
  } catch {
    return null;
  }
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const id = await currentUserId();
  if (!id) redirect("/login");

  return <AppShell>{children}</AppShell>;
}

export async function requireProfile() {
  const id = await currentUserId();
  if (!id) redirect("/login");
  let profile;
  try {
    await dbConnect();
    profile = await StudentProfileModel.findOne({ userId: id }).lean();
  } catch {
    redirect("/login");
  }
  if (!profile) redirect("/onboarding");
  return profile;
}
