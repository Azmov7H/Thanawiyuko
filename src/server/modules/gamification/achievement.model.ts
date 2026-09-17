import mongoose, { Schema, Types } from "mongoose";

/**
 * Achievement definition (static, seeded).
 */
export interface AchievementDoc extends mongoose.Document {
  code: string;
  titleAr: string;
  descriptionAr: string;
  icon: string;
  rule: string; // evaluator key
  xpReward: number;
  isSecret: boolean;
}

const achievementSchema = new Schema<AchievementDoc>(
  {
    code: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true, maxlength: 60 },
    descriptionAr: { type: String, required: true, maxlength: 200 },
    icon: { type: String, required: true },
    rule: { type: String, required: true },
    xpReward: { type: Number, default: 0, min: 0 },
    isSecret: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AchievementModel =
  mongoose.models.Achievement ?? mongoose.model<AchievementDoc>("Achievement", achievementSchema);

/**
 * UserAchievement — unlocked instance.
 */
export interface UserAchievementDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  achievementId: Types.ObjectId;
  unlockedAt: Date;
}

const userAchievementSchema = new Schema<UserAchievementDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement", required: true },
  },
  { timestamps: { createdAt: "unlockedAt", updatedAt: false } },
);
userAchievementSchema.index({ studentId: 1, achievementId: 1 }, { unique: true });

export const UserAchievementModel =
  mongoose.models.UserAchievement ?? mongoose.model<UserAchievementDoc>("UserAchievement", userAchievementSchema);

/**
 * LeaderboardEntry — weekly snapshot for opt-in students (V1.1).
 */
export interface LeaderboardEntryDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  weekStart: Date; // Cairo Monday
  xp: number;
  rank: number;
  nickname: string;
}

const leaderboardSchema = new Schema<LeaderboardEntryDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    weekStart: { type: Date, required: true },
    xp: { type: Number, required: true },
    rank: { type: Number, required: true },
    nickname: { type: String, required: true, maxlength: 30 },
  },
  { timestamps: true },
);
leaderboardSchema.index({ weekStart: 1, rank: 1 });
leaderboardSchema.index({ studentId: 1, weekStart: -1 });

export const LeaderboardEntryModel =
  mongoose.models.LeaderboardEntry ?? mongoose.model<LeaderboardEntryDoc>("LeaderboardEntry", leaderboardSchema);