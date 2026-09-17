"use client";

import { useQuery } from "@tanstack/react-query";

/** Streak flame + longest */
export function StreakWidget() {
  const { data, isPending } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const r = await fetch("/api/gamification");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { streak: { current: number; longest: number } };
    },
  });

  if (isPending) return <div className="rounded-xl border border-line bg-surface p-4 animate-pulse h-24" />;

  const { streak } = data!;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink">السلسلة</p>
          <p className="tnum mt-0.5 text-3xl font-bold text-gold-600">{streak.current}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-ink">أطول سلسلة</p>
          <p className="tnum text-xl font-bold text-ink">{streak.longest}</p>
        </div>
        <div className="text-center text-gold-600">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z" /></svg>
        </div>
      </div>
      <p className="tnum mt-2 text-xs text-ink-mute">كل يوم تمارين = شعلة تزيد. انقطع ترجع لصفر.</p>
    </section>
  );
}