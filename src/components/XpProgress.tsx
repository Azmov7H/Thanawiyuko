"use client";

import { useQuery } from "@tanstack/react-query";

interface GamificationData {
  xp: { total: number; today: number; level: number; nextLevelXp: number; prevLevelXp: number };
  streak: { current: number; longest: number };
  achievements: Array<{ code: string; titleAr: string; descriptionAr: string; icon: string; unlockedAt: string }>;
}

/** XP progress ring + level badge */
export function XpProgress() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const r = await fetch("/api/gamification");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as GamificationData;
    },
  });

  if (isPending) return <div className="rounded-xl border border-line bg-surface p-4 animate-pulse h-24" />;
  if (isError) return <div className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-mute">تعذر تحميل XP.</div>;

  const { xp } = data!;
  const span = Math.max(1, xp.nextLevelXp - xp.prevLevelXp);
  const progress = xp.total > 0 ? Math.min(100, Math.max(0, ((xp.total - xp.prevLevelXp) / span) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink">XP الكلي</p>
          <p className="tnum mt-0.5 text-2xl font-bold text-brand-strong">{xp.total}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-ink">مستوى {xp.level}</p>
          <p className="tnum text-xs text-ink-mute">المستوى الجاي: {xp.nextLevelXp} XP</p>
        </div>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={`التقدم نحو المستوى ${xp.level + 1}`}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="tnum mt-1 text-xs text-ink-mute">اليوم: +{xp.today} XP • السقف اليومي 600</p>
    </section>
  );
}