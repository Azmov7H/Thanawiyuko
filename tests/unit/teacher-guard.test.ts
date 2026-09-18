import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/server/auth/config";
import { TeacherForbidden, requireTeacherUser } from "@/server/modules/teacher/guard";

type TestSession = { user: { id: string; role: string } } | null;
const mockedAuth = auth as unknown as {
  mockResolvedValue: (v: TestSession) => void;
  mockRejectedValueOnce: (e: Error) => void;
};

describe("requireTeacherUser", () => {
  it("accepts a teacher session", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "t1", role: "teacher" } });
    await expect(requireTeacherUser()).resolves.toEqual({ id: "t1" });
  });

  it("rejects students, admins, supers, and anonymous callers", async () => {
    for (const role of ["student", "admin", "super"]) {
      mockedAuth.mockResolvedValue({ user: { id: "x", role } });
      await expect(requireTeacherUser()).rejects.toBeInstanceOf(TeacherForbidden);
    }
    mockedAuth.mockResolvedValue(null);
    await expect(requireTeacherUser()).rejects.toBeInstanceOf(TeacherForbidden);
  });

  it("rejects when auth() itself throws", async () => {
    mockedAuth.mockRejectedValueOnce(new Error("boom"));
    await expect(requireTeacherUser()).rejects.toBeInstanceOf(TeacherForbidden);
  });
});