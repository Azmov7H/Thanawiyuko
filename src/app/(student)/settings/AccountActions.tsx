"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  deletionPending: boolean;
  purgeAtLabel: string | null;
  exportHref: string;
};

export function AccountActions({ deletionPending, purgeAtLabel, exportHref }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestDeletion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/delete-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError((data?.messageAr as string) ?? "تعذر إرسال الطلب. حاول مجددًا.");
      return;
    }
    setPassword("");
    setAck(false);
    router.refresh();
  }

  async function cancelDeletion() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/delete-cancel", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("تعذر التراجع الآن. حاول مجددًا.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="export-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="export-title" className="text-lg font-bold text-ink">
          تصدير بياناتي
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          نزّل نسخة JSON من بياناتك (الملف الدراسي، المحاولات، الأخطاء، التقدم، والاشتراك).
        </p>
        <a
          href={exportHref}
          download
          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-brand-accent px-4 py-2 text-sm font-bold text-brand-strong hover:bg-brand-tint"
        >
          تنزيل ملف بياناتي
        </a>
      </section>

      <section
        aria-labelledby="delete-title"
        className="rounded-xl border border-danger-line bg-danger-bg/40 p-4"
      >
        <h2 id="delete-title" className="text-lg font-bold text-bad">
          حذف الحساب
        </h2>

        {deletionPending ? (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              حسابك قيد الحذف. سيتم الحذف النهائي في{" "}
              <strong>{purgeAtLabel ?? "خلال 30 يومًا"}</strong>. يمكنك التراجع الآن.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-bad">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={cancelDeletion}
              disabled={busy}
              className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "جارٍ التراجع…" : "تراجع عن الحذف"}
            </button>
          </>
        ) : (
          <form onSubmit={requestDeletion} className="mt-1 flex flex-col gap-3">
            <p className="text-sm text-ink-soft">
              سيتم تعطيل حسابك فورًا، ثم حذف بياناتك نهائيًا بعد 30 يومًا. يمكنك التراجع خلال
              هذه المدة.
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              كلمة المرور الحالية
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
            <label className="flex items-start gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>أفهم أن هذا الإجراء لا يمكن التراجع عنه بعد انتهاء المدة.</span>
            </label>
            {error && (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !ack}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-danger-solid px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "جارٍ الإرسال…" : "طلب حذف الحساب"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
