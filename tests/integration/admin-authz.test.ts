import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/server/auth/config";
import { GET as listUsers, PATCH as patchUser } from "@/app/api/admin/users/route";
import { GET as listAudit } from "@/app/api/admin/audit/route";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import { UserModel } from "@/server/modules/auth/user.model";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";
import { createUser } from "./helpers/seed";

type TestSession = { user: { id: string; role: string } };
const mockedAuth = auth as unknown as { mockResolvedValue: (value: TestSession | null) => void };

let superUser: { _id: unknown };
let adminUser: { _id: unknown };
let adminTarget: { _id: unknown };
let studentUser: { _id: unknown };
let studentTarget: { _id: unknown };

function idOf(doc: { _id: unknown }): string {
  return String(doc._id);
}

function asRole(doc: { _id: unknown }, role: string) {
  mockedAuth.mockResolvedValue({ user: { id: idOf(doc), role } });
}

function usersReq(query = "") {
  return new Request(`http://test.local/api/admin/users${query}`);
}

function auditReq(query = "") {
  return new Request(`http://test.local/api/admin/audit${query}`);
}

function patchReq(body: unknown) {
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
  superUser = await createUser({ email: "super@test.dev", role: "super" });
  adminUser = await createUser({ email: "admin@test.dev", role: "admin" });
  adminTarget = await createUser({ email: "admin2@test.dev", role: "admin" });
  studentUser = await createUser({ email: "student@test.dev", role: "student" });
  studentTarget = await createUser({ email: "target@test.dev", role: "student" });
});

describe("admin authorization", () => {
  it("rejects unauthenticated and student callers", async () => {
    mockedAuth.mockResolvedValue(null);
    expect((await listUsers(usersReq())).status).toBe(403);

    asRole(studentUser, "student");
    expect((await listUsers(usersReq())).status).toBe(403);
  });

  it("lets an admin list and search users", async () => {
    asRole(adminUser, "admin");
    const res = await listUsers(usersReq("?q=target"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      viewerRole: string;
      items: Array<{ email: string }>;
      total: number;
    };
    expect(body.viewerRole).toBe("admin");
    expect(body.total).toBe(1);
    expect(body.items[0].email).toBe("target@test.dev");
  });

  it("never exposes secrets in the list payload", async () => {
    asRole(adminUser, "admin");
    const body = (await (await listUsers(usersReq())).json()) as {
      items: Array<Record<string, unknown>>;
    };
    for (const item of body.items) {
      expect(item).not.toHaveProperty("passwordHash");
      expect(item).not.toHaveProperty("password");
    }
  });

  it("blocks self-modification", async () => {
    asRole(adminUser, "admin");
    const res = await patchUser(patchReq({ userId: idOf(adminUser), action: "suspend" }));
    expect(res.status).toBe(403);
  });

  it("lets an admin suspend a student and writes an audit entry", async () => {
    asRole(adminUser, "admin");
    const res = await patchUser(patchReq({ userId: idOf(studentTarget), action: "suspend" }));
    expect(res.status).toBe(200);

    const target = await UserModel.findById(idOf(studentTarget)).lean();
    expect(target?.status).toBe("suspended");

    const audit = await AuditLogModel.findOne({ action: "user.suspend" }).lean();
    expect(audit?.entityId).toBe(idOf(studentTarget));
    expect(String(audit?.actorId)).toBe(idOf(adminUser));
  });

  it("forbids an admin from managing another admin", async () => {
    asRole(adminUser, "admin");
    const res = await patchUser(patchReq({ userId: idOf(adminTarget), action: "suspend" }));
    expect(res.status).toBe(403);
  });

  it("restricts role assignment to super and never to super", async () => {
    asRole(adminUser, "admin");
    const asAdmin = await patchUser(
      patchReq({ userId: idOf(studentTarget), action: "set-role", role: "admin" }),
    );
    expect(asAdmin.status).toBe(403);

    asRole(superUser, "super");
    const promote = await patchUser(
      patchReq({ userId: idOf(studentTarget), action: "set-role", role: "admin" }),
    );
    expect(promote.status).toBe(200);
    const promoted = await UserModel.findById(idOf(studentTarget)).lean();
    expect(promoted?.role).toBe("admin");

    const ontoSuper = await patchUser(
      patchReq({ userId: idOf(superUser), action: "set-role", role: "admin" }),
    );
    expect(ontoSuper.status).toBe(403);
  });

  it("validates the patch body", async () => {
    asRole(superUser, "super");
    const res = await patchUser(patchReq({ userId: idOf(studentTarget), action: "set-role" }));
    expect(res.status).toBe(400);
  });

  it("guards the audit trail and returns entries to admins", async () => {
    asRole(studentUser, "student");
    expect((await listAudit(auditReq())).status).toBe(403);

    asRole(adminUser, "admin");
    await patchUser(patchReq({ userId: idOf(studentTarget), action: "activate" }));
    const res = await listAudit(auditReq("?entity=user&action=user.activate"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ action: string }>; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0].action).toBe("user.activate");
  });
});
