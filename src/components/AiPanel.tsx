"use client";

import { useRef, useState, useEffect } from "react";
import { useModal } from "@/lib/use-modal";

type Msg = { role: "user" | "assistant"; content: string };

/** AI Tutor panel — drawer (desktop) / bottom sheet (mobile). */
export function AiPanel({ topicId }: { topicId?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const convoIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModal<HTMLDivElement>(open, () => setOpen(false), inputRef);

  function scrollToBottom() {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function send() {
    if (!input.trim() || busy) return;
    const q = input;
    setInput("");
    setBusy(true);
    setError("");
    setMessages((m) => [...m, { role: "user", content: q }]);

    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          topicId,
          conversationId: convoIdRef.current ?? undefined,
        }),
      });
      if (!res.ok) {
        let message = "تعذر الاتصال بالذكاء الاصطناعي.";
        try {
          const payload = await res.json();
          if (payload.messageAr) message = payload.messageAr;
        } catch {
        }
        throw new Error(message);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("لا يوجد رد من السيرفر");

      let assistantMsg = "";
      let buffer = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          const data = line.startsWith("data:") ? line.slice(5).trim() : "";
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token") {
                assistantMsg += parsed.content;
                setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: assistantMsg }]);
              } else if (parsed.type === "done") {
                if (parsed.quotaRemaining !== undefined) setQuota(parsed.quotaRemaining);
                if (parsed.conversationId) convoIdRef.current = parsed.conversationId;
                setMessages((m) => m.slice(0, -1));
              } else if (parsed.type === "error") {
                setError(parsed.messageAr);
                setMessages((m) => m.slice(0, -1));
              }
            } catch {
            }
          }
          newline = buffer.indexOf("\n");
        }
      }

      if (assistantMsg) setMessages((m) => [...m, { role: "assistant", content: assistantMsg }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الاتصال بالذكاء الاصطناعي.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 end-4 z-40 rounded-full bg-brand-600 p-3 shadow-lg text-white hover:bg-brand-700 md:bottom-24 md:end-6"
        aria-label="فتح مساعد الذكاء الاصطناعي"
      >
        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </button>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center outline-none md:items-center md:justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-panel-title"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md md:w-96 bg-surface rounded-t-2xl md:rounded-xl shadow-xl flex flex-col h-[70vh] md:h-[80vh] animate-slide-up">
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 id="ai-panel-title" className="font-bold text-ink">مساعد ثانويكو</h2>
              {quota !== null && <span className="tnum text-xs text-ink-mute">باقي اليوم: {quota}</span>}
              <button onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-base text-ink-mute" aria-label="إغلاق">
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div role="log" aria-live="polite" aria-label="محادثة المساعد" className="flex-1 overflow-y-auto p-4 space-y-3" ref={endRef}>
              {messages.length === 0 && (
                <div className="text-center text-sm text-ink-mute py-8">
                  <p className="font-medium text-ink">أهلًا! اسألني أي حاجة في الدرس.</p>
                  <p className="mt-1">مثال: &quot;اشرح لي قانون نيوتن التاني بخطوات&quot;</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-brand-600 text-white rounded-tr-sm" : "bg-base text-ink rounded-tl-sm"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {error && <div role="alert" className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</div>}
            <div className="border-t border-line p-3">
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="اكتب سؤالك هنا… (Enter للإرسال)"
                  aria-label="سؤالك للمساعد"
                  className="flex-1 rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink placeholder:text-ink-mute"
                  disabled={busy}
                />
                <button type="submit" disabled={!input.trim() || busy} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {busy ? "جارٍ…" : "إرسال"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}