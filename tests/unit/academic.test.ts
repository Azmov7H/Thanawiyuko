import { describe, expect, it } from "vitest";
import { normalizeTrack } from "@/lib/academic";

describe("normalizeTrack", () => {
  it("forces general for sec1/sec2 regardless of input", () => {
    expect(normalizeTrack("sec1", "science")).toBe("general");
    expect(normalizeTrack("sec2", null)).toBe("general");
  });

  it("keeps the chosen stream for sec3", () => {
    expect(normalizeTrack("sec3", "science")).toBe("science");
    expect(normalizeTrack("sec3", null)).toBe("general");
  });
});
