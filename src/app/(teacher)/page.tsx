import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function TeacherOverviewPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="منصة المعلمين"
        title="نظرة عامة"
        description="هذه النقطة مخصصة للمدرسين الداخليين (محتوى بإذن دعوة فقط). استوديو المحتوى (إنشاء الدروس والأسئلة كمسودة بالموافقة المزدوجة) يأتي في المهمة M2."
      />
<div className="rounded-2xl border border-line bg-surface p-5">
        <SectionHeader title="الملف الشخصي" />
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          أكمِل بياناتك الشخصية — ستُستخدم لاحقًا في منشورات المعلم العامة (V2) وفي
          أنظمة المحتوى الداخلية.
        </p>
        <Button href="/teacher/profile" icon="user" className="mt-4">
          عدّل الملف الشخصي
        </Button>
      </div>
    </div>
  );
}