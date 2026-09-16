/**
 * Golden evaluation set (100 pairs) — M6 gate.
 * Each entry: { question, expectedContains, mustNotContain, category }
 * Run via: npm run eval:ai (to be wired in CI).
 * For MVP, a small sample here; full set loaded from JSON in CI.
 */

export type GoldenPair = {
  id: string;
  question: string;
  expectedContains: string[];
  mustNotContain: string[];
  category: "math" | "physics" | "chemistry" | "biology" | "arabic" | "english" | "general";
  lessonHint: string; // topic key for RAG context
};

export const GOLDEN_SAMPLE: GoldenPair[] = [
  {
    id: "phy-001",
    question: "اشرح لي قانون نيوتن التاني بخطوات",
    expectedContains: ["F = ma", "قوة", "كتلة", "عجلة", "المصدر: درس"],
    mustNotContain: ["القانون التالت", "الجاذبية"],
    category: "physics",
    lessonHint: "phy-sec3/u1/t2",
  },
  {
    id: "phy-002",
    question: "ليه المركبة على المائل بتكون sin مش cos؟",
    expectedContains: ["sin", "الامتداد", "زاوية", "المصدر: درس"],
    mustNotContain: ["cos", "العمودي"],
    category: "physics",
    lessonHint: "phy-sec3/u1/t3",
  },
  {
    id: "math-001",
    question: "ازاي أderivative لـ x^2؟",
    expectedContains: ["2x", "قوة", "تنزل واحد", "المصدر: درس"],
    mustNotContain: ["تكامل", "integral"],
    category: "math",
    lessonHint: "pure-sec3/u1/t2",
  },
  {
    id: "chem-001",
    question: "الفرق بين الألكان والألكين؟",
    expectedContains: ["أحادية", "ثنائية", "رابطة", "المصدر: درس"],
    mustNotContain: ["الكحول", "الأكسجين"],
    category: "chemistry",
    lessonHint: "chem-sec3/u1/t1",
  },
  {
    id: "bio-001",
    question: "دور الـ DNA في تخليق البروتين؟",
    expectedContains: ["نسخ", "ترجمة", "ريبوسوم", "المصدر: درس"],
    mustNotContain: ["الانقسام", "الخلايا"],
    category: "biology",
    lessonHint: "bio-sec3/u1/t2",
  },
  {
    id: "arabic-001",
    question: "ما الفرق بين النصب والجر في النواسخ؟",
    expectedContains: ["إن", "كان", "المصدر: درس"],
    mustNotContain: ["الرفع", "الفاعل"],
    category: "arabic",
    lessonHint: "ar-sec3/u1/t1",
  },
  {
    id: "eng-001",
    question: "متى أستخدم Present Perfect مش Past Simple؟",
    expectedContains: ["since", "for", "ماضي", "الحاضر", "المصدر: درس"],
    mustNotContain: ["Future", "المستقبل"],
    category: "english",
    lessonHint: "en-sec3/u1/t1",
  },
];

/** Check a model response against golden expectations. */
export function evaluateResponse(pair: typeof GOLDEN_SAMPLE[0], response: string): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let pass = true;
  for (const exp of pair.expectedContains) {
    if (!response.includes(exp)) {
      pass = false;
      reasons.push(`مفقود: "${exp}"`);
    }
  }
  for (const bad of pair.mustNotContain) {
    if (response.includes(bad)) {
      pass = false;
      reasons.push(`ممنوع ظهر: "${bad}"`);
    }
  }
  return { pass, reasons };
}

/** Run full eval (to be called from CLI/CI). */
export function runGoldenEval(responses: Record<string, string>): { passed: number; total: number; failures: string[] } {
  let passed = 0;
  const failures: string[] = [];
  for (const pair of GOLDEN_SAMPLE) {
    const resp = responses[pair.id] ?? "";
    const { pass, reasons } = evaluateResponse(pair, resp);
    if (pass) passed++;
    else failures.push(`${pair.id} (${pair.category}): ${reasons.join("؛ ")}`);
  }
  return { passed, total: GOLDEN_SAMPLE.length, failures };
}