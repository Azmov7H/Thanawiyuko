import { describe, expect, it } from "vitest";
import { canTransition, nextVersion } from "@/lib/content";

describe("content lifecycle (draft → review → published → archived)", () => {
  it("allows the canonical path", () => {
    expect(canTransition("draft", "review")).toBe(true);
    expect(canTransition("review", "published")).toBe(true);
    expect(canTransition("published", "archived")).toBe(true);
  });

  it("allows rejection and rework", () => {
    expect(canTransition("review", "draft")).toBe(true);
    expect(canTransition("archived", "draft")).toBe(true);
  });

  it("rejects skips and backward jumps", () => {
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("published", "draft")).toBe(false);
    expect(canTransition("published", "review")).toBe(false);
    expect(canTransition("archived", "published")).toBe(false);
    expect(canTransition("nope", "draft")).toBe(false);
  });
});

describe("nextVersion", () => {
  it("bumps monotonically", () => {
    expect(nextVersion(1)).toBe(2);
  });
});
