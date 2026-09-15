/** Academic domain rules (pure, testable). */

/** Track-grade rule (M2): sec1/sec2 have no streams — always "general". */
export function normalizeTrack(
  grade: "sec1" | "sec2" | "sec3",
  track: string | null | undefined,
): string {
  if (grade === "sec1" || grade === "sec2") return "general";
  return track ?? "general";
}
