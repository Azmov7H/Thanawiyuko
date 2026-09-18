import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/server/auth/config";
import { GET as getTeacherProfile, PATCH as patchTeacherProfile } from "@/app/api/teacher/profile/route";
import { PATCH as patchAdminUser } from "@/app/api/admin/users/route";
import { TeacherProfileModel } from "@/server/modules/academic/teacher-profile.model";
import { UserModel } from "@/server/modules/auth/user.model";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";
import { createUser } from "./helpers/seed";

type TestSession = { user: { id: string; role: string } };
const mockedAuth = auth as unknown as { mockResolvedValue: (value: TestSession | null) => void };

let teacher: { _id: unknown };
let student: { _id: unknown };
let superUser: { _id: unknown };

function idOf(doc: { _id: unknown }): string {
  return String(doc._id);
}

function asRole(doc: { _id: unknown }, role: string) {
  mockedAuth.mockResolvedValue({ user: { id: idOf(doc), role } });
}

function profileReq(method: "GET" | "PATCH", body?: unknown) {
  return new Request("http://test.local/api/teacher/profile", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function adminPatchReq(body: unknown) {
  return new Request("http://test.local/api/admin/users", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

beforeEach(async () => {
  await resetTestDb();
  teacher = await createUser({ email: "teacher@test.dev", role: "teacher" });
  student = await createUser({ email: "student@test.dev", role: "student" });
  superUser = await createUser({ email: "super@test.dev", role: "super" });
});

describe("teacher profile stub", () => {
  it("rejects anonymous and non-teacher callers", async () => {
    mockedAuth.mockResolvedValue(null);
    expect((await getTeacherProfile()).status).toBe(403);

    asRole(student, "student");
    expect((await getTeacherProfile()).status).toBe(403);
    expect((await patchTeacherProfile(profileReq("PATCH", { headline: "x" }))).status).toBe(403);
  });

  it("creates the stub on first access with safe defaults", async () => {
    asRole(teacher, "teacher");
    const res = await getTeacherProfile();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      headline: string;
      bio: string;
      subjectAreas: string[];
      isPublic: boolean;
    };
    expect(body).toEqual({ headline: "", bio: "", subjectAreas: [], isPublic: false });
    const stored = await TeacherProfileModel.findOne({ userId: idOf(teacher) }).lean();
    expect(stored).toBeTruthy();
  });

  it("updates own profile and persists it", async () => {
    asRole(teacher, "teacher");
    const res = await patchTeacherProfile(
      profileReq("PATCH", {
        headline: "مدرس فيزياء",
        bio: "خبرة ١٠ سنوات",
        subjectAreas: ["فيزياء", "رياضيات"],
        isPublic: true,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { headline: string; bio: string; subjectAreas: string[] };
    expect(body.headline).toBe("مدرس فيزياء");
    expect(body.subjectAreas).toEqual(["فيزياء", "رياضيات"]);

    const stored = await TeacherProfileModel.findOne({ userId: idOf(teacher) }).lean();
    expect(stored?.headline).toBe("مدرس فيزياء");
    expect(stored?.isPublic).toBe(true);
  });

  it("validates bad input and requires a subject area", async () => {
    asRole(teacher, "teacher");
    const empty = await patchTeacherProfile(profileReq("PATCH", { subjectAreas: [] }));
    expect(empty.status).toBe(400);

    const invalid = await patchTeacherProfile(profileReq("PATCH", { headline: 42 }));
    expect(invalid.status).toBe(400);
  });
});

describe("invite-only teacher role assignment (four-eyes)", () => {
  it("auto-creates the profile stub when super promotes a user to teacher", async () => {
    asRole(superUser, "super");
    const target = await createUser({ email: "candidate@test.dev", role: "student" });
    const res = await patchAdminUser(
      adminPatchReq({ userId: idOf(target), action: "set-role", role: "teacher" }),
    );
    expect(res.status).toBe(200);
    expect((await UserModel.findById(idOf(target)).lean())?.role).toBe("teacher");
    const stub = await TeacherProfileModel.findOne({ userId: idOf(target) }).lean();
    expect(stub).toBeTruthy();
  });

  it("lets an admin suspend a teacher (non-admin) and audits it", async () => {
    const admin = await createUser({ email: "admin@test.dev", role: "admin" });
    asRole(admin, "admin");
    const res = await patchAdminUser(adminPatchReq({ userId: idOf(teacher), action: "suspend" }));
    expect(res.status).toBe(200);
    expect((await UserModel.findById(idOf(teacher)).lean())?.status).toBe("suspended");
  });

  it("forbids an admin from assigning the teacher role", async () => {
    const admin = await createUser({ email: "admin@test.dev", role: "admin" });
    asRole(admin, "admin");
    const target = await createUser({ email: "candidate@test.dev", role: "student" });
    const res = await patchAdminUser(
      adminPatchReq({ userId: idOf(target), action: "set-role", role: "teacher" }),
    );
    expect(res.status).toBe(403);
  });
});