import type { ReactNode } from "react";

/** A single emphasized number with label — sized for its importance. */
export function Metric({
  label,
  value,
  sup,
  tone = "ink",
  size = "md",
}: {
  label: string;
  value: ReactNode;
  sup?: ReactNode;
  tone?: "ink" | "brand" | "gold" | "ok" | "bad";
  size?: "sm" | "md" | "lg";
}) {
  const valueCls =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
        ? "text-lg"
        : "text-2xl";
  const toneCls =
    tone === "brand"
      ? "text-brand-strong"
      : tone === "gold"
        ? "text-gold-accent"
        : tone === "ok"
          ? "text-ok"
          : tone === "bad"
            ? "text-bad"
            : "text-ink";
  return (
    <div>
      <p className="text-xs text-ink-mute">{label}</p>
      <p className={`tnum mt-0.5 font-bold leading-none ${valueCls} ${toneCls}`}>
        {value}
        {sup && <span className="ms-1 text-sm text-ink-mute">{sup}</span>}
      </p>
    </div>
  );
}