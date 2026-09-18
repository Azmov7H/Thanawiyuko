"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useModal } from "@/lib/use-modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";

type Invoice = {
  id: string;
  amountEGP: number;
  currency: string;
  status: string;
  createdAt: string;
  providerRef?: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  succeeded: { label: "مدفوع", cls: "text-ok" },
  refunded: { label: "مسترد", cls: "text-gold-accent" },
  pending: { label: "قيد المعالجة", cls: "text-ink-mute" },
  failed: { label: "فاشل", cls: "text-bad" },
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

  if (subPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (subError) return <ErrorState title="تعذر تحميل اشتراكك — حاول مرة أخرى بعد قليل." onRetry={() => refetch()} />;

  const endLabel = sub.subscription?.currentPeriodEnd
    ? new Date(sub.subscription.currentPeriodEnd).toLocaleDateString("ar-EG")
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="حسابك المدفوع"
        title="إدارة الاشتراك"
        description="شوف حالتك وفواتيرك — ولو حببت تلغي، اختار بطريقة مريحة."
      />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-strong">
            <Icon name="bolt" size={22} />
          </span>
          <div>
            <h2 className="font-bold text-ink">{sub.subscription?.plan ?? "مجاني"}</h2>
            <p className="tnum mt-0.5 text-sm text-ink-mute">تنتهي في {endLabel}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            sub.hasPlusAccess ? "bg-success-bg text-ok" : "bg-danger-bg text-bad"
          }`}
        >
          {sub.hasPlusAccess ? "بلس نشط" : "مجاني"}
        </span>
      </section>

      {sub.subscription?.cancelAtPeriodEnd && (
        <p className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-gold-accent">
          الاشتراك ملغي — سينتهي تلقائيًا في نهاية الفترة.
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <SectionHeader title="الفواتير" meta={<span className="tnum text-xs text-ink-mute">{invoices?.length ?? 0} فاتورة</span>} />
        {invoicesPending ? (
          <div className="mt-3 flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : invoicesError ? (
          <p className="mt-3 text-sm text-ink-mute">تعذر تحميل الفواتير.</p>
        ) : invoices?.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {invoices.map((inv) => {
              const st = STATUS_LABEL[inv.status] ?? { label: inv.status, cls: "text-ink-mute" };
              return (
                <li key={inv.id} className="flex items-center justify-between rounded-lg border border-line bg-base p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Icon name="check" size={16} className={st.cls} />
                    <span className="tnum font-medium text-ink">{inv.amountEGP} ج.م</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`tnum text-xs ${st.cls}`}>{st.label}</span>
                    <span className="tnum text-xs text-ink-mute">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">لا فواتير بعد.</p>
        )}
      </section>

      <section className="rounded-2xl border border-danger-line bg-danger-bg p-5">
        <h2 className="font-bold text-bad">إلغاء الاشتراك</h2>
        <p className="mt-1 text-sm text-ink-mute">
          تقدر تكمل بالمجاني لحد نهاية الفترة المدفوعة. لو عايز تلغي فورًا (بدون استرداد)، اختار الخيار التاني.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setConfirming(true)} variant="secondary" className="flex-1">
            إلغاء في نهاية الفترة
          </Button>
          <Button onClick={() => setConfirming(true)} variant="danger" className="flex-1">
            إلغاء فوري (بدون استرداد)
          </Button>
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
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-overlay">
            <h2 id="cancel-subscription-title" className="font-bold text-ink">تأكيد الإلغاء؟</h2>
            <p className="mt-2 text-sm text-ink-mute">
              تقدر تكمل بلس لحد {endLabel}.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => cancel(true)} disabled={canceling} variant="danger" className="w-full">
                {canceling ? "جارٍ…" : "تأكيد الإلغاء الفوري"}
              </Button>
              <Button onClick={() => cancel(false)} disabled={canceling} variant="secondary" className="w-full">
                {canceling ? "جارٍ…" : "إلغاء في نهاية الفترة"}
              </Button>
              <Button onClick={() => setConfirming(false)} variant="ghost" className="w-full">
                تراجع
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}