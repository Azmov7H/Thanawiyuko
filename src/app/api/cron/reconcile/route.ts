import { reconcileGracePeriod } from "@/server/billing/service";
import { reconcileStreaks } from "@/server/modules/gamification/service";
import { logServerError } from "@/server/logger";
import { NextResponse } from "next/server";

/** Daily cron: grace period reconciliation + streak reconciliation. */
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await reconcileGracePeriod();
    await reconcileStreaks();
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    await logServerError("cron.reconcile.failed", e, { route: "/api/cron/reconcile", job: "reconcile" });
    return NextResponse.json({ ok: false, error: "reconciliation_failed" }, { status: 500 });
  }
}