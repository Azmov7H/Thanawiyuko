"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

type Q = {
  qId: string;
  stemMD: string;
  options: Array<{ key: string; text: string }>;
};

async function getJSON(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok) throw new Error(d.messageAr ?? "خطأ.");
  return d;
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * M4 timed take: server deadline (display-only client timer), autosave
 * heartbeat + unload beacon, question navigator, confirm-submit, auto-submit.
 */
export default function ExamTakePage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [times, setTimes] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [showNav, setShowNav] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const stateRef = useRef({ picked: {} as Record<string, string[]>, flags: [] as string[], times: {} as Record<string, number>, tabs: 0, dirty: false });
  const viewStart = useRef(0);
  const done = useRef(false);

  // Load state once.
  useEffect(() => {
    let live = true;
    getJSON(`/api/exams/attempt/${attemptId}`)
      .then((d) => {
        if (!live) return;
        if (d.status === "submitted") {
          router.replace(`/exam/result/${attemptId}`);
          return;
        }
        setQuestions(d.questions);
        const offset = new Date(d.serverNow).getTime() - Date.now();
        setDeadline(new Date(d.deadlineAt).getTime() - offset);
        const pk: Record<string, string[]> = {};
        for (const [qid, a] of Object.entries((d.answers ?? {}) as Record<string, { chosenKeys: string[] }>)) {
          pk[qid] = a.chosenKeys;
        }
        setPicked(pk);
        setFlags(d.flaggedQIds ?? []);
        stateRef.current.picked = pk;
        stateRef.current.flags = d.flaggedQIds ?? [];
      })
      .catch(() => live && setError("تعذر تحميل الامتحان."));
    return () => {
      live = false;
    };
  }, [attemptId, router]);

  const save = useCallback(
    async (beacon = false) => {
      const st = stateRef.current;
      if (!st.dirty && !beacon) return;
      const payload = JSON.stringify({
        answers: Object.entries(st.picked).map(([qId, chosenKeys]) => ({
          qId,
          chosenKeys,
          timeMs: st.times[qId] ?? 0,
        })),
        flaggedQIds: st.flags,
        tabSwitches: st.tabs,
      });
      try {
        if (beacon) {
          navigator.sendBeacon(`/api/exams/attempt/${attemptId}`, payload);
        } else {
          await fetch(`/api/exams/attempt/${attemptId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: payload,
            keepalive: true,
          });
        }
        st.dirty = false;
      } catch {
        /* offline — answers persist locally, next heartbeat retries */
      }
    },
    [attemptId],
  );

  const submit = useCallback(
    async (auto = false) => {
      if (done.current) return;
      done.current = true;
      setSubmitting(true);
      const st = stateRef.current;
      try {
        await getJSON(`/api/exams/attempt/${attemptId}/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            answers: Object.entries(st.picked).map(([qId, chosenKeys]) => ({
              qId,
              chosenKeys,
              timeMs: st.times[qId] ?? 0,
            })),
          }),
          keepalive: true,
        });
        router.push(`/exam/result/${attemptId}${auto ? "?auto=1" : ""}`);
      } catch (e) {
        done.current = false;
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "تعذر التسليم — إجاباتك محفوظة، حاول مجددًا.");
      }
    },
    [attemptId, router],
  );

  // Ticker: clock + autosave heartbeat + auto-submit at deadline.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      void save();
    }, 1000);
    return () => clearInterval(t);
  }, [save]);

  // Unload beacon + tab-switch signal (logged, never punished).
  useEffect(() => {
    const onUnload = () => void save(true);
    const onVis = () => {
      if (document.hidden) {
        stateRef.current.tabs += 1;
        stateRef.current.dirty = true;
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [save]);

  const deadlineRef = useRef(deadline);
  const submitRef = useRef(submit);
  const remaining = deadline == null ? null : deadline - now;

  useEffect(() => {
    deadlineRef.current = deadline;
  }, [deadline]);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // Tick: clock + autosave heartbeat.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      void save();
    }, 1000);
    return () => clearInterval(t);
  }, [save]);

  // Auto-submit when the server deadline passes.
  useEffect(() => {
    if (remaining != null && remaining <= 0 && deadlineRef.current != null) {
      void submitRef.current(true);
    }
  }, [remaining]);

  const q = questions[idx];
  const total = questions.length;
  const answered = Object.values(picked).filter((v) => v.length > 0).length;

  function choose(key: string) {
    if (!q) return;
    const elapsed = performance.now() - viewStart.current;
    stateRef.current.times[q.qId] = (stateRef.current.times[q.qId] ?? 0) + elapsed;
    stateRef.current.dirty = true;
    viewStart.current = performance.now();
    setPicked((p) => {
      const next = { ...p, [q.qId]: [key] };
      stateRef.current.picked = next;
      stateRef.current.dirty = true;
      return next;
    });
  }

  function go(i: number) {
    if (q) {
      const elapsed = performance.now() - viewStart.current;
      stateRef.current.times[q.qId] = (stateRef.current.times[q.qId] ?? 0) + elapsed;
    }
    viewStart.current = performance.now();
    setIdx(i);
  }

  function toggleFlag(qId: string) {
    setFlags((f) => {
      const next = f.includes(qId) ? f.filter((x) => x !== qId) : [...f, qId];
      stateRef.current.flags = next;
      stateRef.current.dirty = true;
      return next;
    });
  }

  if (!q && !error) {
    return <p className="py-10 text-center text-sm text-ink-mute">جارٍ تحميل الامتحان…</p>;
  }
  if (!q) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
        {error}
      </p>
    );
  }

  const urgent = remaining != null && remaining < 5 * 60_000;

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-base px-4 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className={`tnum rounded-lg px-3 py-1.5 text-lg font-bold ${urgent ? "bg-red-50 text-bad" : "bg-surface text-ink"}`} role="timer" aria-live="off">
            {remaining == null ? "--:--" : fmt(remaining)}
          </span>
          <span className="tnum text-xs text-ink-mute">
            {answered} / {total} مجاب
          </span>
          <button onClick={() => setShowNav((v) => !v)} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
            {showNav ? "إخفاء الأسئلة" : "خريطة الأسئلة"}
          </button>
        </div>
        {showNav && (
          <div className="mx-auto grid w-full max-w-5xl grid-cols-8 gap-1.5 py-3 sm:grid-cols-10" role="group" aria-label="التنقل بين الأسئلة">
            {questions.map((x, i) => {
              const ans = (picked[x.qId] ?? []).length > 0;
              const fl = flags.includes(x.qId);
              return (
                <button
                  key={x.qId}
                  onClick={() => {
                    go(i);
                    setShowNav(false);
                  }}
                  aria-label={`سؤال ${i + 1}${ans ? " (مجاب)" : ""}${fl ? " (معلَّم)" : ""}`}
                  className={`tnum flex aspect-square items-center justify-center rounded-lg border text-sm font-bold ${
                    i === idx
                      ? "border-brand-600 bg-brand-600 text-white"
                      : ans
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-line bg-surface text-ink-mute"
                  }`}
                >
                  {i + 1}
                  {fl && <span aria-hidden="true" className="text-[9px]"> •</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <article className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium leading-relaxed text-ink">
            <span className="tnum text-ink-mute">{idx + 1}. </span>
            {q.stemMD}
          </p>
          <button
            onClick={() => toggleFlag(q.qId)}
            aria-pressed={flags.includes(q.qId)}
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs ${flags.includes(q.qId) ? "border-gold-600 bg-yellow-50 font-bold text-gold-600" : "border-line text-ink-mute"}`}
          >
            {flags.includes(q.qId) ? "معلَّم ★" : "علِّم للمراجعة"}
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {(picked[q.qId] ?? []).length >= 0 &&
            q.options.map((o, i) => {
              const isSel = (picked[q.qId] ?? []).includes(o.key);
              return (
                <button
                  key={o.key}
                  onClick={() => choose(o.key)}
                  aria-pressed={isSel}
                  className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-start text-sm ${
                    isSel
                      ? "border-brand-600 bg-brand-50 font-bold text-brand-700"
                      : "border-line text-ink-soft"
                  }`}
                >
                  <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-base text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{o.text}</span>
                </button>
              );
            })}
        </div>
      </article>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          disabled={idx === 0}
          onClick={() => go(idx - 1)}
          className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink-soft disabled:opacity-40"
        >
          السابق
        </button>
        {idx < total - 1 ? (
          <button onClick={() => go(idx + 1)} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white">
            التالي
          </button>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-ink px-6 py-2.5 text-sm font-bold text-base text-white"
          >
            تسليم الامتحان
          </button>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="تأكيد التسليم">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5">
            <h2 className="font-bold text-ink">تسليم الامتحان؟</h2>
            <p className="tnum mt-2 text-sm text-ink-mute">
              أجبت {answered} من {total} • معلَّم {flags.length} للمراجعة • المتبقي {remaining == null ? "—" : fmt(remaining)}
            </p>
            <p className="mt-1 text-sm text-ink-mute">لا يمكن التراجع بعد التسليم.</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => submit(false)}
                disabled={submitting}
                className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-bold text-base text-white disabled:opacity-50"
              >
                {submitting ? "جارٍ التسليم…" : "تأكيد التسليم"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border border-line py-2.5 text-sm font-bold text-ink"
              >
                مراجعة أولًا
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
