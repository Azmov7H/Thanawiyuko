import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/server/auth/config";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as deleteRequest } from "@/app/api/account/delete-request/route";
import { POST as deleteCancel } from "@/app/api/account/delete-cancel/route";
import { GET as exportData } from "@/app/api/account/export/route";
import { UserModel } from "@/server/modules/auth/user.model";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { SubscriptionModel } from "@/server/modules/billing/subscription.model";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import { hashPassword } from "@/lib/password";
import { processFinalDeletion } from "@/server/modules/account/service";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";

type TestSession = { user: { id: string; role: string } };
const mockedAuth = auth as unknown as { mockResolvedValue: (value: TestSession | null) => void };

const PASSWORD = "password123";

function jsonReq(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createActiveUser(email: string) {
  const user = await UserModel.create({
    name: "طالب اختبار",
    email,
    passwordHash: await hashPassword(PASSWORD),
    role: "student",
    guardianConsentAt: new Date(),
  });
  await StudentProfileModel.create({ userId: user._id });
  return user;
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(resetTestDb);

describe("registration consent", () => {
  it("stores guardian consent and rejects registration without it", async () => {
    const missing = await register(
      jsonReq("http://test.local/api/auth/register", {
        name: "أحمد",
        email: "no-consent@test.dev",
        password: PASSWORD,
      }),
    );
    expect(missing.status).toBe(400);
    expect(await UserModel.countDocuments({ email: "no-consent@test.dev" })).toBe(0);

    const ok = await register(
      jsonReq("http://test.local/api/auth/register", {
        name: "أحمد",
        email: "consent@test.dev",
        password: PASSWORD,
        guardianConsent: true,
      }),
    );
    expect(ok.status).toBe(201);
    const user = await UserModel.findOne({ email: "consent@test.dev" }).lean();
    expect(user?.guardianConsentAt).toBeInstanceOf(Date);
  });
});

describe("account deletion lifecycle", () => {
  it("requires the correct password to request deletion", async () => {
    const user = await createActiveUser("req@test.dev");
    mockedAuth.mockResolvedValue({ user: { id: String(user._id), role: "student" } });

    const wrong = await deleteRequest(
      jsonReq("http://test.local/api/account/delete-request", { password: "wrong-pass" }),
    );
    expect(wrong.status).toBe(403);

    const right = await deleteRequest(
      jsonReq("http://test.local/api/account/delete-request", { password: PASSWORD }),
    );
    expect(right.status).toBe(200);
    const body = (await right.json()) as { purgeAt: string };
    expect(typeof body.purgeAt).toBe("string");

    const after = await UserModel.findById(user._id).lean();
    expect(after?.status).toBe("deletion_pending");
    expect(after?.deletionRequestedAt).toBeInstanceOf(Date);

    const audit = await AuditLogModel.findOne({ action: "account.delete_request" }).lean();
    expect(audit?.entityId).toBe(String(user._id));
  });

  it("lets a pending user cancel and reactivate", async () => {
    const user = await createActiveUser("cancel@test.dev");
    mockedAuth.mockResolvedValue({ user: { id: String(user._id), role: "student" } });

    await deleteRequest(
      jsonReq("http://test.local/api/account/delete-request", { password: PASSWORD }),
    );
    const res = await deleteCancel();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { reverted: boolean }).reverted).toBe(true);

    const after = await UserModel.findById(user._id).lean();
    expect(after?.status).toBe("active");
    expect(after?.deletionRequestedAt).toBeNull();
  });

  it("exports the student's own data as JSON", async () => {
    const user = await createActiveUser("export@test.dev");
    await SubscriptionModel.create({
      studentId: user._id,
      tier: "plus",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    });
    mockedAuth.mockResolvedValue({ user: { id: String(user._id), role: "student" } });

    const res = await exportData();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { email: string };
      profile: { userId: string } | null;
      subscription: { tier: string } | null;
    };
    expect(body.user.email).toBe("export@test.dev");
    expect(body.profile).not.toBeNull();
    expect(body.subscription?.tier).toBe("plus");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("purges only accounts past the grace period and anonymizes them", async () => {
    const due = await createActiveUser("due@test.dev");
    const fresh = await createActiveUser("fresh@test.dev");
    await SubscriptionModel.create({
      studentId: due._id,
      tier: "plus",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    });

    await UserModel.updateOne(
      { _id: due._id },
      { $set: { status: "deletion_pending", deletionRequestedAt: new Date(Date.now() - 31 * 86_400_000) } },
    );
    await UserModel.updateOne(
      { _id: fresh._id },
      { $set: { status: "deletion_pending", deletionRequestedAt: new Date() } },
    );

    const { purged } = await processFinalDeletion();
    expect(purged).toBe(1);

    const purgedUser = await UserModel.findById(due._id).lean();
    expect(purgedUser?.status).toBe("deleted");
    expect(purgedUser?.email).toBe(`deleted_${due._id}@thanawico.local`);
    expect(purgedUser?.name).toContain("مستخدم محذوف");
    expect(await StudentProfileModel.findOne({ userId: due._id }).lean()).toBeNull();

    const sub = await SubscriptionModel.findOne({ studentId: due._id }).lean();
    expect(sub?.tier).toBe("free");
    expect(sub?.status).toBe("cancelled");

    const freshUser = await UserModel.findById(fresh._id).lean();
    expect(freshUser?.status).toBe("deletion_pending");

    const audit = await AuditLogModel.findOne({ action: "account.final_delete" }).lean();
    expect(audit?.entityId).toBe(String(due._id));
  });
});
