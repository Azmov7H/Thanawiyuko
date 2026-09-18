import Link from "next/link";

export default function TeacherOverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">نظرة عامة</h1>
      <p className="text-sm text-ink-mute">
        هذه النقطة المخصصة للمدرسين الداخليين (محتوى بإذن دعوة فقط). استوديو المحتوى
        (إنشاء الدروس والأسئلة كمسودة بالموافقة المزدوجة) يأتي في المهمة M2.
      </p>
      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="font-bold text-ink">الملف الشخصي</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          أكمِل بياناتك الشخصية — ستُستخدم لاحقًا في منشورات المعلم العامة (V2) وفي
          أنظمة المحتوى الداخلية.
        </p>
        <Link
          href="/teacher/profile"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
        >
          عدّل الملف الشخصي
        </Link>
      </div>
    </div>
  );
}