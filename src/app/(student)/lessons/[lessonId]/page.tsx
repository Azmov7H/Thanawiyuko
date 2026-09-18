"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";

type LessonData = {
  lesson: {
    id: string;
    titleAr: string;
    bodyMD: string;
    diagrams: string[];
    videoUrl: string | null;
    readingMinutes: number;
    order: number;
  };
  topic: { id: string; titleAr: string } | null;
  subject: { id: string; nameAr: string } | null;
  prev: { id: string; titleAr: string } | null;
  next: { id: string; titleAr: string } | null;
};

/** M3 lesson reader (text-first) with completion logging (§4.3). */
export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    params.then((p) => setLessonId(p.lessonId));
  }, [params]);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [lessonId]);

  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    enabled: Boolean(lessonId),
    queryFn: async () => {
      const r = await fetch(`/api/lessons/${lessonId}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as LessonData;
    },
  });

  const complete = useMutation({
    mutationFn: async () => {
      const minutes = Math.max(1, Math.round((Date.now() - (startedAt.current ?? Date.now())) / 60000));
      const r = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التسجيل.");
      return d as { ok: boolean };
    },
    onSuccess: () => setDone(true),
  });

  if (lesson.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (lesson.isError) {
    return <ErrorState title="تعذر تحميل الدرس." onRetry={() => lesson.refetch()} />;
  }
  const { lesson: l, topic, subject, prev, next } = lesson.data!;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="مسار الدرس" className="flex flex-wrap items-center gap-1 text-xs text-ink-mute">
        {subject && <span>{subject.nameAr}</span>}
        {topic && (
          <>
            <Icon name="arrow-prev" size={12} aria-hidden />
            <span className="font-medium text-ink-soft">{topic.titleAr}</span>
          </>
        )}
      </nav>

      <article className="rounded-2xl border border-line bg-surface p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-ink">{l.titleAr}</h1>
          <span className="tnum rounded-full bg-base px-2.5 py-1 text-xs text-ink-mute">
            {l.readingMinutes} دقائق قراءة
          </span>
        </div>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft prose-rtl">{l.bodyMD}</div>

        {l.diagrams.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {l.diagrams.map((src, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={src}
                src={src}
                alt={`شكل توضيحي ${i + 1} لدرس ${l.titleAr}`}
                className="w-full rounded-xl border border-line"
              />
            ))}
          </div>
        )}

        {l.videoUrl && (
          <a
            href={l.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-brand-accent px-4 py-2 text-sm font-bold text-brand-strong transition-colors hover:bg-brand-tint"
          >
            <Icon name="play" size={16} aria-hidden />
            شاهد الفيديو التوضيحي
          </a>
        )}
      </article>

      {complete.isError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          تعذر تسجيل إتمام الدرس.
        </p>
      )}

      <Button
        onClick={() => complete.mutate()}
        disabled={complete.isPending || done}
        type="button"
        icon={done ? "check" : undefined}
        className="w-full"
      >
        {done ? "تم تسجيل إتمام الدرس" : complete.isPending ? "جارٍ التسجيل…" : "علّم الدرس كمكتمل"}
      </Button>

      {topic && subject && (
        <Button href={`/subjects/${subject.id}`} variant="ghost" icon="practice" className="w-full">
          تدرب على أسئلة «{topic.titleAr}»
        </Button>
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        {prev ? (
          <Button href={`/lessons/${prev.id}`} variant="ghost" className="justify-start">
            <span className="text-base leading-none">→</span> {prev.titleAr}
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button href={`/lessons/${next.id}`} variant="ghost" iconPosition="end" className="justify-end">
            {next.titleAr} <span className="text-base leading-none">←</span>
          </Button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
