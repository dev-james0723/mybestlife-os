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
        "transition-all",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
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
