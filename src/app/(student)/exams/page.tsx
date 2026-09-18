"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";

type ExamListItem = {
  id: string;
  titleAr: string;
  description: string | null;
  durationMin: number;
  totalQ: number;
  attemptsAllowed: number;
  attemptsLeft: number;
  best: { accuracy: number; score: number; total: number } | null;
};

/** M4 exam hall: published mocks with attempts-left + best score. */
export default function ExamsPage() {
  const list = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const r = await fetch("/api/exams");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { exams: ExamListItem[] };
    },
  });

  if (list.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  }

  if (list.isError) {
    return <ErrorState title="تعذر تحميل الامتحانات." onRetry={() => list.refetch()} />;
  }

  const exams = list.data!.exams;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="صالة الامتحانات"
        title="الامتحانات التجريبية"
        description="امتحانات موقوتة بوقت حقيقي — درّب نفسك على ضغط اللجنة قبل اليوم الكبير."
      />

      {exams.length === 0 && (
        <EmptyState
          icon="exams"
          title="لا امتحانات منشورة لصفك بعد"
          body="جرّب جلسات التدريب في الانتظار — وارجع هنا قريبًا."
          action={
            <Button href="/practice" icon="practice" variant="secondary">
              تدريب الآن
            </Button>
          }
        />
      )}

      {exams.map((e) => (
        <article key={e.id} className="animate-rise rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink">{e.titleAr}</h2>
              {e.description && <p className="mt-1 text-sm text-ink-mute">{e.description}</p>}
            </div>
            {e.best && (
              <span className="tnum shrink-0 rounded-full bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-strong">
                أفضل نتيجة {e.best.accuracy}%
              </span>
            )}
          </div>
          <p className="tnum mt-2 flex items-center gap-1 text-xs text-ink-mute">
            <Icon name="clock" size={14} />
            {e.durationMin} دقيقة • {e.totalQ} سؤال • محاولات متبقية: {e.attemptsLeft}
          </p>
          {e.attemptsLeft > 0 ? (
            <Button href={`/exam/${e.id}`} icon="exams" className="mt-3 w-full">
              عرض التعليمات والبدء
            </Button>
          ) : (
            <p className="mt-3 rounded-lg bg-base py-2.5 text-center text-sm text-ink-mute">
              استنفدت محاولات هذا الامتحان
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
