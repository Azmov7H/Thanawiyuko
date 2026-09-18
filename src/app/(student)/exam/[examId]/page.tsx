"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";

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

const RULES = [
  "المؤقت محسوب من السيرفر — إغلاق الصفحة لا يوقف الوقت.",
  "إجاباتك تُحفظ تلقائيًا كل 20 ثانية.",
  "لا يوجد تصحيح فوري أثناء الامتحان — النتيجة والشرح بعد التسليم.",
  "عند انتهاء الوقت يُسلَّم الامتحان تلقائيًا بما أجبت.",
];

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Button href="/exams" variant="ghost" className="self-start" iconPosition="end">
        كل الامتحانات
      </Button>

      {brief.isPending && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48" />
        </div>
      )}

      {brief.isError && <ErrorState title="تعذر تحميل الامتحان." onRetry={() => brief.refetch()} />}

      {e && (
        <>
          <section className="animate-rise rounded-2xl border border-line bg-surface p-6 md:p-7">
            <h1 className="text-2xl font-bold text-ink">{e.titleAr}</h1>
            {e.description && <p className="mt-1 text-sm text-ink-mute">{e.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-base px-3 py-1.5 text-xs font-bold text-ink-soft">
                <Icon name="exams" size={14} /> {e.totalQ} سؤال
              </span>
              <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-base px-3 py-1.5 text-xs font-bold text-ink-soft">
                <Icon name="clock" size={14} /> {e.durationMin} دقيقة
              </span>
              <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-base px-3 py-1.5 text-xs font-bold text-ink-soft">
                <Icon name="star" size={14} /> محاولات: {e.attemptsLeft} من {e.attemptsAllowed}
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-2 text-sm leading-relaxed text-ink-soft">
              {RULES.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-strong" />
                  {r}
                </li>
              ))}
            </ul>
          </section>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}

          {e.attemptsLeft > 0 ? (
            <Button onClick={start} disabled={busy} size="lg" icon="exams" className="w-full">
              {busy ? "جارٍ تجهيز الامتحان…" : "ابدأ الامتحان — يبدأ الوقت فورًا"}
            </Button>
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