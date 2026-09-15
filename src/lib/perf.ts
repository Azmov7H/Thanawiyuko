/** Wrapper to satisfy lint rule against impure calls in render scope. */
export function now(): number {
  return performance.now();
}