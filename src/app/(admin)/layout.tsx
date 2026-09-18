import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/server/auth/config";
import { SkipLink } from "@/components/SkipLink";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
      <SkipLink />
      <header className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-ink">ثانويكو — الإدارة</span>
          <nav className="flex gap-1 text-sm">
            <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-soft hover:bg-base hover:text-ink">
              <Icon name="home" size={16} aria-hidden />
              نظرة عامة
            </Link>
            <Link href="/admin/content" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-soft hover:bg-base hover:text-ink">
              <Icon name="book" size={16} aria-hidden />
              المحتوى
            </Link>
            <Link href="/admin/exams" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-soft hover:bg-base hover:text-ink">
              <Icon name="exams" size={16} aria-hidden />
              الامتحانات
            </Link>
            <Link href="/admin/users" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-soft hover:bg-base hover:text-ink">
              <Icon name="users" size={16} aria-hidden />
              المستخدمون
            </Link>
            <Link href="/admin/audit" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-soft hover:bg-base hover:text-ink">
              <Icon name="clock" size={16} aria-hidden />
              سجل التدقيق
            </Link>
          </nav>
        </div>
        <Link href="/dashboard" className="text-sm text-ink-mute hover:text-ink">
          عودة للوحة الطالب
        </Link>
      </header>
      <main id="main" tabIndex={-1} className="py-6 outline-none">{children}</main>
    </div>
  );
}
