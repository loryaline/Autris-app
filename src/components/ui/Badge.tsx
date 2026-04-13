import { HTMLAttributes } from "react";

type BadgeVariant =
  | "primary"
  | "teal"
  | "amber"
  | "red"
  | "muted"
  | "rarity-common"
  | "rarity-rare"
  | "rarity-epic"
  | "rarity-legendary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary-bg text-primary-dark",
  teal: "bg-teal-bg text-teal-deeper",
  amber: "bg-amber-bg text-amber-deeper",
  red: "bg-red-bg text-red",
  muted: "bg-bg-tertiary text-text-tertiary",
  "rarity-common": "bg-bg-tertiary text-rarity-common",
  "rarity-rare": "bg-teal-bg text-rarity-rare",
  "rarity-epic": "bg-primary-bg text-rarity-epic",
  "rarity-legendary": "bg-amber-bg text-rarity-legendary",
};

function Badge({ variant = "muted", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
