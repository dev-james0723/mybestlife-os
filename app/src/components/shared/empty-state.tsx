"use client";

import { type LucideIcon } from "lucide-react";
import { type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  /** @default "default" */
  variant?: NonNullable<ComponentProps<typeof Button>["variant"]>;
  /** @default true */
  showPlus?: boolean;
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Optional second control (e.g. clear filters next to add). */
  secondaryAction?: EmptyStateAction;
}

function EmptyStateButton({ action, className }: { action: EmptyStateAction; className?: string }) {
  const variant = action.variant ?? "default";
  const showPlus = action.showPlus ?? true;
  return (
    <Button
      type="button"
      variant={variant}
      onClick={action.onClick}
      className={cn("min-h-11 gap-2 rounded-xl px-3", className)}
    >
      {showPlus ? <Plus className="h-4 w-4" aria-hidden /> : null}
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const hasActions = Boolean(action || secondaryAction);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {hasActions && (
        <div
          className={cn(
            "mt-6 flex w-full max-w-sm flex-col items-stretch justify-center gap-2 sm:max-w-none sm:flex-row sm:items-center",
            secondaryAction && "sm:gap-3",
          )}
        >
          {action ? <EmptyStateButton action={action} /> : null}
          {secondaryAction ? <EmptyStateButton action={secondaryAction} /> : null}
        </div>
      )}
    </div>
  );
}
