import { describe, expect, it } from "vitest";
import { CURRICULUM, topicSeedKey } from "../../data/curriculum-3rd-sec";
import { SAMPLE_QUESTIONS } from "../../data/sample-questions";

/** Offline seed integrity: no DB required. The seed script itself needs DATABASE_URL. */
describe("curriculum seed", () => {
  it("has unique subject codes with valid tracks", () => {
    const codes = CURRICULUM.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of CURRICULUM) {
      expect(s.units.length).toBeGreaterThan(0);
      for (const t of s.tracks) {
        expect(["science", "math", "literary"]).toContain(t);
      }
      s.units.forEach((u, ui) => {
        expect(u.topics.length).toBeGreaterThan(0);
        u.topics.forEach((t, ti) => {
          expect(t.title.length).toBeGreaterThan(0);
          expect(t.tags.length).toBeGreaterThan(0);
          expect(topicSeedKey(s.code, ui + 1, ti + 1)).toBe(
            `${s.code}/u${ui + 1}/t${ti + 1}`,
          );
        });
      });
    }
  });

  it("covers all three sec3 streams", () => {
    const covered = new Set(CURRICULUM.flatMap((s) => s.tracks));
    expect(covered).toEqual(new Set(["science", "math", "literary"]));
  });

  it("every sample question resolves to a real topic with consistent options", () => {
    const keys = new Set<string>();
    for (const s of CURRICULUM) {
      s.units.forEach((u, ui) =>
        u.topics.forEach((_, ti) => keys.add(topicSeedKey(s.code, ui + 1, ti + 1))),
      );
    }
    for (const q of SAMPLE_QUESTIONS) {
      expect(keys.has(q.topicKey)).toBe(true);
      const optKeys = q.options.map((o) => o.key);
      expect(new Set(optKeys).size).toBe(optKeys.length);
      for (const c of q.correctKeys) expect(optKeys).toContain(c);
      if (q.type === "mcq_single") {
        expect(q.correctKeys).toHaveLength(1);
        expect(q.options).toHaveLength(4);
      } else {
        expect(q.options).toHaveLength(2);
      }
      expect(q.explanationMD.length).toBeGreaterThanOrEqual(20);
    }
  });
});
