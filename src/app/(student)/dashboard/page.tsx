"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { XpProgress } from "@/components/XpProgress";
import { StreakWidget } from "@/components/StreakWidget";
import { AchievementGallery } from "@/components/AchievementGallery";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

type ProgressData = {
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

const ACTION_LABEL: Record<string, string> = {
  review: "مراجعة",
  lesson: "درس",
  practice: "تدريب",
};

const NEXT_META: Record<string, { icon: "mistakes" | "practice" | "book" | "exams"; verb: string }> = {
  review: { icon: "mistakes", verb: "ابدأ المراجعة" },
  quiz: { icon: "practice", verb: "اتدرب الآن" },
  lesson: { icon: "book", verb: "اقرأ الشرح" },
  mock: { icon: "exams", verb: "ابدأ الامتحان" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "سهرة مركزة";
  if (h < 12) return "صباح الخير";
  if (h < 18) return "نهارك سعيد";
  return "مساء الخير";
}

/** M7 dashboard: greeting + one dominant next action + plan + progress. */
export default function DashboardPage() {
  const progress = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const r = await fetch("/api/progress");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as ProgressData;
    },
  });

  if (progress.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-16 w-2/3 max-w-sm" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (progress.isError) {
    return <ErrorState title="تعذر تحميل اللوحة." onRetry={() => progress.refetch()} />;
  }

  const d = progress.data!;
  const { next, plan, subjects, weakTopics } = d;
  const [primary, ...secondary] = next;
  const pm = primary ? NEXT_META[primary.type] ?? NEXT_META.quiz : null;
  const avgMastery = subjects.length
    ? Math.round(subjects.reduce((a, s) => a + s.mastery, 0) / subjects.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Greeting + objective */}
      <PageHeader
        eyebrow={greeting()}
        title="لوحتك اليوم"
        description={
          subjects.length
            ? `أنت قطعت ${avgMastery}% من طريقك في إتقان قائمة موادك. أفضلها حاليًا: ${
                [...subjects].sort((a, b) => b.mastery - a.mastery)[0].nameAr
              }.`
            : "أضف موادك في ملفك وابدأ — سنبنيك خطة من إجاباتك الفعلية."
        }
      />

      {/* 2. Dominant next action */}
      {primary && pm && (
        <section className="animate-rise rounded-2xl border-2 border-brand-accent bg-surface p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-strong">
                <Icon name={pm.icon} size={24} />
              </span>
              <div>
                <p className="text-xs font-medium text-ink-mute">خطوتك الجاية</p>
                <p className="mt-1 max-w-xl leading-relaxed text-ink">{primary.reason}</p>
                {primary.qCount && (
                  <p className="tnum mt-1 text-xs text-ink-mute">{primary.qCount} سؤال • الاستعداد {d.readiness}%</p>
                )}
              </div>
            </div>
            <Button href={primary.href} size="lg" icon={primary.type === "lesson" ? "book" : undefined} ariaLabel="تنفيذ الخطوة التالية">
              {pm.verb}
            </Button>
          </div>
        </section>
      )}

      {/* Secondary recommendations (quiet list) */}
      {secondary.length > 0 && (
        <section>
          <SectionHeader title="كمان ممكن تبدأ" />
          <ul className="mt-2 flex flex-col gap-2">
            {secondary.map((r, i) => (
              <li key={`${r.type}-${i}`}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-ink-mute"
                >
                  <span className="text-ink-soft">{r.reason}</span>
                  {r.qCount && <span className="tnum shrink-0 text-xs text-brand-strong">{r.qCount} سؤال</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Today's plan */}
      {plan.length > 0 && (
        <section>
          <SectionHeader title="خطتك اليوم" actionLabel="عرض الخطة كاملة" actionHref="/study-plan" />
          <ul className="mt-2 flex flex-col gap-2">
            {plan.slice(0, 4).map((p, i) => (
              <li key={`${i}-${p.topicId}`}>
                <Link
                  href={`/subjects/${p.subjectId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-ink-mute"
                >
                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm font-bold text-brand-strong">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {ACTION_LABEL[p.action] ?? p.action} — {p.minutes} دقيقة
                      </p>
                      <p className="mt-0.5 text-xs text-ink-mute">{p.reason}</p>
                    </div>
                  </div>
                  <span className="tnum shrink-0 text-xs text-ink-mute">{p.qCount ?? ""} سؤال</span>
                </Link>
              </li>
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

      {/* Mistakes due */}
      {d.mistakesDue > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3">
          <p className="font-bold text-gold-accent">
            عندك {d.mistakesDue} مراجعة مستحقة من أخطائك السابقة — الأخطاء دي كنزك.
          </p>
          <Button href="/mistakes" variant="gold" size="sm">
            ابدأ المراجعة
          </Button>
        </section>
      )}

      {/* 4. Mastery + 5. focus areas */}
      {subjects.length > 0 && (
        <section>
          <SectionHeader title="إتقانك حسب المادة" actionLabel="شوف التفاصيل" actionHref="/progress" />
          <ul className="mt-3 flex flex-col gap-4">
            {subjects.map((s) => {
              const color = s.mastery < 40 ? "bg-danger-solid" : s.mastery < 70 ? "bg-gold-600" : "bg-ok";
              return (
                <li key={s.subjectId}>
                  <Link
                    href={`/subjects/${s.subjectId}`}
                    className="block rounded-lg p-1 transition-colors hover:bg-surface"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{s.nameAr}</span>
                      <span className="tnum text-ink-mute">{s.mastery}% • {s.topics} موضوع</span>
                    </div>
                    <div
                      className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-label={`إتقان ${s.nameAr}`}
                      aria-valuenow={s.mastery}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${s.mastery}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {weakTopics.length > 0 && (
        <section>
          <SectionHeader title="تحتاج تركيز" meta={<span className="text-xs text-ink-mute">راجع التبويب «التقدم» للتفاصيل</span>} />
          <ul className="mt-2 flex flex-col gap-2">
            {weakTopics.slice(0, 3).map((w) => (
              <li
                key={w.topicId}
                className="flex items-center justify-between gap-3 rounded-lg border border-warn-line bg-warn-bg px-4 py-2.5 text-sm"
              >
                <span className="text-ink">{w.topicTitleAr ?? "موضوع"}</span>
                <span className="flex items-center gap-2">
                  {w.subjectNameAr && <span className="text-ink-mute">{w.subjectNameAr}</span>}
                  <span className="tnum shrink-0 font-bold text-gold-accent">{w.masteryScore}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. Gamification — quiet supporting row */}
      <section aria-label="ملخص التحفيز">
        <SectionHeader title="ملخص رحلتك" />
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
          <XpProgress />
          <StreakWidget />
          <AchievementGallery />
        </div>
      </section>
    </div>
  );
}