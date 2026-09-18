"use client";

import { useQuery } from "@tanstack/react-query";
import { XpProgress } from "@/components/XpProgress";
import { StreakWidget } from "@/components/StreakWidget";
import { AchievementGallery } from "@/components/AchievementGallery";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

type ProgressData = {
  xp: { total: number; today: number; level: number };
  streak: { current: number; longest: number };
  subjects: Array<{ subjectId: string; nameAr: string; mastery: number; topics: number }>;
  weakTopics: Array<{ topicId: string; topicTitleAr: string | null; subjectNameAr: string | null; masteryScore: number; n: number }>;
  mistakesDue: number;
  plan: Array<{ topicId: string; subjectId: string; action: string; minutes: number; reason: string; qCount?: number }>;
};

/** M7 progress tab: mastery, weak topics, and due reviews. */
export default function ProgressPage() {
  const progress = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const r = await fetch("/api/progress");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as ProgressData;
    },
  });

  if (progress.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (progress.isError) {
    return <ErrorState title="تعذر تحميل التقدم." onRetry={() => progress.refetch()} />;
  }
  const d = progress.data!;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تقدمك"
        eyebrow="إجمالي إتقانك"
        description="اكسر المذاكرة لمواد ومواضيع — وبلّغ على اللي محتاج تركيز."
        actions={
          <Button href="/api/export/progress" download icon="download" variant="secondary" ariaLabel="تصدير تقرير PDF">
            تصدير PDF
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <XpProgress />
        <StreakWidget />
        <AchievementGallery />
      </section>

      {d.subjects.length > 0 && (
        <section>
          <SectionHeader title="الإتقان حسب المادة" meta={<span className="tnum text-xs text-ink-mute">{d.subjects.length} مادة</span>} />
          <ul className="mt-3 flex flex-col gap-4">
            {d.subjects.map((s) => {
              const color = s.mastery < 40 ? "bg-danger-solid" : s.mastery < 70 ? "bg-gold-600" : "bg-ok";
              return (
                <li key={s.subjectId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{s.nameAr}</span>
                    <span className="tnum text-ink-mute">
                      {s.mastery}% • {s.topics} موضوع
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-label={`إتقان ${s.nameAr}`}
                    aria-valuenow={s.mastery}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${s.mastery}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {d.weakTopics.length > 0 && (
        <section>
          <SectionHeader title="نقاط تحتاج تركيز" meta={<span className="text-xs text-ink-mute">حسب آخر إجاباتك</span>} />
          <ul className="mt-2 flex flex-col gap-2">
            {d.weakTopics.map((w) => (
              <li
                key={w.topicId}
                className="flex items-center justify-between gap-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{w.topicTitleAr ?? "موضوع"}</span>
                  {w.subjectNameAr && <span className="mx-2 text-xs text-ink-mute">{w.subjectNameAr}</span>}
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tnum font-bold text-gold-accent">{w.masteryScore}%</span>
                  <span className="text-xs text-ink-mute">من {w.n} إجابة</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.mistakesDue > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3">
          <p className="font-bold text-gold-accent">لديك {d.mistakesDue} مراجعة مستحقة.</p>
          <Button href="/mistakes" variant="gold" size="sm">
            ابدأ المراجعة
          </Button>
        </section>
      )}
    </div>
  );
}