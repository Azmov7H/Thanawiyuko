import type { PdfDocument } from "@/server/modules/pdf";
import { ACTION_AR, formatCairoDate, mdToPlain, secondsPlain } from "./plain";

/**
 * Pure PDF report builders (T-K2). Inputs are normalized, DB-read data;
 * these functions never touch the database or the PDF engine.
 */

export type ProgressReportData = {
  studentName: string;
  grade: string | null;
  generatedAt: Date;
  xp: { total: number; level: number };
  streak: { current: number; longest: number };
  subjects: Array<{ nameAr: string; mastery: number; topics: number }>;
  weakTopics: Array<{ masteryScore: number; n: number }>;
  readiness: number;
  mistakesDue: number;
  plan: Array<{ action: "practice" | "review" | "lesson"; minutes: number; reason: string; qCount?: number }>;
};

export function progressReportDoc(data: ProgressReportData): PdfDocument {
  const title = "تقرير التقدم";
  const meta = [
    { label: "الطالب", value: data.studentName },
    { label: "الصف", value: data.grade ?? "—" },
    { label: "تاريخ التقرير", value: formatCairoDate(data.generatedAt) },
  ];
  const blocks: PdfDocument["blocks"] = [
    {
      type: "keyValues",
      items: [
        { label: "إجمالي نقاط الخبرة", value: `${data.xp.total} XP` },
        { label: "المستوى", value: `${data.xp.level}` },
        { label: "السلسلة الحالية/الأطول", value: `${data.streak.current} / ${data.streak.longest} يوم` },
        { label: "درجة الاستعداد", value: `${data.readiness}%` },
        { label: "مراجعات مستحقة الآن", value: `${data.mistakesDue}` },
      ],
    },
  ];

  if (data.subjects.length > 0) {
    blocks.push(
      {
        type: "heading",
        text: "الإتقان حسب المادة",
        level: 2,
      },
      {
        type: "table",
        caption: "النسبة إلى 100% وعدد المواضيع المتقنة/المدرسوبة",
        columns: [
          { key: "nameAr", label: "المادة" },
          { key: "mastery", label: "الإتقان", align: "center" },
          { key: "topics", label: "المواضيع", align: "center" },
        ],
        rows: data.subjects.map((s) => ({
          nameAr: s.nameAr,
          mastery: `${s.mastery}%`,
          topics: `${s.topics}`,
        })),
      },
    );
  }

  if (data.weakTopics.length > 0) {
    blocks.push({
      type: "heading",
      text: "نقاط تحتاج تركيزًا",
      level: 2,
    });
    blocks.push({
      type: "list",
      items: data.weakTopics.map((w) => `${w.masteryScore}% إتقان (من ${w.n} إجابة)`),
    });
  }

  if (data.plan.length > 0) {
    blocks.push(
      { type: "heading", text: "خطتك لليوم", level: 2 },
      {
        type: "list",
        items: data.plan.map(
          (p) =>
            `${ACTION_AR[p.action] ?? p.action} — ${p.minutes} دقيقة${p.qCount ? ` (${p.qCount} سؤال)` : ""}\n${p.reason}`,
        ),
      },
    );
  }

  blocks.push({
    type: "callout",
    tone: "success",
    text: "استمر في التقدم اليومي، وراجع أخطاءك قبل الامتحان: كل مراجعة قصيرة تُبقي المعلومة حاضرة.",
  });

  return {
    title,
    subtitle: "تقرير أسبوعي — ثانويكو",
    footer: "ثانويكو — تقرير التقدم",
    meta,
    blocks,
  };
}

export type ExamReportData = {
  studentName: string;
  examTitle: string | null;
  generatedAt: Date;
  submittedAt: string;
  score: number;
  total: number;
  accuracy: number;
  lateSubmit: boolean;
  perTopic: Array<{
    topicId: string;
    total: number;
    correct: number;
    accuracy: number;
    avgTimeMs: number;
  }>;
  topicTitles: Record<string, string>;
  review: Array<{
    topicId: string;
    stemMD: string;
    chosenKeys: string[];
    correctKeys: string[];
    correct: boolean;
    skipped: boolean;
    explanationMD: string;
    difficulty: "easy" | "medium" | "hard";
  }>;
};

