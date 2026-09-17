"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MistakeItem = {
  id: string;
  questionId: string;
  topicId: string;
  topicTitleAr: string | null;
  conceptTag: string | null;
  stemMD: string;
  options: Array<{ key: string; text: string }>;
  correctKeys: string[];
  chosenKeys: string[];
  explanationMD: string;
  reviewCount: number;
};

/** Mistake library + spaced review entry point (§4.6). */
export default function MistakesPage() {
  const router = useRouter();
  const [all, setAll] = useState(false);

  const list = useQuery({
    queryKey: ["mistakes", all],
    queryFn: async () => {
      const r = await fetch(`/api/mistakes${all ? "?filter=all" : ""}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { items: MistakeItem[] };
    },
  });

  const start = useMutation({
    mutationFn: async (topicId: string) => {
      const r = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId, count: 10 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر بدء التدريب.");
      return d as { attemptId: string };
    },
    onSuccess: (d) => router.push(`/practice/session/${d.attemptId}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">مكتبة الأخطاء</h1>
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft"
        >
          {all ? "المستحقة فقط" : "كل الأخطاء"}
        </button>
      </div>

      {start.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {start.error instanceof Error ? start.error.message : "تعذر بدء التدريب."}
        </p>
      )}

      {list.isPending && <p className="text-sm text-ink-mute">جارٍ التحميل…</p>}
      {list.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          تعذر تحميل الأخطاء.
        </p>
      )}

      {list.data?.items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
          لا توجد أخطاء {all ? "" : "مستحقة الآن"} — أداء رائع.
        </p>
      )}

      {list.data?.items.map((m) => (
        <article key={m.id} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-xs text-ink-mute">
            <span>{m.topicTitleAr ?? "موضوع"}{m.conceptTag ? ` • ${m.conceptTag}` : ""}</span>
            <span className="tnum">أُعيدت {m.reviewCount} مرة</span>
          </div>
          <p className="mt-2 text-base font-medium leading-relaxed text-ink">{m.stemMD}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {m.options.map((o, i) => {
              const isRight = m.correctKeys.includes(o.key);
              const isWrongChosen = m.chosenKeys.includes(o.key) && !isRight;
              return (
                <div
                  key={o.key}
                  className={`flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    isRight
                      ? "border-ok bg-green-50 font-bold text-ink"
                      : isWrongChosen
                        ? "border-bad bg-red-50 text-ink"
                        : "border-line text-ink-soft"
                  }`}
                >
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-base text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{o.text}</span>
                </div>
              );
            })}
          </div>
          {m.explanationMD && (
            <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm leading-relaxed text-ink">
              {m.explanationMD}
            </p>
          )}
          <button
            type="button"
            onClick={() => start.mutate(m.topicId)}
            disabled={start.isPending}
            className="mt-3 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {start.isPending ? "جارٍ البدء…" : "تدرب على هذا الموضوع"}
          </button>
        </article>
      ))}
    </div>
  );
}
