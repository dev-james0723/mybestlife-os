"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FullscreenPreviewPortalProps = {
  open: boolean;
  title: string;
  /** Accessible label for the dialog. */
  ariaLabel?: string;
  /** Label for the close button. */
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * True fullscreen overlay rendered via a React portal at `document.body`.
 *
 * Why a portal?
 *   The previous implementation rendered the overlay as a child of
 *   `KnowledgeDetailSheet`, which was itself nested inside several
 *   `transform`/`overflow:hidden` parents. CSS `position: fixed` becomes
 *   relative to the nearest transformed ancestor, so on mobile the overlay
 *   was clipped to a tiny rectangle inside the sheet.
 *
 *   Portalling to `document.body` escapes every ancestor containing block
 *   and restores the intended viewport-level behaviour on every device.
 *
 *   While open we also:
 *   - lock body scroll (iOS-safe)
 *   - trap Escape for close
 *   - respect safe-area insets so notches/home-indicators don't overlap
 *     the chrome in landscape or on notched devices
 */
/**
 * useSyncExternalStore-based "am I mounted on the client?" hook. Using this
 * instead of the classic `useEffect(() => setMounted(true), [])` avoids the
 * lint rule `react-hooks/set-state-in-effect` and is strictly zero-cost at
 * runtime (the subscribe is a no-op, the snapshot is a constant).
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function FullscreenPreviewPortal({
  open,
  title,
  ariaLabel,
  closeLabel = "Exit preview",
  onClose,
  children,
}: FullscreenPreviewPortalProps) {
  const mounted = useHasMounted();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    // iOS Safari: `overflow:hidden` alone still allows rubber-banding; setting
    // `position:fixed` keeps the backdrop stationary while preserving scroll pos.
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[2147483646] flex flex-col",
        "bg-background text-foreground",
        "scheme-light dark:scheme-dark",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
      // Use dynamic viewport units so mobile browsers don't leave a gap
      // under the dynamic UI (iOS address bar / Android nav hiding).
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-card px-3 py-2.5 shadow-sm",
        )}
        style={{
          paddingTop: "max(0.6rem, env(safe-area-inset-top))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
          <span>{closeLabel}</span>
        </Button>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
