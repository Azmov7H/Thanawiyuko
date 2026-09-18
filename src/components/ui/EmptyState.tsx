import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Empty state: why it's empty + one clear next step. Never blank. */
export function EmptyState({
  title,
  body,
  action,
  icon = "sparkle",
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-8 text-center">
      <Icon name={icon} size={28} className="text-ink-mute" />
      <p className="font-bold text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-mute">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}