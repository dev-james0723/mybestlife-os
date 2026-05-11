"use client";

import { type ReactNode } from "react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

interface GlassEntityCardProps {
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

/**
 * GlassEntityCard — dashboard-only glassy twin of `shared/EntityCard`.
 * Mirrors the exact public API so future migration is lossless; does
 * NOT alter `shared/EntityCard`, which is used by many pages.
 */
export function GlassEntityCard({
  icon,
  title,
  subtitle,
  badges,
  meta,
  actions,
  onClick,
  className,
  children,
}: GlassEntityCardProps) {
  return (
    <GlassPanel
      interactive={onClick ? true : undefined}
      onClick={onClick}
      className={cn(
        "p-4 md:max-xl:p-5 xl:p-4",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-medium">{title}</h3>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {actions}
              </div>
            )}
          </div>
          {badges && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {badges}
            </div>
          )}
          {children && <div className="mt-3">{children}</div>}
          {meta && (
            <div className="mt-2 text-xs text-muted-foreground">{meta}</div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
