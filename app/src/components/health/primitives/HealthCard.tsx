import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HealthCardProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "warning" | "danger" | "success";
  interactive?: boolean;
  onClick?: () => void;
  as?: "div" | "button" | "article";
  "aria-label"?: string;
}

const toneClasses: Record<NonNullable<HealthCardProps["tone"]>, string> = {
  default: "bg-card/70 ring-foreground/5",
  warning: "bg-amber-50/60 ring-amber-500/20 dark:bg-amber-500/10",
  danger: "bg-red-50/60 ring-red-500/20 dark:bg-red-500/10",
  success: "bg-green-50/60 ring-green-500/20 dark:bg-green-500/10",
};

/**
 * Consistent container for health widgets. Uses the same translucent
 * backdrop + ring treatment as other Life OS cards.
 */
export const HealthCard = forwardRef<HTMLDivElement, HealthCardProps>(
  function HealthCard(
    { children, className, tone = "default", interactive, onClick, as = "div", ...rest },
    ref,
  ) {
    const base = cn(
      "rounded-2xl border p-4 shadow-sm ring-1 backdrop-blur-sm transition",
      toneClasses[tone],
      interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
      className,
    );
    if (as === "button") {
      return (
        <button
          type="button"
          ref={ref as unknown as React.Ref<HTMLButtonElement>}
          onClick={onClick}
          className={cn(base, "text-left w-full")}
          aria-label={rest["aria-label"]}
        >
          {children}
        </button>
      );
    }
    if (as === "article") {
      return (
        <article ref={ref as unknown as React.Ref<HTMLElement>} className={base} onClick={onClick} aria-label={rest["aria-label"]}>
          {children}
        </article>
      );
    }
    return (
      <div ref={ref} className={base} onClick={onClick} aria-label={rest["aria-label"]}>
        {children}
      </div>
    );
  },
);
