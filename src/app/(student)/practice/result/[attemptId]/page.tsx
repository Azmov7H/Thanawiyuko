"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
        {error}
      </p>
    );
  }
  if (!data) {
    return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل النتيجة…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-5 text-center">
        <p className="text-sm text-ink-mute">نتيجتك في الجلسة</p>
        <p className="tnum mt-1 text-3xl font-bold text-ink">
          {data.score} / {data.total}
        </p>
        <p className="tnum mt-1 text-sm font-bold text-brand-strong">الدقة {data.accuracy}%</p>
        <div className="mt-4 flex gap-2">
          <Link href="/practice" className="flex-1 rounded-lg bg-brand-600 py-2.5 text-center text-sm font-bold text-white">
            جلسة جديدة
          </Link>
          <Link href="/mistakes" className="flex-1 rounded-lg bg-gold-600 py-2.5 text-center text-sm font-bold text-white">
            راجع أخطاءك
          </Link>
          <Link href="/dashboard" className="flex-1 rounded-lg border border-line py-2.5 text-center text-sm font-bold text-ink">
            اللوحة
          </Link>
        </div>
      </section>

      {data.review.map((r, i) => (
        <article key={r.qId} className="rounded-2xl border border-line bg-surface p-4">
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
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    right
                      ? "border-ok bg-success-bg font-bold text-ink"
                      : mine
                        ? "border-bad bg-danger-bg text-ink"
                        : "border-line text-ink-mute"
                  }`}
                >
                  {o.text}
                  {right && <span className="ms-2 text-xs font-bold text-ok">✓ الصحيحة</span>}
                  {mine && !right && <span className="ms-2 text-xs font-bold text-bad">✗ اختيارك</span>}
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
