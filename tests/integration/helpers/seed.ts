import { UserModel, type UserRole } from "@/server/modules/auth/user.model";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import {
  SubjectModel,
  UnitModel,
  TopicModel,
  LessonModel,
} from "@/server/modules/academic/content.models";
import { AchievementModel } from "@/server/modules/gamification/achievement.model";

export async function createUser(input: {
  email: string;
  name?: string;
  role?: UserRole;
  status?: "active" | "suspended" | "deleted";
}) {
  return UserModel.create({
    name: input.name ?? "طالب اختبار",
    email: input.email,
    passwordHash: "not-a-real-hash",
    role: input.role ?? "student",
    status: input.status ?? "active",
  });
}

export async function createProfile(
  userId: string,
  overrides: Partial<{ track: "science" | null; targetExamDate: Date | null; dailyMinutes: number }> = {},
) {
  return StudentProfileModel.create({
    userId,
    grade: "sec3",
    track: overrides.track ?? "science",
    dailyMinutes: overrides.dailyMinutes ?? 60,
    targetExamDate: overrides.targetExamDate ?? null,
    onboardingState: { step: 3, done: true },
  });
}

export async function createContent() {
  const subject = await SubjectModel.create({
    code: "phy-sec3",
    nameAr: "الفيزياء",
    nameEn: "Physics",
    grade: "sec3",
    tracks: ["science", "math"],
    examWeight: 20,
    status: "published",
  });
  const unit = await UnitModel.create({
    subjectId: subject._id,
    titleAr: "الحركة",
    order: 1,
    status: "published",
  });
  const topic = await TopicModel.create({
    subjectId: subject._id,
    unitId: unit._id,
    titleAr: "الحركة في خط مستقيم",
    objectives: ["فهم السرعة"],
    conceptTags: ["velocity"],
    order: 1,
    status: "published",
  });
  const lesson = await LessonModel.create({
    topicId: topic._id,
    titleAr: "مقدمة",
    bodyMD: "نص",
    diagrams: [],
    readingMinutes: 5,
    order: 1,
    status: "published",
  });
  return {
    subjectId: String(subject._id),
    unitId: String(unit._id),
    topicId: String(topic._id),
    lessonId: String(lesson._id),
  };
}

export async function seedAchievement(code: string, titleAr = "شارة") {
  return AchievementModel.create({
    code,
    titleAr,
    descriptionAr: "وصف",
    icon: "🏅",
    rule: code,
    xpReward: 0,
    isSecret: false,
  });
}
