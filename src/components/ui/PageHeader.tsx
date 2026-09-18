import type { ReactNode } from "react";

/** Consistent page title block: eyebrow → title → actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-medium text-brand-strong">{eyebrow}</p>}
        <h1 className="mt-0.5 text-xl font-bold text-ink md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-mute">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}