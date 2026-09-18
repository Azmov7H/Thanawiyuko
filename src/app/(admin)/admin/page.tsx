"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Metric } from "@/components/ui/Metric";

const CARDS = [
  { label: "المواد", type: "subject" },
  { label: "الوحدات", type: "unit" },
  { label: "المواضيع", type: "topic" },
  { label: "الدروس", type: "lesson" },
  { label: "الأسئلة", type: "question" },
] as const;

type CountMap = Partial<Record<(typeof CARDS)[number]["type"], string>>;

async function fetchTotal(type: string): Promise<string | number> {
  const r = await fetch(`/api/admin/content?type=${type}&page=1`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
  return d.total ?? "—";
}

export default function AdminHome() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const pairs = await Promise.all(
        CARDS.map(async (c) => [c.type, await fetchTotal(c.type)] as const),
      );
      return Object.fromEntries(pairs) as CountMap;
    },
  });

  return (
    <div>
      <PageHeader
        title="نظرة عامة"
        description="مخزون المحتوى الحالي (جميع الحالات: مسودة/مراجعة/منشور/مؤرشف)."
      />
      {isError && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          تعذر تحميل الإحصاءات.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.type} className="rounded-2xl border border-line bg-surface p-4 text-center">
            <Metric
              label={c.label}
              value={isPending ? "…" : (data?.[c.type] ?? "—")}
              size="lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
