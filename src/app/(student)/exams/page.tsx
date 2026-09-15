"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-ink">الامتحانات التجريبية</h1>
      <p className="text-sm text-ink-mute">
        امتحانات موقوتة بوقت حقيقي — درّب نفسك على ضغط اللجنة قبل اليوم الكبير.
      </p>
      {list.isPending && <p className="text-sm text-ink-mute">جارٍ التحميل…</p>}
      {list.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          تعذر تحميل الامتحانات.
        </p>
      )}
      {list.data?.exams.map((e) => (
        <article key={e.id} className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-bold text-ink">{e.titleAr}</h2>
          {e.description && <p className="mt-1 text-sm text-ink-mute">{e.description}</p>}
          <p className="tnum mt-2 text-xs text-ink-mute">
            {e.totalQ} سؤال • {e.durationMin} دقيقة • محاولات متبقية: {e.attemptsLeft}
            {e.best && <> • أفضل نتيجة: {e.best.accuracy}%</>}
          </p>
          {e.attemptsLeft > 0 ? (
            <Link
              href={`/exam/${e.id}`}
              className="mt-3 block rounded-lg bg-brand-600 py-2.5 text-center text-sm font-bold text-white"
            >
              عرض التعليمات والبدء
            </Link>
          ) : (
            <p className="mt-3 rounded-lg bg-base py-2.5 text-center text-sm text-ink-mute">
              استنفدت محاولات هذا الامتحان
            </p>
          )}
        </article>
      ))}
      {list.data?.exams.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
          لا امتحانات منشورة لصفك بعد — قريبًا.
        </p>
      )}
    </div>
  );
}
