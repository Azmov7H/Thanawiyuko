"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { XpProgress } from "@/components/XpProgress";
import { StreakWidget } from "@/components/StreakWidget";
import { AchievementGallery } from "@/components/AchievementGallery";

type ProgressData = {
  xp: { total: number; today: number; level: number };
  streak: { current: number; longest: number };
  subjects: Array<{ subjectId: string; nameAr: string; mastery: number; topics: number }>;
  weakTopics: Array<{ topicId: string; masteryScore: number; n: number }>;
  mistakesDue: number;
  plan: Array<{ topicId: string; subjectId: string; action: string; minutes: number; reason: string; qCount?: number }>;
};

/** M7 progress tab: mastery, weak topics, and due reviews. */
export default function ProgressPage() {
  const progress = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const r = await fetch("/api/progress");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as ProgressData;
    },
  });

  if (progress.isPending) return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل تقدمك…</p>;
  if (progress.isError) {
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
        تعذر تحميل التقدم.
      </p>
    );
  }
  const d = progress.data!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">تقدمك</h1>
        <a
          href="/api/export/progress"
          download
          className="inline-flex min-h-9 items-center rounded-lg border border-brand-accent px-3 py-1 text-sm font-bold text-brand-strong hover:bg-brand-tint"
        >
          تصدير PDF
        </a>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <XpProgress />
        <StreakWidget />
        <AchievementGallery />
      </section>

      {d.subjects.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-bold text-ink">الإتقان حسب المادة</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {d.subjects.map((s) => {
              const color = s.mastery < 50 ? "bg-bad" : s.mastery < 70 ? "bg-gold-600" : "bg-ok";
              return (
                <li key={s.subjectId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{s.nameAr}</span>
                    <span className="tnum text-ink-mute">
                      {s.mastery}% • {s.topics} موضوع
                    </span>
                  </div>
                  <div
                    className="mt-1 h-2 w-full overflow-hidden rounded-full bg-base"
                    role="progressbar"
                    aria-label={`إتقان ${s.nameAr}`}
                    aria-valuenow={s.mastery}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full ${color}`} style={{ width: `${s.mastery}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {d.weakTopics.length > 0 && (
        <section className="rounded-2xl border border-bad/20 bg-danger-bg p-4">
          <h2 className="font-bold text-bad">نقاط تحتاج تركيز</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {d.weakTopics.map((w) => (
              <li key={w.topicId} className="tnum flex items-center justify-between rounded-lg bg-surface p-2 text-sm">
                <span className="font-bold text-bad">{w.masteryScore}%</span>
                <span className="text-ink-mute">من {w.n} إجابة</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.mistakesDue > 0 && (
        <section className="rounded-2xl border border-warn-line bg-warn-bg p-3">
          <p className="font-bold text-gold-accent">لديك {d.mistakesDue} مراجعة مستحقة.</p>
          <Link
            href="/mistakes"
            className="mt-1 inline-block rounded-lg bg-gold-600 px-3 py-1.5 text-sm font-bold text-white"
          >
            ابدأ المراجعة
          </Link>
        </section>
      )}
    </div>
  );
}
