"use client";

import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";

interface GamificationData {
  xp: { total: number; today: number; level: number; nextLevelXp: number; prevLevelXp: number };
  streak: { current: number; longest: number };
  achievements: Array<{ code: string; titleAr: string; descriptionAr: string; icon: string; unlockedAt: string }>;
}

/** XP total + level + progress toward next — a calm supporting metric. */
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

  if (isPending)
    return <div aria-hidden className="h-28 animate-pulse rounded-2xl bg-surface" />;
  if (isError)
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-line bg-surface text-sm text-ink-mute">
        تعذر تحميل XP.
      </div>
    );

  const { xp } = data!;
  const span = Math.max(1, xp.nextLevelXp - xp.prevLevelXp);
  const progress = xp.total > 0 ? Math.min(100, Math.max(0, ((xp.total - xp.prevLevelXp) / span) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="نقاط الخبرة">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-strong">
          <Icon name="bolt" size={18} />
          <h3 className="text-sm font-medium text-ink-mute">نقاط الخبرة</h3>
        </div>
        <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand-strong">
          مستوى {xp.level}
        </span>
      </div>
      <p className="tnum mt-3 text-3xl font-bold text-ink">{xp.total}</p>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={`التقدم نحو المستوى ${xp.level + 1}`}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="tnum mt-2 text-xs text-ink-mute">
        +{xp.today} اليوم • {Math.round(progress)}% للمستوى الجاي
      </p>
    </section>
  );
}