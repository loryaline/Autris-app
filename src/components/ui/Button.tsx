import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "teal" | "amber";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark border border-primary",
  outline:
    "bg-transparent text-text-secondary border border-border hover:bg-bg-hover hover:border-border",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-bg-hover",
  teal:
    "bg-teal-dark text-white hover:bg-teal-deeper border border-teal-dark",
  amber:
    "bg-amber-dark text-white hover:bg-amber-deeper border border-amber-dark",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-6 px-2 text-[12px]",
  md: "h-7 px-3 text-[13px]",
  lg: "h-8 px-4 text-[14px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
