"use client";

import { useState } from "react";

export function NotificationPreferences({
  initialEmail,
}: {
  initialEmail: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function toggleEmail() {
    const next = !email;
    setEmail(next);
    setStatus("saving");
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next }),
      });
      if (!res.ok) {
        setEmail(!next);
        setStatus("error");
        return;
      }
      const data = (await res.json()) as { email: boolean };
      setEmail(data.email);
      setStatus("saved");
    } catch {
      setEmail(!next);
      setStatus("error");
    }
  }

  return (
    <section
      aria-labelledby="notification-preferences"
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <h2 id="notification-preferences" className="font-bold text-ink">
        إشعارات الحساب
      </h2>
      <p className="mt-1 text-xs text-ink-mute">
        رسائل إشعار الحساب تُرسل على البريد الإلكتروني فقط خلال ساعات النشاط
        (من ٧ صباحًا حتى ١٠ مساءً بتوقيت القاهرة).
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={email}
          onChange={toggleEmail}
          className="mt-1 size-4 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-medium text-ink">
            إرسال إشعارات الحساب بالبريد الإلكتروني
          </span>
          <span className="mt-0.5 block text-xs text-ink-mute">
            تقارير أسبوعية وإشعارات إنجاز ومراجعة الأخطاء.
          </span>
        </span>
      </label>
      {status === "saved" && (
        <p role="status" className="mt-3 text-xs text-ok">
          تم الحفظ.
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="mt-3 text-xs text-bad">
          تعذر الحفظ. حاول مرة أخرى.
        </p>
      )}
    </section>
  );
}