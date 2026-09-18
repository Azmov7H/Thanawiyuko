import { describe, expect, it } from "vitest";
import { parsePdfDocument } from "@/server/modules/pdf";
import {
  mdToPlain,
  formatCairoDate,
  secondsPlain,
  progressReportDoc,
  examResultDoc,
  mistakeReportDoc,
  type ProgressReportData,
  type ExamReportData,
  type MistakeReportData,
} from "@/server/modules/exports";

describe("mdToPlain", () => {
  it("strips markdown and collapses whitespace", () => {
    expect(mdToPlain("# عنوان\n\nنص مع **غامق** و `كود` و [رابط](https://x)")).toBe(
      "عنوان نص مع غامق و كود و رابط",
    );
    expect(mdToPlain("تم العصر الجزيئي: ()")).toContain("تم العصر الجزيئي");
  });

  it("truncates with an ellipsis when capped", () => {
    const out = mdToPlain("كلمة كلمة كلمة كلمة كلمة", 12);
    expect(out.length).toBeLessThanOrEqual(13);
    expect(out).toContain("…");
  });

  it("normalizes lists into bullets", () => {
    expect(mdToPlain("- أول\n- ثاني")).toBe("• أول • ثاني");
  });
});

describe("formatCairoDate / secondsPlain", () => {
  it("formats as a long Cairo date string", () => {
    expect(formatCairoDate(new Date("2026-03-01T10:00:00Z"))).toMatch(/مارس|٢٠٢٦/);
  });

  it("prints human durations", () => {
    expect(secondsPlain(4500)).toBe("5 ث");
    expect(secondsPlain(90_000)).toBe("1 د 30 ث");
  });
});

const progressData: ProgressReportData = {
  studentName: "أحمد",
  grade: "الأول الثانوي",
  generatedAt: new Date("2026-03-01T10:00:00Z"),
  xp: { total: 320, level: 4 },
  streak: { current: 5, longest: 9 },
  subjects: [{ nameAr: "الفيزياء", mastery: 82, topics: 6 }],
  weakTopics: [{ masteryScore: 45, n: 8 }],
  readiness: 71,
  mistakesDue: 3,
  plan: [{ action: "practice", minutes: 20, reason: "تدريب اليوم", qCount: 10 }],
};

describe("progressReportDoc", () => {
  it("produces a valid pdf document", () => {
    expect(() => parsePdfDocument(progressReportDoc(progressData))).not.toThrow();
  });

  it("renders meta, table, list and callout blocks", () => {
    const doc = progressReportDoc(progressData);
    expect(doc.title).toBe("تقرير التقدم");
    expect(doc.meta).toContainEqual({ label: "الطالب", value: "أحمد" });
    expect(doc.blocks.some((b) => b.type === "table")).toBe(true);
    expect(doc.blocks.some((b) => b.type === "list")).toBe(true);
    expect(doc.blocks.some((b) => b.type === "callout")).toBe(true);
  });

  it("skips empty sections", () => {
    const doc = progressReportDoc({ ...progressData, subjects: [], weakTopics: [], plan: [] });
    expect(doc.blocks.some((b) => b.type === "table")).toBe(false);
    expect(doc.blocks.some((b) => b.type === "callout")).toBe(true);
  });
});

const examData: ExamReportData = {
  studentName: "أحمد",
  examTitle: "فيزياء — تجريبي 1",
  generatedAt: new Date("2026-03-01T10:00:00Z"),
  submittedAt: "2026-03-01T09:30:00Z",
  score: 8,
  total: 10,
  accuracy: 80,
  lateSubmit: false,
  perTopic: [
    { topicId: "t1", total: 4, correct: 3, accuracy: 75, avgTimeMs: 45_000 },
  ],
  topicTitles: { t1: "القوى والحركة" },
  review: [
    {
      topicId: "t1",
      stemMD: "ما **مقدار** القوة؟",
      chosenKeys: ["B"],
      correctKeys: ["A"],
      correct: false,
      skipped: false,
      explanationMD: "القوة تساوي الكتلة مضروبة في العجلة.",
      difficulty: "medium",
    },
  ],
};

describe("examResultDoc", () => {
  it("produces a valid pdf document", () => {
    expect(() => parsePdfDocument(examResultDoc(examData))).not.toThrow();
  });

  it("renders result, per-topic table and review callouts", () => {
    const doc = examResultDoc(examData);
    expect(doc.title).toContain("8 من 10");
    expect(doc.blocks.some((b) => b.type === "table")).toBe(true);
    const callouts = doc.blocks.filter((b) => b.type === "callout");
    expect(callouts.length).toBe(0);
  });

  it("marks correct answers with a success callout", () => {
    const doc = examResultDoc({ ...examData, review: [{ ...examData.review[0], correct: true }] });
    expect(doc.blocks.some((b) => b.type === "callout" && b.text.includes("صحيحة"))).toBe(true);
  });
});

const mistakeData: MistakeReportData = {
  studentName: "أحمد",
  generatedAt: new Date("2026-03-01T10:00:00Z"),
  items: Array.from({ length: 3 }, (_, i) => ({
    topicTitleAr: `موضوع ${i + 1}`,
    conceptTag: "الاشتقاق",
    stemMD: `خطأ ${i + 1}`,
    chosenKeys: ["B"],
    correctKeys: ["A"],
    explanationMD: "شرح.",
    dueAt: "2026-03-02T10:00:00Z",
    reviewCount: i,
  })),
};

describe("mistakeReportDoc", () => {
  it("produces a valid pdf document with summary and detail blocks", () => {
    const doc = mistakeReportDoc(mistakeData);
    expect(() => parsePdfDocument(doc)).not.toThrow();
    expect(doc.blocks.some((b) => b.type === "table")).toBe(true);
    expect(doc.blocks.some((b) => b.type === "pageBreak")).toBe(true);
  });

  it("handles an empty library with a success callout", () => {
    const doc = mistakeReportDoc({ ...mistakeData, items: [] });
    expect(() => parsePdfDocument(doc)).not.toThrow();
    expect(doc.blocks.some((b) => b.type === "callout")).toBe(true);
  });
});