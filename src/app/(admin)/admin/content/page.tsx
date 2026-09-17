"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const TYPES = [
  { value: "question", label: "الأسئلة" },
  { value: "lesson", label: "الدروس" },
  { value: "topic", label: "المواضيع" },
  { value: "unit", label: "الوحدات" },
  { value: "subject", label: "المواد" },
];

const STATUSES = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "review", label: "قيد المراجعة" },
  { value: "published", label: "منشور" },
  { value: "archived", label: "مؤرشف" },
];

const NEXT: Record<string, Array<{ to: string; label: string }>> = {
  draft: [{ to: "review", label: "إرسال للمراجعة" }],
  review: [
    { to: "published", label: "نشر" },
    { to: "draft", label: "إرجاع للمسودة" },
  ],
  published: [{ to: "archived", label: "أرشفة" }],
  archived: [{ to: "draft", label: "إعادة فتح كمسودة" }],
};

type Item = {
  _id: string;
  titleAr?: string;
  nameAr?: string;
  stemMD?: string;
  status: string;
  version: number;
};

function titleOf(i: Item): string {
  return i.titleAr ?? i.nameAr ?? (i.stemMD ? i.stemMD.slice(0, 80) + "…" : i._id);
}

export default function AdminContentPage() {
  const [type, setType] = useState("question");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();

  const list = useQuery({
    queryKey: ["admin-content", type, status],
    queryFn: async () => {
      const q = new URLSearchParams({ type, page: "1" });
      if (status) q.set("status", status);
      const r = await fetch(`/api/admin/content?${q}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { items: Item[]; total: number };
    },
  });

  const transition = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: string }) => {
      const r = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, id, action: "transition", to }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر تنفيذ الإجراء.");
      return d;
    },
    onSuccess: () => {
      setError("");
      client.invalidateQueries({ queryKey: ["admin-content", type, status] });
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">إدارة المحتوى</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            aria-pressed={type === t.value}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              type === t.value
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-line text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="mx-1 inline-block w-px bg-line" aria-hidden="true" />
        {STATUSES.map((s) => (
          <button
            key={s.value || "all"}
            onClick={() => setStatus(s.value)}
            aria-pressed={status === s.value}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              status === s.value
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-line text-ink-mute"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink-mute">
        الإجمالي: <span className="tnum">{list.data?.total ?? "…"}</span>
      </p>
      {(error || list.isError) && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {error || "تعذر التحميل."}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {list.data?.items.map((i) => (
          <li key={i._id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{titleOf(i)}</p>
                <p className="tnum mt-1 text-xs text-ink-mute">
                  {i.status} • إصدار {i.version}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {(NEXT[i.status] ?? []).map((n) => (
                  <button
                    key={n.to}
                    disabled={transition.isPending}
                    onClick={() => transition.mutate({ id: i._id, to: n.to })}
                    className="min-h-11 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
        {list.data && list.data.items.length === 0 && (
          <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
            لا عناصر هنا بعد. شغّل الـ seed ثم راجع العناصر كمسودات.
          </li>
        )}
      </ul>
    </div>
  );
}
