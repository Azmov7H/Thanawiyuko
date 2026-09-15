import { describe, expect, it } from "vitest";
import { seededRng, shuffled } from "@/lib/random";

describe("seeded shuffle", () => {
  it("is deterministic per seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffled(arr, 42)).toEqual(shuffled(arr, 42));
  });

  it("preserves all elements", () => {
    const arr = ["a", "b", "c", "d"];
    expect([...shuffled(arr, 7)].sort()).toEqual([...arr].sort());
  });

  it("does not mutate the input", () => {
    const arr = [1, 2, 3];
    shuffled(arr, 1);
    expect(arr).toEqual([1, 2, 3]);
  });

  it("rng streams differ across seeds", () => {
    const a = seededRng(1)();
    const b = seededRng(2)();
    expect(a).not.toBe(b);
  });
});
