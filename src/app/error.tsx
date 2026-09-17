"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-bad">!</p>
      <h1 className="text-2xl font-bold text-ink">حصل خطأ غير متوقع</h1>
      <p className="text-sm text-ink-mute">جرّب تحديث الصفحة، ولو استمرت المشكلة راجعنا.</p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-brand-600 px-6 py-2.5 font-bold text-white"
      >
        حاول تاني
      </button>
    </div>
  );
}