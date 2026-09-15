import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { QuestionModel } from "@/server/modules/questions/question.model";

const base = {
  topicId: new mongoose.Types.ObjectId(),
  type: "mcq_single",
  stemMD: "سؤال تجريبي؟",
  options: [
    { key: "a", text: "خيار 1", rationale: null },
    { key: "b", text: "خيار 2", rationale: null },
  ],
  correctKeys: ["a"],
  difficulty: "easy",
};

describe("question review gate", () => {
  it("rejects a question without explanation (M2 gate)", async () => {
    const q = new QuestionModel({ ...base, explanationMD: "" });
    await expect(q.validate()).rejects.toThrow();
  });

  it("rejects an explanation that is too short", async () => {
    const q = new QuestionModel({ ...base, explanationMD: "قصير" });
    await expect(q.validate()).rejects.toThrow();
  });

  it("accepts a fully specified question", async () => {
    const q = new QuestionModel({
      ...base,
      explanationMD: "شرح كامل بخطوات واضحة يتجاوز الحد الأدنى للطول المطلوب هنا.",
    });
    await expect(q.validate()).resolves.toBeUndefined();
  });
});
