"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

type Tree = {
  subject: { id: string; code: string; nameAr: string };
  units: Array<{
    id: string;
    titleAr: string;
    topics: Array<{ id: string; titleAr: string; questionCount: number }>;
  }>;
};

/** Subject browse → pick a topic → start a practice session. */
export default function SubjectPage() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = params.subjectId;
  const router = useRouter();

  const tree = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const r = await fetch(`/api/subjects/${subjectId}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as Tree;
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

  if (tree.isPending) return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل المادة…</p>;
  if (tree.isError) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
        تعذر تحميل المادة.
      </p>
    );
  }
  const { subject, units } = tree.data!;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-ink">{subject.nameAr}</h1>

      {start.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {start.error instanceof Error ? start.error.message : "تعذر بدء التدريب."}
        </p>
      )}

      {units.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
          لا وحدات منشورة لهذه المادة بعد.
        </p>
      )}

      {units.map((u) => (
        <section key={u.id} className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-bold text-ink">{u.titleAr}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {u.topics.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-base p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{t.titleAr}</p>
                  <p className="tnum text-xs text-ink-mute">{t.questionCount} سؤال</p>
                </div>
                <button
                  type="button"
                  onClick={() => start.mutate(t.id)}
                  disabled={start.isPending || t.questionCount < 3}
                  className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {t.questionCount < 3 ? "قريبًا" : "تدرب"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
