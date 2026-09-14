import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing (scrypt)", () => {
  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("correct-horse-123");
    expect(await verifyPassword("correct-horse-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});
