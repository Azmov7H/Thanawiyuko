"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

type Briefing = {
  exam: {
    id: string;
    titleAr: string;
    description: string | null;
    durationMin: number;
    totalQ: number;
    attemptsAllowed: number;
    attemptsLeft: number;
  };
};

/** M4 pre-exam briefing: rules + honest attempt count, then start. */
export default function ExamBriefingPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const brief = useQuery({
    queryKey: ["exam-brief", examId],
    queryFn: async () => {
      const r = await fetch(`/api/exams/${examId}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as Briefing;
    },
  });

  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/exams/${examId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientAttemptId: crypto.randomUUID() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر البدء.");
      router.push(`/exam/take/${d.attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر البدء.");
      setBusy(false);
    }
  }

  const e = brief.data?.exam;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/exams" className="text-sm text-ink-mute">
        → كل الامتحانات
      </Link>
      {brief.isPending && <p className="text-sm text-ink-mute">جارٍ التحميل…</p>}
      {brief.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          تعذر تحميل الامتحان.
        </p>
      )}
      {e && (
        <>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h1 className="text-xl font-bold text-ink">{e.titleAr}</h1>
            <p className="tnum mt-2 text-sm text-ink-mute">
              {e.totalQ} سؤال • {e.durationMin} دقيقة • المحاولات المتبقية: {e.attemptsLeft} من {e.attemptsAllowed}
            </p>
            <ul className="mt-4 flex flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
              <li>• المؤقت محسوب من السيرفر — إغلاق الصفحة لا يوقف الوقت.</li>
              <li>• إجاباتك تُحفظ تلقائيًا كل 20 ثانية.</li>
              <li>• لا يوجد تصحيح فوري أثناء الامتحان — النتيجة والشرح بعد التسليم.</li>
              <li>• عند انتهاء الوقت يُسلَّم الامتحان تلقائيًا بما أجبت.</li>
            </ul>
          </section>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}
          {e.attemptsLeft > 0 ? (
            <button
              onClick={start}
              disabled={busy}
              className="rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
            >
              {busy ? "جارٍ تجهيز الامتحان…" : "ابدأ الامتحان — يبدأ الوقت فورًا"}
            </button>
          ) : (
            <p className="rounded-lg bg-base py-3 text-center text-sm text-ink-mute">
              استنفدت محاولات هذا الامتحان
            </p>
          )}
        </>
      )}
    </div>
  );
}
