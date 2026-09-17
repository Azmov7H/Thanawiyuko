"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, guardianConsent }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        (data?.messageAr as string) ?? "تعذر إنشاء الحساب. حاول مجددًا.",
      );
      setBusy(false);
      return;
    }
    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (login?.error) {
      router.push("/login");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-ink">أنشئ حسابك مجانًا</h1>
      <p className="mt-1 text-sm text-ink-mute">
        خطوة واحدة وتدخل على نظام مذاكرتك.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          الاسم
          <input
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-mute"
            placeholder="مثال: أحمد محمد"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          البريد الإلكتروني
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-mute"
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          كلمة المرور (8 أحرف على الأقل)
          <input
            type="password"
            required
            minLength={8}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-ink"
            placeholder="••••••••"
          />
        </label>
        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            required
            checked={guardianConsent}
            onChange={(e) => setGuardianConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            أقر بأنني أبلغت ولي أمري ووافق، وأوافق على{" "}
            <Link href="/terms" className="font-bold text-brand-700 underline">
              شروط الاستخدام
            </Link>{" "}
            و
            <Link href="/privacy" className="font-bold text-brand-700 underline">
              سياسة الخصوصية
            </Link>
            .
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !guardianConsent}
          className="rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? "جارٍ إنشاء الحساب…" : "ابدأ مجانًا"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-mute">
        عندك حساب؟{" "}
        <Link href="/login" className="font-bold text-brand-700">
          سجّل الدخول
        </Link>
      </p>
    </div>
  );
}
