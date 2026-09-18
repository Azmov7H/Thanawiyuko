"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type PlanItem = {
  topicId: string;
  subjectId: string;
  action: string;
  minutes: number;
  reason: string;
  qCount?: number;
};

type PlanResponse = { plan: PlanItem[]; date: string; created?: boolean };

const ACTION_LABEL: Record<string, string> = {
  review: "مراجعة",
  lesson: "درس",
  practice: "تدريب",
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

  if (planQuery.isPending) return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل خطتك…</p>;
  if (planQuery.isError) {
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
        تعذر تحميل الخطة.
      </p>
    );
  }
  const plan = planQuery.data!.plan;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">خطتك اليوم</h1>
        <button
          type="button"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="min-h-11 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {generate.isPending ? "جارٍ التوليد…" : "إعادة توليد"}
        </button>
      </div>

      {generate.isError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          تعذر توليد الخطة.
        </p>
      )}

      {plan.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
          لا توجد مهام بعد — ابدأ جلسة تدريب ليتكوّن إتقانك وتُبنى خطتك.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plan.map((p, i) => (
            <li
              key={`${i}-${p.topicId}`}
              className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4"
            >
              <div>
                <span className="font-bold text-ink">
                  {ACTION_LABEL[p.action] ?? p.action} — {p.minutes} دقيقة
                </span>
                <p className="mt-0.5 text-xs text-ink-mute">{p.reason}</p>
              </div>
              <span className="tnum shrink-0 text-xs text-brand-strong">{p.qCount ?? "?"} سؤال</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
