"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

type Q = {
  qId: string;
  type: string;
  stemMD: string;
  options: Array<{ key: string; text: string }>;
  difficulty: string;
};

type Checked = { correct: boolean; correctKeys: string[]; explanationMD: string };

type ServerAnswer = { chosenKeys: string[]; checked: boolean; correct?: boolean };

async function getJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok) throw new Error(d.messageAr ?? "خطأ.");
  return d;
}

/**
 * M3 quiz session: one question per view (mobile-first), instant locked
 * check per question, submit at the end. Per-question time tracked in handlers.
 */
export default function QuizSessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<Record<string, Checked>>({});
  const [times, setTimes] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"check" | "submit" | null>(null);
  const viewStart = useRef<Record<string, number>>({});

  const attempt = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () =>
      getJSON(`/api/practice/${attemptId}`) as Promise<{
        status: string;
        questions: Q[];
        answers: Record<string, ServerAnswer>;
      }>,
  });

  useEffect(() => {
    if (attempt.data?.status === "submitted") {
      router.replace(`/practice/result/${attemptId}`);
    }
  }, [attempt.data?.status, attemptId, router]);

  // Resume hydration (render-time pattern): merge server answers once per attempt.
  if (attempt.data && hydrated !== attemptId) {
    setHydrated(attemptId);
    const pk: Record<string, string[]> = {};
    const ck: Record<string, Checked> = {};
    for (const [qid, a] of Object.entries(attempt.data.answers ?? {})) {
      pk[qid] = a.chosenKeys;
      if (a.checked) {
        ck[qid] = { correct: a.correct ?? false, correctKeys: [], explanationMD: "" };
      }
    }
    setPicked(pk);
    setChecked(ck);
  }

  const questions = attempt.data?.status === "in_progress" ? (attempt.data.questions ?? []) : [];
  const q = questions[idx];
  const done = Object.keys(checked).length;
  const total = questions.length;

  function stamp(qId: string) {
    const now = Date.now();
    const started = viewStart.current[qId] ?? now;
    viewStart.current[qId] = now;
    return now - started;
  }

  function go(i: number) {
    if (q) setTimes((t) => ({ ...t, [q.qId]: (t[q.qId] ?? 0) + stamp(q.qId) }));
    setIdx(i);
  }

  function choose(key: string) {
    if (!q || checked[q.qId]) return;
    setPicked((p) => ({ ...p, [q.qId]: [key] }));
  }

  async function check() {
    if (!q || checked[q.qId]) return;
    const chosen = picked[q.qId] ?? [];
    if (chosen.length === 0) return;
    setBusy("check");
    setError("");
    try {
      const d = (await getJSON(`/api/practice/${attemptId}/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qId: q.qId, chosenKeys: chosen, timeMs: (times[q.qId] ?? 0) + stamp(q.qId) }),
      })) as Checked;
      setChecked((c) => ({ ...c, [q.qId]: d }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحقق.");
    }
    setBusy(null);
  }

  async function submit() {
    setBusy("submit");
    setError("");
    try {
      const payload = questions.map((x) => ({
        qId: x.qId,
        chosenKeys: picked[x.qId] ?? [],
        timeMs: times[x.qId] ?? 0,
      }));
      await getJSON(`/api/practice/${attemptId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      router.push(`/practice/result/${attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التسليم.");
      setBusy(null);
    }
  }

  if (attempt.isPending) {
    return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل الأسئلة…</p>;
  }
  if (attempt.isError || !q) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
        {error || "تعذر تحميل الجلسة."}
      </p>
    );
  }

  const result = checked[q.qId];
  const selection = picked[q.qId] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between text-xs text-ink-mute">
          <span className="tnum">
            سؤال {idx + 1} من {total}
          </span>
          <span className="tnum">{done} تم التحقق منها</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-base" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={total}>
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>

      <article className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-base font-medium leading-relaxed text-ink">{q.stemMD}</p>
        <div className="mt-4 flex flex-col gap-2">
          {q.options.map((o, i) => {
            const isSel = selection.includes(o.key);
            const isRight = result && result.correctKeys.includes(o.key);
            const isWrongSel = result && isSel && !result.correct;
            return (
              <button
                key={o.key}
                disabled={Boolean(result)}
                onClick={() => choose(o.key)}
                aria-pressed={isSel}
                className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-start text-sm ${
                  isRight
                    ? "border-ok bg-green-50 font-bold text-ink"
                    : isWrongSel
                      ? "border-bad bg-red-50 text-ink"
                      : isSel
                        ? "border-brand-600 bg-brand-50 font-bold text-brand-700"
                        : "border-line text-ink-soft"
                }`}
              >
                <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-base text-xs font-bold">
                  {i + 1}
                </span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>

        {result && result.explanationMD && (
          <div className={`mt-3 rounded-xl p-3 text-sm leading-relaxed ${result.correct ? "bg-green-50 text-ink" : "bg-red-50 text-ink"}`}>
            <p className="font-bold">{result.correct ? "إجابة صحيحة، عاش!" : "إجابة غير صحيحة — شوف الشرح:"}</p>
            <p className="mt-1">{result.explanationMD}</p>
          </div>
        )}
      </article>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="sticky bottom-20 flex gap-2 md:static">
        {!result ? (
          <button
            onClick={check}
            disabled={selection.length === 0 || busy === "check"}
            className="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy === "check" ? "جارٍ التحقق…" : "تحقق من الإجابة"}
          </button>
        ) : idx < total - 1 ? (
          <button onClick={() => go(idx + 1)} className="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white">
            السؤال التالي
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={busy === "submit"}
            className="flex-1 rounded-lg bg-ink py-3 font-bold text-base text-white disabled:opacity-50"
          >
            {busy === "submit" ? "جارٍ التسليم…" : "تسليم الجلسة وعرض النتيجة"}
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <button
          disabled={idx === 0}
          onClick={() => go(idx - 1)}
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft disabled:opacity-40"
        >
          السابق
        </button>
        {idx < total - 1 && result && (
          <button onClick={() => go(idx + 1)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft">
            التالي
          </button>
        )}
      </div>
    </div>
  );
}
