"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Public / logged-in plans page — choose and checkout. */
export default function SubscriptionPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: plans } = useQuery({
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
    try {
      const r = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر بدء الدفع.");
      window.location.href = d.redirectUrl;
    } catch (e) {
      setBusy(null);
      alert(e instanceof Error ? e.message : "تعذر بدء الدفع.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-ink">خطط ثانويكو بلس</h1>
      <p className="text-sm text-ink-mute">اختر الخطة اللي تناسبك — كل الخطط بتديك الوصول الكامل.</p>

      {plans?.map((p) => (
        <article key={p.id} className={`rounded-2xl border p-5 ${p.popular ? "border-brand-600 bg-brand-50" : "border-line bg-surface"}`}>
          {p.popular && <span className="mb-2 inline-block rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">الأكثر شيوعًا</span>}
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">{p.nameAr}</h2>
              <p className="text-sm text-ink-mute">{p.durationDays} يوم</p>
            </div>
            <div className="text-end">
              <p className="tnum text-2xl font-bold text-ink">{p.priceEGP} <span className="text-xl">ج.م</span></p>
              <p className="text-xs text-ink-mute">شامل الضريبة</p>
            </div>
          </div>
          <ul className="mt-4 flex flex-col gap-1.5">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink">
                <svg className="w-4 h-4 text-ok shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => checkout(p.id)}
            disabled={busy === p.id}
            className="mt-4 w-full rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
          >
            {busy === p.id ? "جارٍ التوجيه لبوابة الدفع…" : `اشترك الآن — ${p.priceEGP} ج.م`}
          </button>
        </article>
      ))}
    </div>
  );
}