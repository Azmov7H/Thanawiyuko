"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { XpProgress } from "@/components/XpProgress";
import { StreakWidget } from "@/components/StreakWidget";
import { AchievementGallery } from "@/components/AchievementGallery";

/** M7 dashboard: gamification widgets + plan + progress */
export default function DashboardPage() {
  const [stale, setStale] = useState(false);

  const progress = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const r = await fetch("/api/progress");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as {
        xp: { total: number; today: number; level: number };
        streak: { current: number; longest: number };
        subjects: Array<{ subjectId: string; nameAr: string; mastery: number; topics: number }>;
        weakTopics: Array<{ topicId: string; topicTitleAr: string | null; subjectNameAr: string | null; masteryScore: number; n: number }>;
        readiness: number;
        next: Array<{ type: string; reason: string; href: string; qCount?: number }>;
        mistakesDue: number;
        plan: Array<{ topicId: string; subjectId: string; action: string; minutes: number; reason: string; qCount?: number }>;
        upgradeRequired?: boolean;
      };
    },
  });

  useEffect(() => {
    const t = setInterval(() => setStale((s) => !s), 30_000);
    return () => clearInterval(t);
  }, []);

  if (progress.isPending) return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل لوحتك…</p>;
  if (progress.isError) return <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">تعذر تحميل اللوحة.</p>;
  const d = progress.data!;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">لوحتك اليوم</h1>
          {stale && <span className="text-xs text-ink-mute">محدث قبل ثوانٍ</span>}
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <XpProgress />
          <StreakWidget />
          <AchievementGallery />
        </div>
      </section>

      {d.next.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">التالي المقترح</h2>
            <span className="tnum text-xs text-ink-mute">الاستعداد {d.readiness}%</span>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {d.next.map((r, i) => (
              <li key={`${r.type}-${i}`}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-base p-3 text-sm"
                >
                  <span className="text-ink-soft">{r.reason}</span>
                  {r.qCount && <span className="tnum shrink-0 text-xs text-brand-strong">{r.qCount} سؤال</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.plan.length > 0 && (
        <section className="rounded-2xl border border-brand-soft bg-brand-tint p-4">
          <h2 className="font-bold text-brand-strong">خطتك اليوم</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {d.plan.slice(0, 4).map((p, i) => (
              <Link key={`${i}-${p.topicId}`} href={`/subjects/${p.subjectId}`} className="flex items-center justify-between rounded-lg border border-brand-soft bg-surface p-3 text-sm">
                <div>
                  <span className="font-medium text-ink">{p.action === "review" ? "مراجعة" : p.action === "lesson" ? "درس" : "تدريب"} — {p.minutes} د</span>
                  <p className="mt-0.5 text-xs text-ink-mute">{p.reason}</p>
                </div>
                <span className="tnum text-xs text-brand-strong">{p.qCount ?? "?"} سؤال</span>
              </Link>
            ))}
          </ul>
          {d.upgradeRequired && (
            <p className="mt-2 text-xs text-ink-mute">
              الخطة الكاملة متاحة لمشتركي بلس —{" "}
              <Link href="/subscription" className="font-bold text-brand-strong underline">
                اعرف المزيد
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {d.subjects.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-bold text-ink">المواد</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {d.subjects.map((s) => (
              <li key={s.subjectId} className="flex items-center justify-between rounded-lg border border-line bg-base p-3">
                <div>
                  <p className="font-medium text-ink">{s.nameAr}</p>
                  <p className="tnum text-xs text-ink-mute">{s.topics} موضوع</p>
                </div>
                <div className="text-end">
                  <div className={`tnum text-lg font-bold ${s.mastery < 50 ? "text-bad" : s.mastery < 70 ? "text-gold-accent" : "text-ok"}`}>{s.mastery}%</div>
                  <div className="text-xs text-ink-mute">إتقان</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.weakTopics.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-bold text-ink">نقاط تحتاج تركيز</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {d.weakTopics.slice(0, 3).map((w) => (
              <li key={w.topicId} className="flex items-center justify-between gap-3 rounded-lg border border-bad/20 bg-danger-bg p-2 text-sm">
                <span className="text-ink">{w.topicTitleAr ?? "موضوع"}</span>
                <span className="flex items-center gap-2">
                  {w.subjectNameAr && <span className="text-ink-mute">{w.subjectNameAr}</span>}
                  <span className="tnum shrink-0 font-bold text-bad">{w.masteryScore}%</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-mute">+{d.weakTopics.length - 3} أخرى — راجع التبويب «التقدم» للتفاصيل.</p>
        </section>
      )}

      {d.mistakesDue > 0 && (
        <section className="rounded-2xl border border-warn-line bg-warn-bg p-3">
          <p className="font-bold text-gold-accent">لديك {d.mistakesDue} مراجعة مستحقة — لا تدعها تتراكم.</p>
          <Link href="/mistakes" className="mt-1 inline-block rounded-lg bg-gold-600 px-3 py-1.5 text-sm font-bold text-white">
            ابدأ المراجعة
          </Link>
        </section>
      )}
    </div>
  );
}