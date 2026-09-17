import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { LeaderboardEntryModel } from "@/server/modules/gamification/achievement.model";

/** GET /api/leaderboard — weekly leaderboard (opt-in only). */
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

  // Current week start (Cairo Monday)
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday=0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);

  const top = await LeaderboardEntryModel.find({ weekStart }).sort({ rank: 1 }).limit(20).lean();
  const me = await LeaderboardEntryModel.findOne({ studentId: userId, weekStart }).lean();

  return NextResponse.json({
    weekStart,
    top: top.map((e) => ({ rank: e.rank, nickname: e.nickname, xp: e.xp })),
    me: me ? { rank: me.rank, xp: me.xp, percentile: Math.round((1 - me.rank / 100) * 100) } : null,
  });
}

import mongoose from "mongoose";