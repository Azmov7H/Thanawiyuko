"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Exam = {
  _id: string;
  titleAr: string;
  grade: string;
  track: string | null;
  durationMin: number;
  attemptsAllowed: number;
  blueprint: Array<{ topicId: string; count: number }>;
  status: string;
  version: number;
};

type Subject = { _id: string; code: string; nameAr: string };
type Topic = { _id: string; titleAr: string };

async function getJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok) throw new Error((d.details as string[] | undefined)?.join("، ") ?? d.messageAr ?? "خطأ.");
  return d;
}

const NEXT: Record<string, Array<{ to: string; label: string }>> = {
  draft: [{ to: "review", label: "إرسال للمراجعة" }],
  review: [
    { to: "published", label: "نشر" },
    { to: "draft", label: "إرجاع" },
  ],
  published: [{ to: "archived", label: "أرشفة" }],
  archived: [{ to: "draft", label: "إعادة فتح" }],
};

/** M4 admin exam builder: create draft + blueprint, then review → publish (gated). */
export default function AdminExamsPage() {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [duration, setDuration] = useState(60);
  const [rows, setRows] = useState<Array<{ topicId: string; title: string; count: number }>>([]);

  const exams = useQuery({
    queryKey: ["admin-exams"],
    queryFn: () => getJSON("/api/admin/exams") as Promise<{ exams: Exam[] }>,
  });
  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: () => getJSON("/api/admin/content?type=subject&page=1") as Promise<{ items: Subject[] }>,
  });
  const topics = useQuery({
    queryKey: ["admin-topics", subjectId],
    queryFn: () =>
      getJSON(`/api/admin/content?type=topic&subjectId=${subjectId}&page=1`) as Promise<{
        items: Topic[];
        total: number;
      }>,
    enabled: subjectId !== "",
  });

  const create = useMutation({
    mutationFn: () =>
      getJSON("/api/admin/exams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titleAr: title,
          grade: "sec3",
          track: null,
          subjectId: subjectId || null,
          durationMin: duration,
          attemptsAllowed: 2,
          blueprint: rows.map((r) => ({ topicId: r.topicId, count: r.count })),
        }),
      }),
    onSuccess: () => {
      setError("");
      setTitle("");
      setRows([]);
      client.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (e) => setError(e.message),
  });

  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      getJSON(`/api/admin/exams/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to }),
      }),
    onSuccess: () => {
      setError("");
      client.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (e) => setError(e.message),
  });

  function addRow(t: Topic) {
    setRows((r) =>
      r.some((x) => x.topicId === t._id) ? r : [...r, { topicId: t._id, title: t.titleAr, count: 5 }],
    );
  }

  const totalQ = rows.reduce((n, r) => n + r.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">الامتحانات التجريبية</h1>
      {(error || exams.isError) && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {error || "تعذر التحميل."}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-bold text-ink">امتحان جديد (مسودة)</h2>
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: امتحان فيزياء شامل — الحركة والكهربية"
            aria-label="عنوان الامتحان"
            className="rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink placeholder:text-ink-mute"
          />
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-ink-mute">
              المادة (اختياري)
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setRows([]);
                }}
                className="rounded-lg border border-line bg-base px-2 py-2 text-sm text-ink"
              >
                <option value="">شامل (كل المواد)</option>
                {subjects.data?.items.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-28 flex-col gap-1 text-xs text-ink-mute">
              المدة (دقيقة)
              <input
                type="number"
                min={5}
                max={240}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="tnum rounded-lg border border-line bg-base px-2 py-2 text-sm text-ink"
              />
            </label>
          </div>

          {subjectId !== "" && (
            <div className="rounded-xl bg-base p-3">
              <p className="text-xs font-bold text-ink-mute">أضف مواضيع للمخطط:</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topics.data?.items.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => addRow(t)}
                    className="min-h-11 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft"
                  >
                    + {t.titleAr}
                  </button>
                ))}
              </div>
              {rows.map((r) => (
                <div key={r.topicId} className="mt-2 flex items-center gap-2 text-sm">
                  <span className="flex-1 text-ink">{r.title}</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={r.count}
                    onChange={(e) =>
                      setRows((all) =>
                        all.map((x) => (x.topicId === r.topicId ? { ...x, count: Number(e.target.value) } : x)),
                      )
                    }
                    aria-label={`عدد أسئلة ${r.title}`}
                    className="tnum w-16 rounded-md border border-line bg-surface px-2 py-1 text-center text-ink"
                  />
                  <button
                    onClick={() => setRows((all) => all.filter((x) => x.topicId !== r.topicId))}
                    className="text-xs text-bad"
                    aria-label={`إزالة ${r.title}`}
                  >
                    حذف
                  </button>
                </div>
              ))}
              <p className="tnum mt-2 text-xs text-ink-mute">إجمالي الأسئلة: {totalQ}</p>
            </div>
          )}

          <button
            disabled={title.trim().length < 3 || rows.length === 0 || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {create.isPending ? "جارٍ الإنشاء…" : "إنشاء المسودة"}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        {exams.data?.exams.map((e) => (
          <div key={e._id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">{e.titleAr}</p>
                <p className="tnum mt-0.5 text-xs text-ink-mute">
                  {e.status} • إصدار {e.version} • {e.durationMin} د • {e.blueprint.reduce((n, r) => n + r.count, 0)} سؤال • {e.attemptsAllowed} محاولات
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {(NEXT[e.status] ?? []).map((n) => (
                  <button
                    key={n.to}
                    disabled={move.isPending}
                    onClick={() => move.mutate({ id: e._id, to: n.to })}
                    className="min-h-11 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        {exams.data?.exams.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
            لا امتحانات بعد — أنشئ أول مسودة بالأعلى.
          </p>
        )}
      </section>
    </div>
  );
}
