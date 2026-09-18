"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RoleMode = "student" | "teacher";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<RoleMode>("student");
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
    const s = await fetch("/api/auth/session").then((r) => r.json());
    const role = (s?.user?.role ?? "student") as string;
    if (role === "teacher") router.push("/teacher");
    else if (role === "admin" || role === "super") router.push("/admin");
    else router.push("/dashboard");
    router.refresh();
  }

  const isTeacherMode = mode === "teacher";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">
          {isTeacherMode ? "دخول المعلمين" : "تسجيل الدخول"}
        </h1>
        <p className="text-sm text-ink-mute">
          {isTeacherMode
            ? "منصة المعلمين مخصصة للدعوات. سجّل بدخول الحساب الممنوح لك."
            : "أهلًا بعودتك يا بطل."}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="نوع الحساب"
        className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-base p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "student"}
          onClick={() => setMode("student")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "student" ? "bg-brand-600 font-bold text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          طالب
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "teacher"}
          onClick={() => setMode("teacher")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "teacher" ? "bg-brand-600 font-bold text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          مدرس
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          البريد الإلكتروني
          <input
            type="email"
            required
            dir="ltr"
            autoComplete="email"
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
            autoComplete="current-password"
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
          {busy ? "جارٍ الدخول…" : isTeacherMode ? "دخول المعلم" : "دخول"}
        </button>
      </form>

      {isTeacherMode ? (
        <p className="mt-4 text-center text-sm text-ink-mute">
          حساب طالب؟{" "}
          <Link href="/register" className="font-bold text-brand-strong">
            أنشئ حسابًا
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-sm text-ink-mute">
          معندكش حساب؟{" "}
          <Link href="/register" className="font-bold text-brand-strong">
            أنشئ حسابًا
          </Link>
          {" • "}
          <button type="button" onClick={() => setMode("teacher")} className="font-bold text-brand-strong underline">
            دخول معلم
          </button>
        </p>
      )}
    </div>
  );
}