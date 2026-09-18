import { describe, expect, it } from "vitest";
import { canAssignRole, canManageUser } from "@/lib/admin";

describe("canManageUser (§5.1)", () => {
  it("admin manages non-admins only (students + teachers)", () => {
    expect(canManageUser("admin", "student")).toBe(true);
    expect(canManageUser("admin", "teacher")).toBe(true);
    expect(canManageUser("admin", "admin")).toBe(false);
    expect(canManageUser("admin", "super")).toBe(false);
  });

  it("super manages everyone except other supers", () => {
    expect(canManageUser("super", "student")).toBe(true);
    expect(canManageUser("super", "teacher")).toBe(true);
    expect(canManageUser("super", "admin")).toBe(true);
    expect(canManageUser("super", "super")).toBe(false);
  });
});

describe("canAssignRole", () => {
  it("is super-only and never touches the super flag", () => {
    expect(canAssignRole("super", "student", "admin")).toBe(true);
    expect(canAssignRole("super", "admin", "student")).toBe(true);
    expect(canAssignRole("super", "admin", "super")).toBe(false);
    expect(canAssignRole("super", "super", "admin")).toBe(false);
    expect(canAssignRole("admin", "student", "admin")).toBe(false);
    expect(canAssignRole("super", "student", "parent")).toBe(false);
  });

  it("teacher is invite-only: super grants it, admins cannot (four-eyes publishing)", () => {
    expect(canAssignRole("super", "student", "teacher")).toBe(true);
    expect(canAssignRole("super", "teacher", "student")).toBe(true);
    expect(canAssignRole("super", "admin", "teacher")).toBe(true);
    expect(canAssignRole("admin", "student", "teacher")).toBe(false);
    expect(canAssignRole("super", "super", "teacher")).toBe(false);
  });
});
