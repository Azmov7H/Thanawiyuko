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
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248zM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718z" clipRule="evenodd" /></svg>
        </div>
      </div>
      <p className="tnum mt-2 text-xs text-ink-mute">كل يوم تمارين = شعلة تزيد. انقطع ترجع لصفر.</p>
    </section>
  );
}