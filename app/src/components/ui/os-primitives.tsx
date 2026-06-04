"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import { SheetContent } from "@/components/ui/sheet";
import {
  OS_MOTION,
  osTabPanel,
  runOSViewTransition,
} from "@/lib/animation/os-motion";
import { cn } from "@/lib/utils";
import {
  osControlSizeClassName,
  osDialogSurfaceClassName,
  osFrostedPanelClassName,
  osGlassControlClassName,
  osGlassPanelClassName,
  osIconControlSizeClassName,
  osPrimaryControlClassName,
  osSegmentedShellClassName,
  osSheenClassName,
  osSheetSurfaceClassName,
  osSolidPanelClassName,
} from "./os-glass";

type PanelElement = "div" | "section" | "article" | "aside" | "li";
type PanelProps = React.HTMLAttributes<HTMLElement> & {
  as?: PanelElement;
};

type OSButtonProps = React.ComponentProps<typeof Button> & {
  osSize?: "default" | "compact" | "none";
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
  }

  media.addListener(onStoreChange);
  return () => media.removeListener(onStoreChange);
}

function useHydrationSafeReducedMotion() {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}

export function OSGlassPanel({ as: Component = "div", className, ...props }: PanelProps) {
  return (
    <Component
      data-slot="os-glass-panel"
      className={cn(osGlassPanelClassName, osSheenClassName, className)}
      {...props}
    />
  );
}

export function OSFrostedPanel({ as: Component = "div", className, ...props }: PanelProps) {
  return (
    <Component
      data-slot="os-frosted-panel"
      className={cn(osFrostedPanelClassName, osSheenClassName, className)}
      {...props}
    />
  );
}

export function OSSolidPanel({ as: Component = "div", className, ...props }: PanelProps) {
  return (
    <Component
      data-slot="os-solid-panel"
      className={cn(osSolidPanelClassName, className)}
      {...props}
    />
  );
}

export function OSControl({
  className,
  osSize = "default",
  size = "sm",
  variant = "outline",
  ...props
}: OSButtonProps) {
  return (
    <Button
      data-slot="os-control"
      variant={variant}
      size={size}
      className={cn(
        osGlassControlClassName,
        osSize === "default" && osControlSizeClassName,
        osSize === "compact" && "h-11 min-h-11 rounded-lg px-4 text-sm font-semibold sm:h-8 sm:min-h-8 sm:px-2.5 sm:text-xs",
        className,
      )}
      {...props}
    />
  );
}

type OSIconButtonProps = React.ComponentProps<typeof Button> & {
  osSize?: "default" | "compact" | "none";
};

export function OSIconControl({
  className,
  osSize = "default",
  size = "icon-sm",
  variant = "outline",
  ...props
}: OSIconButtonProps) {
  return (
    <Button
      data-slot="os-icon-control"
      variant={variant}
      size={size}
      className={cn(
        osGlassControlClassName,
        osSize === "default" && osIconControlSizeClassName,
        osSize === "compact" && "h-11 min-h-11 w-11 rounded-lg p-0 sm:h-8 sm:min-h-8 sm:w-8",
        className,
      )}
      {...props}
    />
  );
}

export function OSPrimaryAction({
  className,
  osSize = "default",
  size = "sm",
  ...props
}: OSButtonProps) {
  return (
    <Button
      data-slot="os-primary-action"
      size={size}
      className={cn(
        osPrimaryControlClassName,
        osSize === "default" && osControlSizeClassName,
        osSize === "compact" && "h-11 min-h-11 rounded-lg px-4 text-sm font-semibold sm:h-8 sm:min-h-8 sm:px-2.5 sm:text-xs",
        className,
      )}
      {...props}
    />
  );
}

