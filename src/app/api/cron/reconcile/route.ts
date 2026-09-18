import { reconcileGracePeriod } from "@/server/billing/service";
import { reconcileStreaks } from "@/server/modules/gamification/service";
import { processFinalDeletion } from "@/server/modules/account/service";
import { processPendingNotifications } from "@/server/modules/notifications/service";
import { logServerError } from "@/server/logger";
import { NextResponse } from "next/server";

/** Daily cron: grace period + streak reconciliation + expired account deletions + pending notifications. */
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await reconcileGracePeriod();
    await reconcileStreaks();
    const { purged } = await processFinalDeletion();
    const notifications = await processPendingNotifications();
    return NextResponse.json({
      ok: true,
      purged,
      notifications,
      at: new Date().toISOString(),
    });
  } catch (e) {
    await logServerError("cron.reconcile.failed", e, { route: "/api/cron/reconcile", job: "reconcile" });
    return NextResponse.json({ ok: false, error: "reconciliation_failed" }, { status: 500 });
  }
}