"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Success page after Paymob redirect. */
export default function SubscriptionSuccessPage() {
  const router = useRouter();

  useEffect(() => {
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
  }, [router]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-ok">
        <Icon name="check" size={32} />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-ink">تم الدفع بنجاح!</h1>
      <p className="mt-2 text-sm text-ink-mute">
        جارٍ تفعيل اشتراكك… هتنتقل تلقائيًا لصفحة الاشتراك.
      </p>
      <Button href="/subscription" icon="bolt" className="mt-4">
        اذهب لصفحة الاشتراك
      </Button>
    </div>
  );
}