"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon, type IconName } from "@/components/ui/Icon";

type PlanItem = {
  topicId: string;
  subjectId: string;
  action: string;
  minutes: number;
  reason: string;
  qCount?: number;
};

type PlanResponse = { plan: PlanItem[]; date: string; created?: boolean; upgradeRequired?: boolean; adaptive?: boolean };

const ACTION_META: Record<string, { label: string; icon: IconName }> = {
  review: { label: "مراجعة", icon: "book" },
  lesson: { label: "درس", icon: "book" },
  practice: { label: "تدريب", icon: "practice" },
};

/** M5 study plan: today's deterministic action list with reasons. */
export default function StudyPlanPage() {
  const qc = useQueryClient();
  const planQuery = useQuery({
    queryKey: ["study-plan"],
    queryFn: async () => {
      const r = await fetch("/api/study-plan");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as PlanResponse;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/study-plan", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر توليد الخطة.");
      return d as PlanResponse;
    },
    onSuccess: (d) => qc.setQueryData(["study-plan"], d),
  });

  if (planQuery.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (planQuery.isError) {
    return <ErrorState title="تعذر تحميل الخطة." onRetry={() => planQuery.refetch()} />;
  }

  const plan = planQuery.data!.plan;
  const planError = generate.error instanceof Error ? generate.error.message : null;
  const planDate = planQuery.data!.date;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={planDate}
        title="خطتك اليوم"
        description="مهام مترتبة حسب أولويتك — جهّز نفسك وابدأ بوقت محدد."
        actions={
          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            icon={generate.isPending ? undefined : "plan"}
            ariaLabel="إعادة توليد الخطة"
          >
            {generate.isPending ? "جارٍ التوليد…" : "إعادة توليد"}
          </Button>
        }
      />

      {planError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {planError}
          <Link href="/subscription" className="ms-2 font-bold underline">
            الترقية إلى بلس
          </Link>
        </p>
      )}

      {plan.length === 0 ? (
        <EmptyState
          icon="plan"
          title="لا توجد مهام بعد"
          body="ابدأ جلسة تدريب ليتكوّن إتقانك وتُبنى خطتك تلقائيًا."
          action={
            <Button href="/practice" icon="practice">
              ابدأ التدريب
            </Button>
          }
        />
      ) : (
        <section>
          <SectionHeader title="مهام اليوم" meta={<span className="tnum text-xs text-ink-mute">{plan.length} مهمة</span>} />
          <ul className="mt-2 flex flex-col gap-2">
            {plan.map((p, i) => {
              const meta = ACTION_META[p.action] ?? ACTION_META.practice;
              return (
                <li key={`${i}-${p.topicId}`}>
                  <Link
                    href={`/subjects/${p.subjectId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink-mute hover:bg-base"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
                        <Icon name={meta.icon} size={20} />
                      </span>
                      <div>
                        <span className="font-bold text-ink">
                          {meta.label} — {p.minutes} دقيقة
                        </span>
                        <p className="mt-0.5 text-xs text-ink-mute">{p.reason}</p>
                      </div>
                    </div>
                    <span className="tnum shrink-0 text-xs text-brand-strong">{p.qCount ?? "?"} سؤال</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}