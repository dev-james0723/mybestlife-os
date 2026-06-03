"use client";

import { useEffect } from "react";
import { Menu } from "lucide-react";
import { AppTopbar, APP_TOPBAR_LAYOUT_HEIGHT_CLASS_PT } from "@/components/app-topbar";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartScrollNav } from "@/hooks/use-smart-scroll-nav";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { PROTECTED_DESKTOP_GUTTER_X } from "@/lib/layout-shell";

const NAV_TRANSITION =
  "transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] will-change-transform";

export function ProtectedScrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const { scrollRef, navHidden } = useSmartScrollNav(isMobile);
  const { toggleSidebar, openMobile } = useSidebar();

  const showFab = isMobile && navHidden && !openMobile;
  const shellHidden = Boolean(isMobile && navHidden);

  useEffect(() => {
    if (!openMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openMobile]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/*
        Mobile: topbar is `position: fixed` (no layout flow). Reserve space on
        the scroll region (topbar height + gap — see `APP_TOPBAR_LAYOUT_HEIGHT_CLASS_PT`).

        Desktop: topbar is the first child *inside* the scroll region so
        `header.topbar-glass` stays transparent but composites against the same
        `bg-muted/40` as the page — not an opaque band behind the pills.

        Theme atmosphere (`[data-atmosphere]::before` in globals.css) lives on
        `SidebarProvider`'s wrapper so radial glows span sidebar + main.
      */}
      {isMobile ? (
        <>
          <AppTopbar slideHidden={shellHidden} />
          <div
            ref={scrollRef}
            role="region"
            aria-label="Main content"
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-muted/40 px-4 py-6 [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-8",
              APP_TOPBAR_LAYOUT_HEIGHT_CLASS_PT,
              showFab && "pb-24"
            )}
          >
            <div className="mx-auto w-full max-w-7xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </div>
        </>
      ) : (
        <div
          ref={scrollRef}
          role="region"
          aria-label="Main content"
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-muted/40 [-webkit-overflow-scrolling:touch]",
            showFab && "pb-24"
          )}
        >
          <AppTopbar slideHidden={false} />
          <div
            className={cn(
              "mx-auto w-full max-w-7xl pt-8 pb-6 sm:pt-10 sm:pb-8",
              PROTECTED_DESKTOP_GUTTER_X
            )}
          >
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      )}
      {isMobile ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => toggleSidebar()}
          className={cn(
            "fixed z-[45] size-14 shrink-0 rounded-full border-0 bg-background text-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10",
            "bottom-[max(5rem,calc(env(safe-area-inset-bottom,0px)+3.5rem))] right-4",
            NAV_TRANSITION,
            showFab
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-2 scale-90 opacity-0"
          )}
          aria-label="Open menu"
          tabIndex={showFab ? 0 : -1}
        >
          <Menu className="size-6" />
        </Button>
      ) : null}
    </div>
  );
}
