"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const GRADES = [
  { value: "sec1", label: "الصف الأول الثانوي" },
  { value: "sec2", label: "الصف الثاني الثانوي" },
  { value: "sec3", label: "الصف الثالث الثانوي" },
];

const TRACKS = [
  { value: "general", label: "عام (أولى/ثانية)" },
  { value: "science", label: "علمي علوم" },
  { value: "math", label: "علمي رياضة" },
  { value: "literary", label: "أدبي" },
];

/** M1 onboarding: grade → track → daily goal. Resumable via PATCH /api/students/me. */
export default function OnboardingPage() {
  const router = useRouter();
  const [grade, setGrade] = useState("sec3");
  const [track, setTrack] = useState("science");
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/students/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grade,
        track: grade === "sec3" ? track : "general",
        dailyMinutes,
        step: 5,
        done: true,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError((data?.messageAr as string) ?? "تعذر الحفظ. حاول مجددًا.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-bold text-ink">ظبط ملفك الدراسي</h1>
      <p className="mt-1 text-sm text-ink-mute">
        عشان نجهزلك الخطة والمحتوى المناسبين ليك.
      </p>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-bold text-ink">1. الصف الدراسي</h2>
        <div className="mt-3 grid gap-2">
          {GRADES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGrade(g.value)}
              aria-pressed={grade === g.value}
              className={`rounded-lg border px-4 py-2.5 text-start text-sm font-medium ${
                grade === g.value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line text-ink-soft"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>

      {grade === "sec3" && (
        <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-bold text-ink">2. الشعبة</h2>
          <div className="mt-3 grid gap-2">
            {TRACKS.filter((t) => t.value !== "general").map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTrack(t.value)}
                aria-pressed={track === t.value}
                className={`rounded-lg border px-4 py-2.5 text-start text-sm font-medium ${
                  track === t.value
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-line text-ink-soft"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-bold text-ink">
          {grade === "sec3" ? "3" : "2"}. هدفك اليومي للمذاكرة
        </h2>
        <div className="mt-3 flex items-center gap-3">
          {[20, 45, 90].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDailyMinutes(m)}
              aria-pressed={dailyMinutes === m}
              className={`tnum rounded-lg border px-4 py-2 text-sm font-bold ${
                dailyMinutes === m
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line text-ink-soft"
              }`}
            >
              {m} دقيقة
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={finish}
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
      >
        {busy ? "جارٍ الحفظ…" : "ادخل على لوحتك"}
      </button>
    </div>
  );
}
