import { describe, expect, it } from "vitest";
import { onboardingPatchSchema, registerSchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("accepts valid input and normalizes email", () => {
    const r = registerSchema.safeParse({
      name: "أحمد",
      email: "  Ahmed@Example.COM ",
      password: "password123",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ahmed@example.com");
  });

  it("rejects short passwords", () => {
    const r = registerSchema.safeParse({
      name: "أحمد",
      email: "a@b.co",
      password: "short",
    });
    expect(r.success).toBe(false);
  });
});

describe("onboardingPatchSchema", () => {
  it("requires track when finishing sec3 onboarding", () => {
    const r = onboardingPatchSchema.safeParse({ grade: "sec3", done: true });
    expect(r.success).toBe(false);
  });

  it("accepts a complete sec3 finish", () => {
    const r = onboardingPatchSchema.safeParse({
      grade: "sec3",
      track: "science",
      dailyMinutes: 45,
      step: 5,
      done: true,
    });
    expect(r.success).toBe(true);
  });
});
