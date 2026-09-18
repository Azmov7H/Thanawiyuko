"use client";

import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";

/** Streak — calm at-risk wording, no alarm. */
export function StreakWidget() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const r = await fetch("/api/gamification");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { streak: { current: number; longest: number } };
    },
  });

  if (isPending)
    return <div aria-hidden className="h-28 animate-pulse rounded-2xl bg-surface" />;
  if (isError)
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-line bg-surface text-sm text-ink-mute">
        تعذر تحميل السلسلة.
      </div>
    );

  const { streak } = data!;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="سلسلة المواظبة">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gold-accent">
          <Icon name="flame" size={18} />
          <h3 className="text-sm font-medium text-ink-mute">يوم متتابع</h3>
        </div>
        <span className="tnum rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-bold text-gold-accent">
          الأطول {streak.longest}
        </span>
      </div>
      <p className="tnum mt-3 text-3xl font-bold text-ink">{streak.current}</p>
      <p className="mt-2 text-xs text-ink-mute">
        {streak.current > 0
          ? "متقطع؟ يوم واحد بيوقّف السلسلة — لحق نفسك."
          : "ابدأ اليوم بيتبني سلسلتك."}
      </p>
    </section>
  );
}