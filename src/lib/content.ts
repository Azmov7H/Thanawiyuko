/** Content lifecycle rules — pure, no server imports (§14: pure logic in lib). */

export const TRANSITIONS: Record<string, string[]> = {
  draft: ["review"],
  review: ["draft", "published"],
  published: ["archived"],
  archived: ["draft"],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextVersion(v: number): number {
  return v + 1;
}
