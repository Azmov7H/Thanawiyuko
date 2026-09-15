/**
 * Idempotent curriculum seed (M2/P3).
 * Usage: npm run seed:curriculum
 * Safe to re-run: upserts by stable keys, never deletes, never touches
 * published edits beyond filling empty stubs.
 */
import mongoose from "mongoose";
import { CURRICULUM, topicSeedKey } from "../data/curriculum-3rd-sec";
import { SAMPLE_QUESTIONS } from "../data/sample-questions";
import {
  LessonModel,
  SubjectModel,
  TopicModel,
  UnitModel,
} from "../src/server/modules/academic/content.models";
import { QuestionModel } from "../src/server/modules/questions/question.model";

export const SEED_VERSION = "2026.1-sec3-skeleton";

function lessonStub(topicTitle: string, subjectName: string): string {
  return [
    `# ${topicTitle}`,
    ``,
    `> مسودة هيكلية مولّدة من الـ seed (${SEED_VERSION}) — بانتظار المحتوى النهائي من فريق المحتوى.`,
    ``,
    `## أهداف الدرس`,
    ``,
    `- (يُستكمل من الأهداف المعتمدة لمادة ${subjectName})`,
    ``,
    `## الشرح`,
    ``,
    `(نص الشرح الكامل يُضاف هنا قبل المراجعة — لا يُنشر الدرس بدونه.)`,
  ].join("\n");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await mongoose.connect(url, { maxPoolSize: 5 });

  const topicIds = new Map<string, mongoose.Types.ObjectId>();
  let subjects = 0;
  let units = 0;
  let topics = 0;
  let lessons = 0;

  for (const s of CURRICULUM) {
    const subject = await SubjectModel.findOneAndUpdate(
      { code: s.code },
      {
        $setOnInsert: { code: s.code },
        $set: {
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          grade: "sec3",
          tracks: s.tracks,
          examWeight: s.examWeight,
        },
      },
      { upsert: true, new: true },
    );
    subjects += 1;

    for (let ui = 0; ui < s.units.length; ui++) {
      const u = s.units[ui];
      const unit = await UnitModel.findOneAndUpdate(
        { subjectId: subject._id, order: ui + 1 },
        { $setOnInsert: { subjectId: subject._id, order: ui + 1 }, $set: { titleAr: u.title } },
        { upsert: true, new: true },
      );
      units += 1;

      for (let ti = 0; ti < u.topics.length; ti++) {
        const t = u.topics[ti];
        const topic = await TopicModel.findOneAndUpdate(
          { unitId: unit._id, order: ti + 1 },
          {
            $setOnInsert: { subjectId: subject._id, unitId: unit._id, order: ti + 1 },
            $set: { titleAr: t.title, conceptTags: t.tags, objectives: t.objectives ?? [] },
          },
          { upsert: true, new: true },
        );
        topics += 1;
        topicIds.set(topicSeedKey(s.code, ui + 1, ti + 1), topic._id as mongoose.Types.ObjectId);

        await LessonModel.findOneAndUpdate(
          { topicId: topic._id, order: 1 },
          {
            $setOnInsert: {
              topicId: topic._id,
              order: 1,
              titleAr: t.title,
              bodyMD: lessonStub(t.title, s.nameAr),
              readingMinutes: 10,
            },
          },
          { upsert: true },
        );
        lessons += 1;
      }
    }
  }

  let questions = 0;
  for (const q of SAMPLE_QUESTIONS) {
    const topicId = topicIds.get(q.topicKey);
    if (!topicId) throw new Error(`Unknown topicKey in sample: ${q.topicKey}`);
    await QuestionModel.findOneAndUpdate(
      { topicId, stemMD: q.stemMD },
      {
        $setOnInsert: { topicId, stemMD: q.stemMD },
        $set: {
          type: q.type,
          options: q.options,
          correctKeys: q.correctKeys,
          explanationMD: q.explanationMD,
          difficulty: q.difficulty,
          difficultyEstimated: true,
          conceptTags: q.conceptTags,
        },
      },
      { upsert: true },
    );
    questions += 1;
  }

  console.log(
    JSON.stringify({ seed: SEED_VERSION, subjects, units, topics, lessons, questions }),
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
