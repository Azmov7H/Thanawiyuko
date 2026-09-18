"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useModal } from "@/lib/use-modal";

type Invoice = {
  id: string;
  amountEGP: number;
  currency: string;
  status: string;
  createdAt: string;
  providerRef?: string;
};

/** Manage current subscription: view status, invoices, cancel. */
export default function SubscriptionManagePage() {
  const [confirming, setConfirming] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useModal<HTMLDivElement>(confirming, () => setConfirming(false));

  const { data: sub, isPending: subPending, isError: subError, refetch } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const r = await fetch("/api/subscription");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as {
        subscription: { tier: string; plan: string; status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null;
        hasPlusAccess: boolean;
        plans: Array<{ id: string; nameAr: string; priceEGP: number }>;
      };
    },
  });

  const { data: invoices, isPending: invoicesPending, isError: invoicesError } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const r = await fetch("/api/subscription/invoices");
      if (!r.ok) throw new Error("تعذر تحميل الفواتير.");
      return (await r.json()) as Invoice[];
    },
    enabled: true,
  });

  async function cancel(immediate: boolean) {
    setCanceling(true);
    setError("");
    try {
      const r = await fetch("/api/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ immediate }),
      });
      if (!r.ok) throw new Error("تعذر الإلغاء.");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الإلغاء.");
    } finally {
      setCanceling(false);
      setConfirming(false);
    }
  }

  if (subPending) return <p className="py-10 text-center text-sm text-ink-mute">جارٍ التحميل…</p>;

  if (subError)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          تعذر تحميل اشتراكك — حاول مرة أخرى بعد قليل.
        </p>
        <button type="button" onClick={() => refetch()} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-bold text-white">
          إعادة المحاولة
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-ink">إدارة الاشتراك</h1>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-ink">خطتك الحالية</h2>
            <p className="tnum text-sm text-ink-mute">تنتهي في {sub.subscription?.currentPeriodEnd ? new Date(sub.subscription.currentPeriodEnd).toLocaleDateString("ar-EG") : "—"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${sub.hasPlusAccess ? "bg-success-bg text-ok" : "bg-danger-bg text-bad"}`}>
            {sub.hasPlusAccess ? "بلس نشط" : "مجاني"}
          </span>
        </div>
        {sub.subscription?.cancelAtPeriodEnd && (
          <p className="mt-2 text-sm text-gold-accent">الاشتراك ملغي — هينتهي في نهاية الفترة.</p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-bold text-ink">الفواتير</h2>
        {invoicesPending ? (
          <p className="mt-3 text-sm text-ink-mute">جارٍ تحميل الفواتير…</p>
        ) : invoicesError ? (
          <p className="mt-3 text-sm text-bad">تعذر تحميل الفواتير.</p>
        ) : invoices?.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between rounded-lg border border-line bg-base p-3 text-sm">
                <div>
                  <span className="font-medium text-ink">{inv.amountEGP} ج.م</span>
                  <span className="mx-2 text-ink-mute">•</span>
                  <span className={`tnum ${inv.status === "succeeded" ? "text-ok" : inv.status === "refunded" ? "text-gold-accent" : "text-bad"}`}>{inv.status}</span>
                </div>
                <span className="tnum text-xs text-ink-mute">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">لا فواتير بعد.</p>
        )}
      </section>

      <section className="rounded-2xl border border-danger-line bg-danger-bg p-5">
        <h2 className="font-bold text-bad">إلغاء الاشتراك</h2>
        <p className="mt-1 text-sm text-ink-mute">هتقدر تكمل تستخدم بلس لحد نهاية الفترة المدفوعة. لو عايز تلغي فورًا (بدون استرداد)، اختر الخيار التاني.</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setConfirming(true)}
            className="flex-1 rounded-lg border border-danger-line bg-surface py-2.5 font-bold text-bad"
          >
            إلغاء في نهاية الفترة
          </button>
          <button
            onClick={() => { setConfirming(true); /* immediate handled in confirm */ }}
            className="flex-1 rounded-lg bg-danger-solid py-2.5 font-bold text-white"
          >
            إلغاء فوري (بدون استرداد)
          </button>
        </div>
      </section>

      {confirming && (
        <div
          ref={confirmRef}
          tabIndex={-1}
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4 outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-subscription-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5">
            <h2 id="cancel-subscription-title" className="font-bold text-ink">تأكيد الإلغاء؟</h2>
            <p className="mt-2 text-sm text-ink-mute">هتقدر تكمل تستخدم بلس لحد {sub.subscription?.currentPeriodEnd ? new Date(sub.subscription.currentPeriodEnd).toLocaleDateString("ar-EG") : "نهاية الفترة"}.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirming(false)} className="flex-1 rounded-lg border border-line py-2.5 font-bold text-ink">
                تراجع
              </button>
              <button
                onClick={() => cancel(false)}
                disabled={canceling}
                className="flex-1 rounded-lg border border-danger-line bg-surface py-2.5 font-bold text-bad disabled:opacity-50"
              >
                {canceling ? "جارٍ…" : "تأكيد الإلغاء في نهاية الفترة"}
              </button>
              <button
                onClick={() => cancel(true)}
                disabled={canceling}
                className="flex-1 rounded-lg bg-danger-solid py-2.5 font-bold text-white disabled:opacity-50"
              >
                {canceling ? "جارٍ…" : "تأكيد الإلغاء الفوري"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}