"use client";

import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EntityCardProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function EntityCard({
  icon,
  title,
  subtitle,
  badges,
  meta,
  actions,
  onClick,
  className,
  children,
}: EntityCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-200/80 bg-white/86 shadow-[0_10px_30px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.68)] transition-[border-color,background,transform,box-shadow] duration-150 dark:border-white/10 dark:bg-white/[0.055]",
        onClick &&
          "cursor-pointer hover:border-lime-300/40 hover:bg-white/94 hover:shadow-[0_14px_34px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.72)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 motion-reduce:transition-none motion-reduce:active:translate-y-0 dark:hover:bg-white/[0.08]",
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onClick();
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-medium truncate">{title}</h3>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions}
                </div>
              )}
            </div>
            {badges && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">{badges}</div>
            )}
            {children && <div className="mt-3">{children}</div>}
            {meta && (
              <div className="mt-2 text-xs text-muted-foreground">{meta}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
