"use client";

import { useQuery } from "@tanstack/react-query";

/** Achievement gallery (unlocked + locked silhouettes) */
export function AchievementGallery() {
  const { data, isPending } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const r = await fetch("/api/gamification");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { achievements: Array<{ code: string; titleAr: string; descriptionAr: string; icon: string; unlockedAt: string }> };
    },
  });

  const ALL: Array<{ code: string; titleAr: string; descriptionAr: string; icon: string }> = [
    { code: "first_quiz", titleAr: "أول خطوة", descriptionAr: "أكملت أول جلسة تدريب", icon: "🎯" },
    { code: "streak_7", titleAr: "مثابر", descriptionAr: "7 أيام متتالية", icon: "🔥" },
    { code: "hundred_questions", titleAr: "مئة سؤال", descriptionAr: "حللت 100 سؤال", icon: "💯" },
    { code: "first_mock", titleAr: "أول امتحان", descriptionAr: "أكملت أول امتحان تجريبي", icon: "📝" },
    { code: "mistake_hunter", titleAr: "صائد الأخطاء", descriptionAr: "صححت 10 أخطاء", icon: "🕵️" },
    { code: "physics_master", titleAr: "مُتقن فيزياء", descriptionAr: "أتقنت موضوع فيزياء", icon: "⚛️" },
    { code: "planner_follower", titleAr: "منظم", descriptionAr: "تابعت الخطة 5 أيام", icon: "📅" },
    { code: "comeback_king", titleAr: "عودة قوية", descriptionAr: "رجعت بعد انقطاع", icon: "💪" },
    { code: "accurate_20", titleAr: "دقيق", descriptionAr: "80%+ في 20 سؤال", icon: "🎯" },
    { code: "exam_ready", titleAr: "جاهز", descriptionAr: "استعداد 70%+", icon: "✅" },
  ];

  const unlocked = new Set(data?.achievements.map((a) => a.code) ?? []);

  if (isPending) return <div className="rounded-xl border border-line bg-surface p-4 animate-pulse h-32" />;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold text-ink">الإنجازات ({unlocked.size} / {ALL.length})</h2>
      <div className="mt-3 grid grid-cols-5 gap-3">
        {ALL.map((a) => {
          const got = unlocked.has(a.code);
          return (
            <div key={a.code} className={`rounded-xl p-3 text-center ${got ? "bg-brand-50 border-brand-200" : "bg-base opacity-50 border-dashed border-line"}`}>
              <div className="text-3xl">{a.icon}</div>
              <p className={`mt-1 text-xs font-medium ${got ? "text-brand-700" : "text-ink-mute"}`}>{a.titleAr}</p>
              <p className={`text-[10px] ${got ? "text-ink-mute" : "text-ink-mute/50"}`}>{a.descriptionAr}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}