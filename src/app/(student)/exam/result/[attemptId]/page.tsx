"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReviewItem = {
  qId: string;
  topicId: string;
  stemMD: string;
  options: Array<{ key: string; text: string }>;
  chosenKeys: string[];
  correctKeys: string[];
  correct: boolean;
  skipped: boolean;
  timeMs: number;
  explanationMD: string;
  difficulty: string;
};

type Analysis = {
  score: number;
  total: number;
  accuracy: number;
  totalTimeMs: number;
  perTopic: Array<{ topicId: string; total: number; correct: number; accuracy: number; avgTimeMs: number }>;
  misconceptions: Array<{ tag: string; misses: number }>;
  nextTopics: string[];
  topicTitles: Record<string, string>;
};

type Data = {
  status: string;
  score: number;
  accuracy: number;
  lateSubmit: boolean;
  analysis: Analysis;
  review: ReviewItem[];
};

/** M4 result + deterministic analysis: score, per-topic table, misconceptions, next actions. */
export default function ExamResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [practicing, setPracticing] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/exams/attempt/${attemptId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
        if (d.status !== "submitted" || !d.analysis) throw new Error("الامتحان لم يُسلَّم بعد.");
        if (live) setData(d);
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [attemptId]);

  /** "Practice similar": start a practice session on the weakest topic (M4 CTA). */
  async function practiceWeakest() {
    const topicId = data?.analysis.nextTopics[0];
    if (!topicId) return;
    setPracticing(true);
    setError("");
    try {
      const r = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId, count: 10, clientAttemptId: crypto.randomUUID() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر بدء التدريب.");
      router.push(`/practice/session/${d.attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر بدء التدريب.");
      setPracticing(false);
    }
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
        {error}
      </p>
    );
  }
  if (!data) {
    return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحليل النتيجة…</p>;
  }
  const a = data.analysis;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-5 text-center">
        <p className="text-sm text-ink-mute">نتيجة الامتحان</p>
        <a
          href={`/api/export/exam/${attemptId}`}
          download
          className="mt-1 inline-flex min-h-9 items-center rounded-lg border border-brand-accent px-3 py-1 text-sm font-bold text-brand-strong hover:bg-brand-tint"
        >
          تصدير PDF
        </a>
        <p className="tnum mt-1 text-3xl font-bold text-ink">
          {a.score} / {a.total}
        </p>
        <p className="tnum mt-1 text-sm font-bold text-brand-strong">الدقة {a.accuracy}%</p>
        {data.lateSubmit && (
          <p className="mt-1 text-xs text-ink-mute">سُلِّم بعد انتهاء الوقت — احتُسب ما أُجيب.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-bold text-ink">الأداء حسب الموضوع</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {a.perTopic.map((t) => (
            <li key={t.topicId} className="rounded-xl bg-base p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{a.topicTitles[t.topicId] ?? "موضوع"}</span>
                <span className={`tnum font-bold ${t.accuracy < 50 ? "text-bad" : t.accuracy < 70 ? "text-gold-accent" : "text-ok"}`}>
                  {t.accuracy}%
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-label={`دقة ${a.topicTitles[t.topicId] ?? "موضوع"}`}
                aria-valuenow={t.accuracy}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${t.accuracy}%` }} />
              </div>
              <p className="tnum mt-1 text-[11px] text-ink-mute">
                {t.correct}/{t.total} صح • متوسط {Math.round(t.avgTimeMs / 1000)} ث/سؤال
              </p>
            </li>
          ))}
        </ul>
      </section>

      {a.misconceptions.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">أشهر الأفكار اللي وقعت فيها</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.misconceptions.map((m) => (
              <span key={m.tag} className="tnum rounded-full bg-danger-bg px-3 py-1 text-xs font-medium text-bad">
                {m.tag} ×{m.misses}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-brand-accent bg-brand-tint p-4">
        <h2 className="text-sm font-bold text-brand-strong">خطوتك الجاية</h2>
        <div className="mt-2 flex flex-col gap-2">
          {a.nextTopics.length > 0 ? (
            <button
              onClick={practiceWeakest}
              disabled={practicing}
              className="rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {practicing ? "جارٍ التجهيز…" : `تدرب على أضعف نقطة: ${a.topicTitles[a.nextTopics[0]] ?? ""} (10 أسئلة)`}
            </button>
          ) : (
            <p className="text-sm text-brand-strong">أداء مثالي — حافظ على المستوى بمراجعة دورية.</p>
          )}
          <Link href="/exams" className="rounded-lg border border-brand-accent py-2.5 text-center text-sm font-bold text-brand-strong">
            امتحان آخر
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ink">مراجعة الأسئلة</h2>
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
            <p className="mt-2 rounded-lg bg-base p-2.5 text-sm leading-relaxed text-ink-soft">
              {r.explanationMD}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
