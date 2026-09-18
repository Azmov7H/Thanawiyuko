"use client";

import { useState } from "react";

type Profile = {
  headline: string;
  bio: string;
  subjectAreas: string[];
  isPublic: boolean;
};

export function ProfileEditor({ initial }: { initial: Profile }) {
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [areas, setAreas] = useState(initial.subjectAreas.join("، "));
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    const subjectAreas = areas
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, bio, subjectAreas, isPublic }),
      });
      const data = (await res.json()) as { messageAr?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.messageAr ?? "راجع البيانات المدخلة.");
        return;
      }
      setAreas(subjectAreas.join("، "));
      setStatus("saved");
      setMessage("تم حفظ الملف الشخصي.");
    } catch {
      setStatus("error");
      setMessage("تعذر الاتصال بالخادم.");
    }
  }

  const busy = status === "saving";

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-xl border border-line bg-surface p-4">
        <label htmlFor="headline" className="block text-sm font-medium text-ink-soft">
          العنوان
        </label>
        <input
          id="headline"
          value={headline}
          maxLength={120}
          disabled={busy}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="مثال: مدرس فيزياء — الثانوية العامة"
          className="mt-2 min-h-11 w-full rounded-lg border border-line bg-base px-3 py-1.5 text-sm text-ink disabled:opacity-50"
        />
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <label htmlFor="bio" className="block text-sm font-medium text-ink-soft">
          نبذة
        </label>
        <textarea
          id="bio"
          value={bio}
          maxLength={2000}
          rows={5}
          disabled={busy}
          onChange={(e) => setBio(e.target.value)}
          placeholder="نبذة قصيرة عن خبرتك وطريقة شرحك…"
          className="mt-2 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink disabled:opacity-50"
        />
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <label htmlFor="subjectAreas" className="block text-sm font-medium text-ink-soft">
          المجالات (افصل بينها بفاصلة)
        </label>
        <input
          id="subjectAreas"
          value={areas}
          maxLength={200}
          disabled={busy}
          onChange={(e) => setAreas(e.target.value)}
          placeholder="فيزياء، رياضيات، كيمياء"
          className="mt-2 min-h-11 w-full rounded-lg border border-line bg-base px-3 py-1.5 text-sm text-ink disabled:opacity-50"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-ink">
        <input
          type="checkbox"
          checked={isPublic}
          disabled={busy}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        <span>إظهار الملف في منشورات المعلمين العامة (V2)</span>
      </label>

      {message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            status === "error" ? "bg-danger-bg text-bad" : "bg-success-bg text-brand-strong"
          }`}
        >
          {message}
        </p>
      )}

      <button
        onClick={save}
        disabled={busy}
        className="min-h-11 rounded-lg bg-brand-600 px-6 py-2 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? "جارٍ الحفظ…" : "حفظ"}
      </button>
    </div>
  );
}