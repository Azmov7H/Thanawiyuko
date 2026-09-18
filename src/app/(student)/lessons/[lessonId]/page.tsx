"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

  if (lesson.isPending) return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل الدرس…</p>;
  if (lesson.isError) {
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
        تعذر تحميل الدرس.
      </p>
    );
  }
  const { lesson: l, topic, subject, prev, next } = lesson.data!;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-ink-mute">
        {subject && <span>{subject.nameAr} • </span>}
        {topic && <span>{topic.titleAr} • </span>}
        <span className="tnum">{l.readingMinutes} دقائق قراءة</span>
      </div>

      <article className="rounded-2xl border border-line bg-surface p-4">
        <h1 className="text-xl font-bold text-ink">{l.titleAr}</h1>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{l.bodyMD}</div>

        {l.diagrams.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {l.diagrams.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
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
            className="mt-4 inline-block rounded-lg border border-brand-accent px-4 py-2 text-sm font-bold text-brand-strong"
          >
            شاهد الفيديو التوضيحي
          </a>
        )}
      </article>

      {complete.isError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          تعذر تسجيل إتمام الدرس.
        </p>
      )}

      <button
        type="button"
        onClick={() => complete.mutate()}
        disabled={complete.isPending || done}
        className="rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
      >
        {done ? "تم تسجيل إتمام الدرس ✓" : complete.isPending ? "جارٍ التسجيل…" : "علّم الدرس كمكتمل"}
      </button>

      {topic && subject && (
        <Link
          href={`/subjects/${subject.id}`}
          className="text-center text-sm text-brand-strong"
        >
          تدرب على أسئلة «{topic.titleAr}»
        </Link>
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        {prev ? (
          <Link href={`/lessons/${prev.id}`} className="text-brand-strong">
            ← {prev.titleAr}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/lessons/${next.id}`} className="text-brand-strong">
            {next.titleAr} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
