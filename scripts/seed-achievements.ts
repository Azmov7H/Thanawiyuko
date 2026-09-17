/**
 * Idempotent achievement seed.
 * Usage: npm run seed:achievements
 * Safe to re-run: upserts by `code`, never deletes, never overwrites admin edits
 * to keys already present (only fills missing definitions).
 */
import mongoose from "mongoose";
import { AchievementModel } from "../src/server/modules/gamification/achievement.model";

const ACHIEVEMENTS = [
  {
    code: "first_quiz",
    titleAr: "أول اختبار",
    descriptionAr: "أكملت أول تدريب لك.",
    icon: "🎯",
    xpReward: 10,
    isSecret: false,
  },
  {
    code: "streak_7",
    titleAr: "أسبوع كامل",
    descriptionAr: "ذاكرت ٧ أيام متتالية.",
    icon: "🔥",
    xpReward: 50,
    isSecret: false,
  },
  {
    code: "hundred_questions",
    titleAr: "مئة سؤال",
    descriptionAr: "أجبت على ١٠٠ سؤال.",
    icon: "💯",
    xpReward: 100,
    isSecret: false,
  },
  {
    code: "first_mock",
    titleAr: "أول محاكاة",
    descriptionAr: "أكملت أول امتحان تجريبي.",
    icon: "🧪",
    xpReward: 30,
    isSecret: false,
  },
  {
    code: "mistake_hunter",
    titleAr: "صيّاد الأخطاء",
    descriptionAr: "صحّحت ١٠ أخطاء من مكتبتك.",
    icon: "🐞",
    xpReward: 40,
    isSecret: false,
  },
  {
    code: "physics_master",
    titleAr: "سيد الفيزياء",
    descriptionAr: "أتقنت موضوعًا في الفيزياء.",
    icon: "🧠",
    xpReward: 60,
    isSecret: false,
  },
  {
    code: "planner_follower",
    titleAr: "ملتزم بالخطة",
    descriptionAr: "تابعت خطتك ٥ أيام.",
    icon: "📅",
    xpReward: 40,
    isSecret: false,
  },
  {
    code: "comeback_king",
    titleAr: "عودٌ قوي",
    descriptionAr: "عدت للدراسة بعد انقطاع.",
    icon: "💪",
    xpReward: 30,
    isSecret: true,
  },
  {
    code: "accurate_20",
    titleAr: "دقة عالية",
    descriptionAr: "٢٠ إجابة صحيحة متتالية.",
    icon: "🎖️",
    xpReward: 50,
    isSecret: false,
  },
  {
    code: "exam_ready",
    titleAr: "جاهز للامتحان",
    descriptionAr: "بلغت جاهزية ٧٠٪ في مادة.",
    icon: "🚀",
    xpReward: 80,
    isSecret: false,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await mongoose.connect(url);

  let created = 0;
  for (const a of ACHIEVEMENTS) {
    const res = await AchievementModel.updateOne(
      { code: a.code },
      { $setOnInsert: { ...a, rule: a.code } },
      { upsert: true },
    );
    if (res.upsertedCount > 0) created += 1;
  }

  const total = await AchievementModel.countDocuments({});
  console.log(`Achievements seeded: ${created} created, ${ACHIEVEMENTS.length - created} existing (total ${total}).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
