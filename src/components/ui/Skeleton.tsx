/** Skeleton block that mirrors final layout (respects reduced-motion via globals). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface ${className}`} />;
}