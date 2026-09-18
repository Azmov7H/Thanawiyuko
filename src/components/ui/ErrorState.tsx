/** Error state: human-readable message + retry. */
export function ErrorState({
  title = "تعذر تحميل المحتوى.",
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-2xl border border-danger-line bg-danger-bg p-4">
      <p className="font-bold text-bad">{title}</p>
      {body && <p className="text-sm text-ink-mute">{body}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          حاول مرة أخرى
        </button>
      )}
    </div>
  );
}