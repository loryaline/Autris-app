import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlight?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ highlight = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-[var(--radius-md)] border transition-colors duration-150 ${
          highlight
            ? "bg-primary-bg border-primary-border"
            : "bg-bg-primary border-border hover:border-text-quaternary"
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card };
