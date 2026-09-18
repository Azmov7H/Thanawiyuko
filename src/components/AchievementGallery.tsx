"use client";

import { useQuery } from "@tanstack/react-query";
import { Icon, type IconName } from "@/components/ui/Icon";

type AchievementMeta = {
  code: string;
  titleAr: string;
  descriptionAr: string;
  icon: IconName;
};

const ALL: AchievementMeta[] = [
  { code: "first_quiz", titleAr: "أول خطوة", descriptionAr: "أكملت أول جلسة تدريب", icon: "practice" },
  { code: "streak_7", titleAr: "مثابر", descriptionAr: "7 أيام متتالية", icon: "flame" },
  { code: "hundred_questions", titleAr: "مئة سؤال", descriptionAr: "حللت 100 سؤال", icon: "bolt" },
  { code: "first_mock", titleAr: "أول امتحان", descriptionAr: "أكملت أول امتحان تجريبي", icon: "exams" },
  { code: "mistake_hunter", titleAr: "صائد الأخطاء", descriptionAr: "صححت 10 أخطاء", icon: "mistakes" },
  { code: "physics_master", titleAr: "مُتقن فيزياء", descriptionAr: "أتقنت موضوع فيزياء", icon: "sparkle" },
  { code: "planner_follower", titleAr: "منظم", descriptionAr: "تابعت الخطة 5 أيام", icon: "plan" },
  { code: "comeback_king", titleAr: "عودة قوية", descriptionAr: "رجعت بعد انقطاع", icon: "trophy" },
  { code: "accurate_20", titleAr: "دقيق", descriptionAr: "80%+ في 20 سؤال", icon: "star" },
  { code: "exam_ready", titleAr: "جاهز", descriptionAr: "استعداد 70%+", icon: "progress" },
];

const ICON_BY_CODE = new Map(ALL.map((a) => [a.code, a.icon]));

/** Achievement gallery (unlocked + locked silhouettes), education-first. */
export function AchievementGallery() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const r = await fetch("/api/gamification");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { achievements: Array<{ code: string; titleAr: string; descriptionAr: string; icon: string; unlockedAt: string }> };
    },
  });

  if (isPending)
    return <div aria-hidden className="h-28 animate-pulse rounded-2xl bg-surface" />;
  if (isError)
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-line bg-surface text-sm text-ink-mute">
        تعذر تحميل الإنجازات.
      </div>
    );

  const unlocked = new Set(data?.achievements.map((a) => a.code) ?? []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="الإنجازات">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-mute">الإنجازات</h3>
        <span className="tnum text-xs font-bold text-brand-strong">
          {unlocked.size} / {ALL.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {ALL.map((a) => {
          const got = unlocked.has(a.code);
          return (
            <div
              key={a.code}
              aria-label={`${a.titleAr}: ${got ? "مفتوح" : "مقفل"} — ${a.descriptionAr}`}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center ${
                got ? "border-brand-soft bg-brand-tint" : "border-dashed border-line bg-base"
              }`}
            >
              <span className={`${got ? "text-brand-strong" : "text-ink-mute"}`}>
                <Icon name={ICON_BY_CODE.get(a.code) ?? "sparkle"} size={20} />
              </span>
              <span className={`text-[10px] leading-tight ${got ? "text-brand-strong" : "text-ink-mute"}`}>
                <span className="sr-only">{got ? "مفتوح: " : "مقفل: "}</span>
                {a.titleAr}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}