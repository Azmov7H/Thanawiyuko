import { redirect } from "next/navigation";
import { requireProfile } from "@/app/(student)/layout";

export const dynamic = "force-dynamic";

const GRADE_AR: Record<string, string> = {
  sec1: "الأول الثانوي",
  sec2: "الثاني الثانوي",
  sec3: "الثالث الثانوي",
};
const TRACK_AR: Record<string, string> = {
  general: "عام",
  science: "علمي علوم",
  math: "علمي رياضة",
  literary: "أدبي",
};

/** M1 dashboard: academic summary + resume state. Practice/plan blocks land in M3–M5. */
export default async function DashboardPage() {
  const profile = await requireProfile();
  if (!profile.onboardingState?.done) redirect("/onboarding");

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h1 className="text-xl font-bold text-ink">لوحتك اليوم</h1>
        <p className="mt-1 text-sm text-ink-mute">
          {profile.grade ? GRADE_AR[String(profile.grade)] : "—"}
          {profile.track ? ` • ${TRACK_AR[String(profile.track)]}` : ""} • هدفك
          اليومي <span className="tnum">{profile.dailyMinutes}</span> دقيقة
        </p>
        <div className="mt-4 rounded-xl bg-base p-4 text-sm leading-relaxed text-ink-soft">
          التشخيص المبدئي وبنك الأسئلة والخطة اليومية بيوصلوا في المراحل
          الجاية (M3–M5). دلوقتي ملفك محفوظ وجاهز — أول ما المحتوى ينزل هتلاقي
          أول جلسة مستنياك هنا.
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "نقاط XP", value: "0" },
          { label: "أيام متتالية", value: "0" },
          { label: "إنجازات", value: "0 / 10" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-surface p-4 text-center"
          >
            <div className="tnum text-lg font-bold text-ink">{s.value}</div>
            <div className="mt-1 text-xs text-ink-mute">{s.label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
