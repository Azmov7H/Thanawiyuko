"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/** Success page after Paymob redirect. */
export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    // Poll for activation
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/subscription");
        if (r.ok) {
          const d = await r.json();
          if (d.hasPlusAccess) {
            router.push("/subscription?activated=1");
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-full w-full max-w-md mx-auto flex-col items-center justify-center px-4 py-12">
      <svg className="w-16 h-16 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <h1 className="mt-4 text-xl font-bold text-ink">تم الدفع بنجاح!</h1>
      <p className="mt-2 text-sm text-ink-mute">جاري تفعيل اشتراكك… هتنقل تلقائيًا لصفحة الاشتراك.</p>
      <Link href="/subscription" className="mt-4 rounded-lg bg-brand-600 px-6 py-2.5 font-bold text-white">
        اذهب لصفحة الاشتراك
      </Link>
    </div>
  );
}