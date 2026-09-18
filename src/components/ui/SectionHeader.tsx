import Link from "next/link";
import type { ReactNode } from "react";

/** Section heading with optional "view all" action. */
export function SectionHeader({
  title,
  actionLabel,
  actionHref,
  meta,
  tone = "default",
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  meta?: ReactNode;
  tone?: "default" | "brand";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={`text-lg font-bold ${tone === "brand" ? "text-brand-strong" : "text-ink"}`}>{title}</h2>
      <div className="flex items-center gap-3">
        {meta}
        {actionHref && actionLabel && (
          <Link href={actionHref} className="text-sm font-medium text-brand-strong hover:underline">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}