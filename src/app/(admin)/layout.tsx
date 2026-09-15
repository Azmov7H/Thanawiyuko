import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";

export const dynamic = "force-dynamic";

/** Admin shell guard: admin/super only (§5). Students get 404-equivalent → /login. */
export default async function AdminLayout({
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
  if (role !== "admin" && role !== "super") redirect("/login");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6">
      <header className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-ink">ثانويكو — الإدارة</span>
          <nav className="flex gap-1 text-sm">
            <Link href="/admin" className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-base">
              نظرة عامة
            </Link>
            <Link href="/admin/content" className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-base">
              المحتوى
            </Link>
            <Link href="/admin/exams" className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-base">
              الامتحانات
            </Link>
          </nav>
        </div>
        <Link href="/dashboard" className="text-sm text-ink-mute hover:text-ink">
          عودة للوحة الطالب
        </Link>
      </header>
      <main className="py-6">{children}</main>
    </div>
  );
}
