import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { TopicModel, SubjectModel } from "@/server/modules/academic/content.models";
import type { PlanInput, PlanTopicInput } from "@/lib/planner";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONCEPT_WINDOW_DAYS = 14;

export type PlanProfile = {
  targetExamDate?: Date | string | null;
  dailyMinutes?: number | null;
};

export type PlanContext = {
  planInput: PlanInput;
  topics: Map<string, PlanTopicInput>;
  subjectWeights: Map<string, number>;
  subjects: Array<{ subjectId: string; nameAr: string; examWeight: number }>;
  recentActivity: Record<string, number>;
  mistakesDue: Array<{ topicId: string; conceptTag: string | null }>;
  conceptRepeats: Map<string, number>;
};

export async function conceptRepeatByTopic(studentId: string): Promise<Map<string, number>> {
  const since = new Date(Date.now() - CONCEPT_WINDOW_DAYS * DAY_MS);
  const rows = await MistakeModel.find({
    studentId,
    createdAt: { $gte: since },
    conceptTag: { $ne: null },
  })
    .select("topicId conceptTag")
    .lean();

  const perTopic = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const topicId = String(row.topicId);
    const tag = String(row.conceptTag);
    const counts = perTopic.get(topicId) ?? new Map<string, number>();
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
    perTopic.set(topicId, counts);
  }

  const repeats = new Map<string, number>();
  for (const [topicId, counts] of perTopic) {
    repeats.set(topicId, Math.max(...counts.values()));
  }
  return repeats;
}

export async function buildPlanContext(studentId: string, profile: PlanProfile): Promise<PlanContext> {
  const mastery = await TopicMasteryModel.find({ studentId }).lean();
  const topicIds = mastery.map((m) => m.topicId).filter(Boolean);
  const topics = topicIds.length
    ? await TopicModel.find({ _id: { $in: topicIds } })
        .select("subjectId")
        .lean()
    : [];
  const subjectOfTopic = new Map(topics.map((t) => [String(t._id), String(t.subjectId)]));
  const subjectIds = [...new Set([...subjectOfTopic.values()])];

  const subjectDocs = subjectIds.length
    ? await SubjectModel.find({ _id: { $in: subjectIds } })
        .select("nameAr examWeight")
        .lean()
    : [];
  const subjects = subjectDocs.map((sbj) => ({
    subjectId: String(sbj._id),
    nameAr: sbj.nameAr,
    examWeight: sbj.examWeight ?? 10,
  }));
  const subjectWeights = new Map(subjects.map((sbj) => [sbj.subjectId, sbj.examWeight]));

  const now = Date.now();
  const topicsMap = new Map<string, PlanTopicInput>();
  const recentActivity: Record<string, number> = {};
  for (const m of mastery) {
    const topicId = String(m.topicId);
    const subjectId = subjectOfTopic.get(topicId);
    if (!subjectId) continue;
    topicsMap.set(topicId, {
      masteryScore: m.masteryScore,
      band: m.band,
      n: m.n,
      subjectId,
      examWeight: 1,
    });
    if (m.updatedAt) {
      recentActivity[topicId] = Math.floor((now - new Date(m.updatedAt).getTime()) / DAY_MS);
    }
  }

  const dueRows = await MistakeModel.find({ studentId, resolvedAt: null, dueAt: { $lte: new Date() } })
    .select("topicId conceptTag")
    .lean();
  const mistakesDue = dueRows.map((m) => ({ topicId: String(m.topicId), conceptTag: m.conceptTag }));
  const conceptRepeats = await conceptRepeatByTopic(studentId);

  return {
    planInput: {
      targetExamDate: profile.targetExamDate ? new Date(profile.targetExamDate) : null,
      dailyMinutes: profile.dailyMinutes ?? 45,
      topics: topicsMap,
      mistakesDue,
      recentActivity,
      subjectWeights,
    },
    topics: topicsMap,
    subjectWeights,
    subjects,
    recentActivity,
    mistakesDue,
    conceptRepeats,
  };
}
