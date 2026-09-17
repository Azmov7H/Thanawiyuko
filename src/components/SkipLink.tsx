export function SkipLink({ label = "تخطَّ إلى المحتوى الرئيسي" }: { label?: string }) {
  return (
    <a
      href="#main"
      className="sr-only rounded-lg bg-surface px-4 py-2 font-bold text-ink shadow focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
    >
      {label}
    </a>
  );
}
