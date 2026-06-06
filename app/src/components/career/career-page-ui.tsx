"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  OSEmptyState,
  OSFrostedPanel,
  OSGlassPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";

export function CareerMetricGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </section>
  );
}

export function CareerMetricCard({
  icon: Icon,
  label,
  value,
  description,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <OSFrostedPanel as="article" className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </div>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/45 bg-white/70 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
      {description ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </OSFrostedPanel>
  );
}

export function CareerSectionPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <OSFrostedPanel as="section" className={cn("space-y-4 p-4 sm:p-5", className)}>
      {title || description || actions ? (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </OSFrostedPanel>
  );
}

export function CareerHelpPanel({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <OSGlassPanel as="aside" className={cn("p-4 sm:p-5", className)}>
      <div className="flex gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/45 bg-white/70 text-lime-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">{children}</div>
        </div>
      </div>
    </OSGlassPanel>
  );
}

export type CareerFilterChip<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function CareerFilterChips<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: Array<CareerFilterChip<T>>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 sm:min-h-9 sm:text-xs",
              active
                ? "border-lime-300/70 bg-lime-300 text-slate-950 shadow-[0_10px_24px_rgba(190,242,100,0.14)]"
                : "border-white/45 bg-white/58 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]",
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={cn("tabular-nums", active ? "text-slate-800" : "opacity-70")}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function CareerEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <OSEmptyState
      icon={icon}
      title={title}
      description={description}
      className={className}
      action={
        actionLabel && onAction ? (
          <OSPrimaryAction onClick={onAction}>{actionLabel}</OSPrimaryAction>
        ) : undefined
      }
    />
  );
}
