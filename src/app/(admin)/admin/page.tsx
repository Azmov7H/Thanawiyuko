"use client";

import { useQuery } from "@tanstack/react-query";

const CARDS = [
  { label: "المواد", type: "subject" },
  { label: "الوحدات", type: "unit" },
  { label: "المواضيع", type: "topic" },
  { label: "الدروس", type: "lesson" },
  { label: "الأسئلة", type: "question" },
];

async function fetchTotal(type: string): Promise<number> {
  const r = await fetch(`/api/admin/content?type=${type}&page=1`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
  return d.total ?? 0;
}

export default function AdminHome() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const pairs = await Promise.all(
        CARDS.map(async (c) => [c.type, await fetchTotal(c.type)] as const),
      );
      return Object.fromEntries(pairs) as Record<string, number>;
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">نظرة عامة</h1>
      <p className="mt-1 text-sm text-ink-mute">
        مخزون المحتوى الحالي (جميع الحالات: مسودة/مراجعة/منشور/مؤرشف).
      </p>
      {isError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          تعذر تحميل الإحصاءات.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.type} className="rounded-2xl border border-line bg-surface p-4 text-center">
            <div className="tnum text-2xl font-bold text-ink">
              {isPending ? "…" : (data?.[c.type] ?? "—")}
            </div>
            <div className="mt-1 text-xs text-ink-mute">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
