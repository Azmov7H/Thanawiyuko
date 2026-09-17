import { describe, expect, it } from "vitest";
import { evaluateResponse, GOLDEN_SAMPLE, runGoldenEval } from "@/server/ai/eval";

describe("golden eval harness", () => {
  it("passes a perfect response", () => {
    const pair = GOLDEN_SAMPLE[0];
    const resp = "الشرح: قانون نيوتن التاني بيقول F = ma، القوة تساوي الكتلة في العجلة. المصدر: درس الحركة وقوانين نيوتن. سؤال للتأكد: لو ضاعفت الكتلة والعجلة ثابتة، القوة تتغير ازاي؟";
    const { pass } = evaluateResponse(pair, resp);
    expect(pass).toBe(true);
  });

  it("fails when required phrase missing", () => {
    const pair = GOLDEN_SAMPLE[0];
    const resp = "القانون التاني بيقول إن القوة بتتحرك."; // missing F=ma, citation
    const { pass, reasons } = evaluateResponse(pair, resp);
    expect(pass).toBe(false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("fails when forbidden phrase appears", () => {
    const pair = GOLDEN_SAMPLE[1];
    const resp = "الموضوع بسيط، استخدم cos للامتداد."; // cos is forbidden
    const { pass } = evaluateResponse(pair, resp);
    expect(pass).toBe(false);
  });

it("runGoldenEval aggregates results", () => {
    const responses = {
      "phy-001": "F = ma، المصدر: درس الحركة. سؤال للتأكد: ؟",
      "phy-002": "sin للامتداد، المصدر: درس المائل. سؤال للتأكد: ؟",
      "math-001": "derivative بتطلع 2x، المصدر: درس الاشتقاق. سؤال للتأكد: ؟",
      "chem-001": "أحادية vs ثنائية، المصدر: درس الهيدروكربونات. سؤال للتأكد: ؟",
      "bio-001": "نسخ ثم ترجمة، المصدر: درس DNA. سؤال للتأكد: ؟",
      "arabic-001": "إن تنصب، كان ترفع، المصدر: درس النواسخ. سؤال للتأكد: ؟",
      "eng-001": "since/for مع Present Perfect، المصدر: درس الأزمنة. سؤال للتأكد: ؟",
    };
    const { passed, total } = runGoldenEval(responses);
    expect(passed).toBeGreaterThanOrEqual(1); // harness works
    expect(total).toBe(GOLDEN_SAMPLE.length);
  });
});