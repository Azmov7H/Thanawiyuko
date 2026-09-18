"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";

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

  if (list.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (list.isError) {
    return <ErrorState title="تعذر تحميل الأخطاء." onRetry={() => list.refetch()} />;
  }

  const items = list.data!.items;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="تعلم من أخطائك"
        title="مكتبة الأخطاء"
        description={all
          ? "كل أخطائك التي راجعتها — حلّها مرة تانية وتأكد إنك فاهمها."
          : "الأخطاء المستحقة للمراجعة اليوم — حل واصلح قبل ما تنسى."}
        actions={
          <div className="flex items-center gap-2">
            <Button href="/api/export/mistakes" download icon="download" variant="secondary" ariaLabel="تصدير تقرير PDF">
              تصدير PDF
            </Button>
            <Button onClick={() => setAll((v) => !v)} variant="ghost" iconPosition="end">
              {all ? "المستحقة فقط" : "كل الأخطاء"}
            </Button>
          </div>
        }
      />

      {start.isError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {start.error instanceof Error ? start.error.message : "تعذر بدء التدريب."}
        </p>
      )}

      {items.length === 0 && (
        <EmptyState
          icon="mistakes"
          title={all ? "مكتبة الأخطاء فاضية" : "ولا خطأ مستحق اليوم"}
          body={all ? "لما تخطأ هتلاقي أخطاءك هنا للمراجعة." : "لا شيء مستحق اليوم — راجع صفحة كل الأخطاء وقت ما تحب."}
          action={
            !all ? (
              <Button onClick={() => setAll(true)} variant="secondary">
                عرض كل الأخطاء
              </Button>
            ) : undefined
          }
        />
      )}

      {items.map((m) => (
        <article key={m.id} className="animate-rise rounded-2xl border border-line bg-surface p-4">
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
                      ? "border-ok bg-success-bg font-bold text-ink"
                      : isWrongChosen
                        ? "border-bad bg-danger-bg text-ink"
                        : "border-line text-ink-soft"
                  }`}
                  dir="rtl"
                >
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-base text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{o.text}</span>
                  {isRight && (
                    <span className="ms-auto flex items-center gap-1 text-xs font-bold text-ok">
                      <Icon name="check" size={14} /> الصحيحة
                    </span>
                  )}
                  {isWrongChosen && (
                    <span className="ms-auto flex items-center gap-1 text-xs font-bold text-bad">
                      <Icon name="x" size={14} /> اختيارك
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {m.explanationMD && (
            <p className="mt-3 rounded-xl bg-success-bg p-3 text-sm leading-relaxed text-ink">
              {m.explanationMD}
            </p>
          )}
          <Button
            onClick={() => start.mutate(m.topicId)}
            disabled={start.isPending}
            className="mt-3 w-full"
            icon="practice"
          >
            {start.isPending ? "جارٍ البدء…" : "تدرب على هذا الموضوع"}
          </Button>
        </article>
      ))}
    </div>
  );
}