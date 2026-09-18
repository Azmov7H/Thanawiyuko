import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

const SIZE = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
} as const;

const VARIANT = {
  primary: "bg-brand-600 font-bold text-white hover:bg-brand-700 disabled:opacity-60",
  secondary:
    "border border-line bg-surface font-bold text-ink hover:border-ink-mute disabled:opacity-60",
  ghost: "text-ink-soft hover:bg-base hover:text-ink disabled:opacity-60",
  danger: "bg-danger-solid font-bold text-white hover:opacity-90 disabled:opacity-60",
  gold: "bg-gold-600 font-bold text-white hover:opacity-90 disabled:opacity-60",
  brandSoft:
    "border border-brand-accent font-bold text-brand-strong hover:bg-brand-tint disabled:opacity-60",
} as const;

type ButtonProps = {
  children: ReactNode;
  href?: string;
  size?: keyof typeof SIZE;
  variant?: keyof typeof VARIANT;
  icon?: IconName;
  iconPosition?: "start" | "end";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  download?: boolean;
  ariaLabel?: string;
  className?: string;
};

function Glyph({ icon, position, children }: { icon?: IconName; position?: "start" | "end"; children: ReactNode }) {
  return (
    <>
      {position === "end" && icon && <Icon name={icon} size={18} aria-hidden />}
      <span>{children}</span>
      {position !== "end" && icon && <Icon name={icon} size={18} aria-hidden />}
    </>
  );
}

/** Buttons — renders <Link> for internal hrefs, <button> otherwise. */
export function Button({
  children,
  href,
  size = "md",
  variant = "primary",
  icon,
  iconPosition = "start",
  type = "button",
  disabled,
  onClick,
  download,
  ariaLabel,
  className = "",
}: ButtonProps) {
  const cls = `inline-flex min-w-max items-center justify-center gap-2 rounded-lg transition-colors duration-150 ${SIZE[size]} ${VARIANT[variant]} ${className}`;
  const inner = <Glyph icon={icon} position={iconPosition}>{children}</Glyph>;
  if (download && href) {
    return (
      <a href={href} download className={cls} aria-label={ariaLabel}>
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}