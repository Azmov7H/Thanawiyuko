"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";

/** Public / logged-in plans page — choose and checkout. */
export default function SubscriptionPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: plans, isPending, isError, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const r = await fetch("/api/subscription/checkout");
      if (r.status === 401) router.push("/login");
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d.plans as Array<{ id: string; nameAr: string; nameEn: string; priceEGP: number; durationDays: number; popular?: boolean; features: string[] }>;
    },
  });

  async function checkout(planId: string) {
    setBusy(planId);
    setError("");
    try {
      const r = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر بدء الدفع.");
      window.location.assign(d.redirectUrl);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "تعذر بدء الدفع.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="افتح كل قدراتك"
        title="خطط ثانويكو بلس"
        description="اختر الخطة اللي تناسبك — كل الخطط بتديك الوصول الكامل."
      />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      {isPending && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}

      {isError && <ErrorState title="تعذر تحميل الخطط — حاول مرة أخرى بعد قليل." onRetry={() => refetch()} />}

      {plans?.length === 0 && !isPending && !isError && (
        <p className="py-6 text-center text-sm text-ink-mute">لا خطط متاحة حاليًا.</p>
      )}

      {plans?.map((p) => (
        <article
          key={p.id}
          className={`relative rounded-2xl border p-5 ${
            p.popular ? "border-brand-accent bg-brand-tint" : "border-line bg-surface"
          }`}
        >
          {p.popular && (
            <span className="absolute -top-3 start-5 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
              الأكثر شيوعًا
            </span>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">{p.nameAr}</h2>
              <p className="text-sm text-ink-mute">{p.durationDays} يوم</p>
            </div>
            <div className="text-end">
              <p className="tnum text-2xl font-bold text-ink">
                {p.priceEGP} <span className="text-xl">ج.م</span>
              </p>
              <p className="text-xs text-ink-mute">شامل الضريبة</p>
            </div>
          </div>
          <ul className="mt-4 flex flex-col gap-1.5">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink">
                <Icon name="check" size={16} className="shrink-0 text-ok" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => checkout(p.id)}
            disabled={busy === p.id}
            className="mt-4 w-full"
          >
            {busy === p.id ? "جارٍ التوجيه لبوابة الدفع…" : `اشترك الآن — ${p.priceEGP} ج.م`}
          </Button>
        </article>
      ))}
    </div>
  );
}