export function OSActionRow({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="os-action-row"
      className={cn(
        "flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export interface OSPageHeaderProps extends React.ComponentProps<"header"> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function OSPageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: OSPageHeaderProps) {
  return (
    <header
      data-slot="os-page-header"
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <OSActionRow>{actions}</OSActionRow> : null}
    </header>
  );
}

export interface OSSegmentedItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  ariaLabel?: string;
}

export interface OSSegmentedControlProps<T extends string> {
  items: Array<OSSegmentedItem<T>>;
  value: T;
  onValueChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
  getPanelId?: (id: T) => string;
  getTabId?: (id: T) => string;
  labelMode?: "always" | "desktop" | "sr-only";
  layoutId?: string;
}

export function OSSegmentedControl<T extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
  getPanelId,
  getTabId,
  labelMode = "always",
  layoutId = "os-segmented-active-pill",
}: OSSegmentedControlProps<T>) {
  const reduceMotion = useHydrationSafeReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-slot="os-segmented-control"
      className={cn(
        osSegmentedShellClassName,
        osGlassControlClassName,
        osSheenClassName,
        "w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:w-fit [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.ariaLabel}
            aria-controls={getPanelId?.(item.id)}
            id={getTabId?.(item.id)}
            onClick={() => {
              if (item.id === value) return;
              runOSViewTransition(() => onValueChange(item.id), Boolean(reduceMotion));
            }}
            className={cn(
              "relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-[1rem] px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 motion-reduce:transition-none",
              active
                ? "text-slate-950"
                : "text-slate-700 hover:text-slate-950 dark:text-white/64 dark:hover:text-white",
            )}
          >
            {active ? (
              <motion.span
                layoutId={reduceMotion ? undefined : layoutId}
                className="absolute inset-0 -z-10 rounded-[1rem] bg-lime-300 shadow-[0_10px_30px_rgba(190,242,100,0.16),inset_0_1px_0_rgba(255,255,255,0.45)]"
                transition={{
                  duration: reduceMotion ? 0 : OS_MOTION.tabMs,
                  ease: OS_MOTION.ease,
                }}
              />
            ) : null}
            {Icon ? <Icon className="size-4" aria-hidden /> : null}
            <span
              className={cn(
                labelMode === "desktop" && "hidden sm:inline",
                labelMode === "sr-only" && "sr-only",
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface OSStatusRailItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}

export interface OSStatusRailProps<T extends string> {
  items: Array<OSStatusRailItem<T>>;
  value: T;
  onValueChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
  allowReselect?: boolean;
  layoutId?: string;
}

export function OSStatusRail<T extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
  allowReselect = false,
  layoutId = "os-status-active-pill",
}: OSStatusRailProps<T>) {
  const reduceMotion = useHydrationSafeReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-slot="os-status-rail"
      className={cn(
        osSegmentedShellClassName,
        osGlassControlClassName,
        osSheenClassName,
        "w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.ariaLabel}
            title={item.title}
            disabled={item.disabled}
            onClick={() => {
              if (item.id === value && !allowReselect) return;
              runOSViewTransition(() => onValueChange(item.id), Boolean(reduceMotion));
            }}
            className={cn(
              "relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-[0.9rem] px-3 text-[0.72rem] font-bold uppercase tracking-[0.12em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 motion-reduce:transition-none",
              active
                ? "text-slate-950"
                : "text-slate-600 hover:text-slate-950 dark:text-white/54 dark:hover:text-white",
              item.disabled &&
                "cursor-not-allowed opacity-40 hover:text-slate-600 dark:hover:text-white/54",
            )}
          >
            {active ? (
              <motion.span
                layoutId={reduceMotion ? undefined : layoutId}
                className="absolute inset-0 -z-10 rounded-[0.9rem] bg-lime-300 shadow-[0_10px_28px_rgba(190,242,100,0.15)]"
                transition={{
                  duration: reduceMotion ? 0 : OS_MOTION.tabMs,
                  ease: OS_MOTION.ease,
                }}
              />
            ) : null}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={cn("tabular-nums", active ? "text-slate-800" : "opacity-70")}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function OSMotionPanel({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const reduceMotion = useHydrationSafeReducedMotion();

  return (
    <motion.div
      data-slot="os-motion-panel"
      className={className}
      {...osTabPanel(Boolean(reduceMotion))}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function OSBottomSheet({
  className,
  side = "bottom-card",
  ...props
}: React.ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      side={side}
      className={cn(osSheetSurfaceClassName, "pb-[env(safe-area-inset-bottom,0px)]", className)}
      {...props}
    />
  );
}

export function OSDialogSurface({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(osDialogSurfaceClassName, className)}
      {...props}
    />
  );
}

export interface OSEmptyStateProps extends React.ComponentProps<"div"> {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function OSEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: OSEmptyStateProps) {
  return (
    <OSGlassPanel
      data-slot="os-empty-state"
      className={cn("px-4 py-12 text-center sm:px-6", className)}
      {...props}
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/72 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
        <Icon className="size-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-white/58">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </OSGlassPanel>
  );
}
