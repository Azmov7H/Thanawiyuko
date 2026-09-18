"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("بيانات الدخول غير صحيحة أو حاولت كثيرًا. انتظر قليلًا وحاول مجددًا.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-ink">تسجيل الدخول</h1>
      <p className="mt-1 text-sm text-ink-mute">أهلًا بعودتك يا بطل.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
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
          كلمة المرور
          <input
            type="password"
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-ink"
            placeholder="••••••••"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? "جارٍ الدخول…" : "دخول"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-mute">
        معندكش حساب؟{" "}
        <Link href="/register" className="font-bold text-brand-strong">
          أنشئ حسابًا
        </Link>
      </p>
    </div>
  );
}
