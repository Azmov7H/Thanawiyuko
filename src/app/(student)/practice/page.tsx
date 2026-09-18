"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

type Subject = { id: string; code: string; nameAr: string };
type Topic = { id: string; titleAr: string; questionCount: number };
type Unit = { id: string; titleAr: string; topics: Topic[] };

async function getJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
  return d;
}

/** M3 picker: subject → topic (or whole subject) + count → start attempt. */
export default function PracticePickerPage() {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => getJSON("/api/subjects") as Promise<{ subjects: Subject[] }>,
  });
  const tree = useQuery({
    queryKey: ["subject-tree", subjectId],
    queryFn: () =>
      getJSON(`/api/subjects/${subjectId}`) as Promise<{
        subject: Subject;
        units: Unit[];
      }>,
    enabled: subjectId !== "",
  });

  async function start() {
    setBusy(true);
    setError("");
    try {
      const d = (await getJSON("/api/practice/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subjectId: topicId ? undefined : subjectId,
          topicId: topicId ?? undefined,
          count,
          clientAttemptId: crypto.randomUUID(),
        }),
      })) as { attemptId: string };
      router.push(`/practice/session/${d.attemptId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر بدء الجلسة.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="إجابة بإجابة"
        title="جلسة تدريب جديدة"
        description="اختر مادة وعدد أسئلة — وهنتقفل فورًا على أي إجابة غلط."
      />

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-bold text-ink">1. اختر المادة</h2>
        {subjects.isPending && <Skeleton className="mt-3 h-12" />}
        {subjects.isError && (
          <p className="mt-2 text-sm text-bad">تعذر تحميل المواد. تأكد من إتمام التوجيه.</p>
        )}
        <div className="mt-2 grid gap-2">
          {subjects.data?.subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSubjectId(s.id);
                setTopicId(null);
              }}
              aria-pressed={subjectId === s.id}
              className={`rounded-lg border px-4 py-2.5 text-start text-sm font-medium ${
                subjectId === s.id
                  ? "border-brand-accent bg-brand-tint text-brand-strong"
                  : "border-line text-ink-soft"
              }`}
            >
              {s.nameAr}
            </button>
          ))}
          {subjects.data?.subjects.length === 0 && (
            <p className="text-sm text-ink-mute">لا مواد منشورة لصفك بعد — قريبًا.</p>
          )}
        </div>
      </section>

      {subjectId !== "" && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">2. اختر موضوعًا (أو المادة كلها)</h2>
          {tree.isPending && <Skeleton className="mt-3 h-12" />}
          {tree.isError && (
            <p role="alert" className="mt-2 text-sm text-bad">
              تعذر تحميل المواضيع — جرّب بعد قليل.
            </p>
          )}
          {tree.data?.units.length === 0 && !tree.isPending && !tree.isError && (
            <p className="mt-2 text-sm text-ink-mute">لا مواضيع منشورة لهذه المادة بعد.</p>
          )}
          <div className="mt-2 flex flex-col gap-3">
            <button
              onClick={() => setTopicId(null)}
              aria-pressed={topicId === null}
              className={`rounded-lg border px-4 py-2.5 text-start text-sm font-medium ${
                topicId === null
                  ? "border-brand-accent bg-brand-tint text-brand-strong"
                  : "border-line text-ink-soft"
              }`}
            >
              mix شامل — أسئلة من المادة كلها
            </button>
            {tree.data?.units.map((u) => (
              <div key={u.id}>
                <p className="mb-1 text-xs font-bold text-ink-mute">{u.titleAr}</p>
                <div className="grid gap-1.5">
                  {u.topics.map((t) => (
                    <button
                      key={t.id}
                      disabled={t.questionCount === 0}
                      onClick={() => setTopicId(t.id)}
                      aria-pressed={topicId === t.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-2 text-start text-sm ${
                        topicId === t.id
                          ? "border-brand-accent bg-brand-tint font-bold text-brand-strong"
                          : "border-line text-ink-soft disabled:opacity-50"
                      }`}
                    >
                      <span>{t.titleAr}</span>
                      <span className="tnum text-xs text-ink-mute">{t.questionCount} سؤال</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {subjectId !== "" && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">3. عدد الأسئلة</h2>
          <div className="mt-2 flex gap-2">
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={`tnum flex-1 rounded-lg border py-2 text-sm font-bold ${
                  count === n
                    ? "border-brand-accent bg-brand-tint text-brand-strong"
                    : "border-line text-ink-soft"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      {subjectId !== "" && (
        <Button onClick={start} disabled={busy} size="lg" icon="practice" className="w-full">
          {busy ? "جارٍ تجهيز الأسئلة…" : "ابدأ الجلسة"}
        </Button>
      )}
    </div>
  );
}