export function examResultDoc(data: ExamReportData): PdfDocument {
  const blocks: PdfDocument["blocks"] = [
    {
      type: "keyValues",
      items: [
        { label: "الامتحان", value: data.examTitle ?? "—" },
        { label: "النتيجة", value: `${data.score} من ${data.total}` },
        { label: "الدقة", value: `${data.accuracy}%` },
        { label: "تاريخ التقديم", value: formatCairoDate(data.submittedAt) },
        { label: "تسليم متأخر", value: data.lateSubmit ? "نعم" : "لا" },
      ],
    },
  ];

  const topics = data.perTopic
    .map((t) => data.topicTitles[t.topicId])
    .filter((x): x is string => Boolean(x));
  if (topics.length > 0) {
    blocks.push({
      type: "heading",
      text: "التحليل حسب الموضوع",
      level: 2,
    });
    blocks.push({
      type: "table",
      columns: [
        { key: "topic", label: "الموضوع" },
        { key: "correct", label: "صحيح/كلي", align: "center" },
        { key: "accuracy", label: "الدقة", align: "center" },
        { key: "time", label: "متوسط الزمن", align: "center" },
      ],
      rows: data.perTopic.map((t) => ({
        topic: data.topicTitles[t.topicId] ?? "—",
        correct: `${t.correct}/${t.total}`,
        accuracy: `${t.accuracy}%`,
        time: secondsPlain(t.avgTimeMs),
      })),
    });
  }

  blocks.push(
    { type: "heading", text: "مراجعة الإجابات", level: 2 },
    { type: "paragraph", text: "إجابتك، والإجابة الصحيحة، وشرح كل سؤال." },
  );
  for (const item of data.review) {
    blocks.push({
      type: "paragraph",
      text: mdToPlain(item.stemMD, 400),
    });
    if (item.correct) {
      blocks.push({ type: "callout", tone: "success", text: "إجابتك صحيحة ✓" });
    } else {
      blocks.push({
        type: "list",
        items: [
          `إجابتك: ${item.chosenKeys.length ? item.chosenKeys.join(", ") : "تخطيت السؤال"}`,
          `الصحيح: ${item.correctKeys.join(", ")}`,
        ],
      });
    }
    blocks.push({
      type: "paragraph",
      text: item.explanationMD ? mdToPlain(item.explanationMD, 500) : "لا يوجد شرح.",
    });
  }

  return {
    title: `نتيجة الامتحان — ${data.score} من ${data.total}`,
    subtitle: data.examTitle ?? "امتحان تجريبي",
    footer: "ثانويكو — نتيجة امتحان",
    meta: [{ label: "الطالب", value: data.studentName }],
    blocks,
  };
}

export type MistakeReportItem = {
  topicTitleAr: string | null;
  conceptTag: string | null;
  stemMD: string;
  chosenKeys: string[];
  correctKeys: string[];
  explanationMD: string;
  dueAt: string;
  reviewCount: number;
};

export type MistakeReportData = {
  studentName: string;
  generatedAt: Date;
  items: MistakeReportItem[];
};

const MISTAKE_DETAIL_CAP = 50;
const MISTAKE_SUMMARY_CAP = 200;

export function mistakeReportDoc(data: MistakeReportData): PdfDocument {
  const blocks: PdfDocument["blocks"] = [];
  const total = data.items.length;
  blocks.push({
    type: "keyValues",
    items: [
      { label: "الطالب", value: data.studentName },
      { label: "تاريخ التقرير", value: formatCairoDate(data.generatedAt) },
      { label: "الأخطاء المفتوحة", value: `${total}` },
    ],
  });
  if (total === 0) {
    blocks.push({
      type: "callout",
      tone: "success",
      text: "لا توجد أخطاء مفتوحة حاليًا. ممتاز — واصل!",
    });
    return {
      title: "تقرير الأخطاء",
      subtitle: "ثانويكو — مكتبة الأخطاء",
      footer: "ثانويكو — تقرير الأخطاء",
      blocks,
    };
  }

  const shown = data.items.slice(0, MISTAKE_SUMMARY_CAP);
  const detailItems = data.items.slice(0, MISTAKE_DETAIL_CAP);

  blocks.push({
    type: "heading",
    text: "ملخص الأخطاء",
    level: 2,
  });
  blocks.push({
    type: "table",
    caption: "ترتيب حسب تاريخ الاستحقاق",
    columns: [
      { key: "topic", label: "الموضوع" },
      { key: "stem", label: "السؤال" },
      { key: "chosen", label: "إجابتك" },
      { key: "correct", label: "الصحيح" },
      { key: "due", label: "الاستحقاق" },
    ],
    rows: shown.map((m) => ({
      topic: m.topicTitleAr ?? "—",
      stem: mdToPlain(m.stemMD, 120),
      chosen: m.chosenKeys.length ? m.chosenKeys.join(", ") : "تخطيت",
      correct: m.correctKeys.join(", "),
      due: formatCairoDate(m.dueAt, "short"),
    })),
  });

  if (detailItems.length > 0) {
    blocks.push({ type: "pageBreak" });
    blocks.push({ type: "heading", text: "شرح الأخطاء", level: 2 });
    for (const m of detailItems) {
      blocks.push(
        {
          type: "heading",
          text: m.topicTitleAr ?? "سؤال",
          level: 3,
        },
        {
          type: "paragraph",
          text: mdToPlain(m.stemMD, 400),
        },
        {
          type: "list",
          items: [
            `إجابتك: ${m.chosenKeys.length ? m.chosenKeys.join(", ") : "تخطيت السؤال"}`,
            `الإجابة الصحيحة: ${m.correctKeys.join(", ")}`,
            ...(m.conceptTag ? [`المفهوم المرتبط: ${m.conceptTag}`] : []),
            `عدد المراجعات: ${m.reviewCount}`,
          ],
        },
        {
          type: "paragraph",
          text: m.explanationMD ? mdToPlain(m.explanationMD, 500) : "لا يوجد شرح.",
        },
      );
    }
  }

  return {
    title: "تقرير الأخطاء",
    subtitle: `أول ${shown.length} من ${total} خطأ مفتوح`,
    footer: "ثانويكو — تقرير الأخطاء",
    blocks,
  };
}