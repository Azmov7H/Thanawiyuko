"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

type ReviewItem = {
  qId: string;
  stemMD: string;
  options: Array<{ key: string; text: string }>;
  chosenKeys: string[];
  correctKeys: string[];
  correct: boolean;
  skipped: boolean;
  explanationMD: string;
  difficulty: string;
};

/** M3 result + review: score header, per-question cards with explanations. */
export default function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const [data, setData] = useState<{
    score: number;
    total: number;
    accuracy: number;
    review: ReviewItem[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    params.then(({ attemptId }) => {
      fetch(`/api/practice/${attemptId}`)
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
          if (d.status !== "submitted" || !d.review) throw new Error("الجلسة لم تُسلّم بعد.");
          if (live) setData(d);
        })
        .catch((e) => live && setError(e.message));
    });
    return () => {
      live = false;
    };
  }, [params]);

  if (error) {
    return <ErrorState title={error} />;
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="animate-rise rounded-2xl border border-line bg-surface p-5 text-center">
        <p className="text-sm text-ink-mute">نتيجتك في الجلسة</p>
        <p className="tnum mt-1 text-3xl font-bold text-ink">
          {data.score} / {data.total}
        </p>
        <p className="tnum mt-1 text-sm font-bold text-brand-strong">الدقة {data.accuracy}%</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button href="/practice" icon="practice" className="flex-1">
            جلسة جديدة
          </Button>
          <Button href="/mistakes" variant="gold" icon="mistakes" className="flex-1">
            راجع أخطاءك
          </Button>
          <Button href="/dashboard" variant="secondary" className="flex-1">
            اللوحة
          </Button>
        </div>
      </section>

      {data.review.map((r, i) => (
        <article key={r.qId} className="animate-rise rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-medium leading-relaxed text-ink">
            <span className="tnum text-ink-mute">{i + 1}. </span>
            {r.stemMD}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {r.options.map((o) => {
              const right = r.correctKeys.includes(o.key);
              const mine = r.chosenKeys.includes(o.key);
              return (
                <li
                  key={o.key}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                    right
                      ? "border-ok bg-success-bg font-bold text-ink"
                      : mine
                        ? "border-bad bg-danger-bg text-ink"
                        : "border-line text-ink-mute"
                  }`}
                >
                  <span>{o.text}</span>
                  {right && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-ok">
                      <Icon name="check" size={14} /> الصحيحة
                    </span>
                  )}
                  {mine && !right && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-bad">
                      <Icon name="x" size={14} /> اختيارك
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {r.skipped && <p className="mt-1 text-xs text-ink-mute">لم تُجب على هذا السؤال.</p>}
          <p className="mt-2 rounded-lg bg-base p-2.5 text-sm leading-relaxed text-ink-soft">
            {r.explanationMD}
          </p>
        </article>
      ))}
    </div>
  );
}
