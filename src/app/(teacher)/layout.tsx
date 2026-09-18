import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/server/auth/config";
import { SkipLink } from "@/components/SkipLink";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Teacher shell guard: internal teacher role only (invite-only, §5.4). */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: string | undefined;
  try {
    const session = await auth();
    role = (session?.user as { role?: string } | undefined)?.role;
  } catch {
    redirect("/login");
  }
  if (role !== "teacher") redirect("/login");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6">
      <SkipLink />
      <header className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-ink">ثانويكو — منصة المعلمين</span>
          <nav className="flex gap-1 text-sm">
            <Link href="/teacher" className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-base">
              نظرة عامة
            </Link>
            <Link href="/teacher/profile" className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-base">
              الملف الشخصي
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 py-6" id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}