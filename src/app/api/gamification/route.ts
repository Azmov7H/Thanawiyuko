import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { evaluateAchievements, awardXp, reconcileStreaks } from "@/server/modules/gamification/service";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { UserAchievementModel } from "@/server/modules/gamification/achievement.model";
import { levelFromXP, xpForNextLevel } from "@/server/modules/gamification/xp.model";

/** POST /api/gamification/sync — full gamification state for dashboard. */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  const [streak, xpAgg, achievements] = await Promise.all([
    StreakModel.findOne({ studentId: userId }).lean(),
    XPTransactionModel.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" }, today: { $sum: { $cond: [{ $gte: ["$createdAt", new Date(new Date().setHours(0,0,0,0))] }, "$amount", 0] } } } },
    ]),
    UserAchievementModel.find({ studentId: userId }).populate("achievementId").lean(),
  ]);

  const totalXP = xpAgg[0]?.total ?? 0;
  const todayXP = xpAgg[0]?.today ?? 0;
  const level = levelFromXP(totalXP);
  const nextXP = xpForNextLevel(totalXP);

  return NextResponse.json({
    xp: { total: totalXP, today: todayXP, level, nextLevelXp: nextXP.next },
    streak: streak ? { current: streak.current, longest: streak.longest } : { current: 0, longest: 0 },
    achievements: achievements.map((a) => ({
      code: a.achievementId.code,
      titleAr: a.achievementId.titleAr,
      descriptionAr: a.achievementId.descriptionAr,
      icon: a.achievementId.icon,
      unlockedAt: a.createdAt,
    })),
  });
}

/** POST /api/gamification/achievements/eval — manual re-eval (dev). */
export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  const unlocked = await evaluateAchievements(userId);
  return NextResponse.json({ unlocked });
}

import mongoose from "mongoose";