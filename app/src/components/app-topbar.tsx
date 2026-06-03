"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LifeOsLogo } from "@/components/branding/life-os-logo";
import { useAppStore } from "@/stores/app-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { getAppDisplayName } from "@/lib/i18n/app-brand";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { SearchPill, SearchIconTrigger } from "@/components/topbar/search-pill";
import { GlobalCommandPalette } from "@/components/topbar/global-command-palette";
import { WeatherBadge } from "@/components/topbar/weather-badge";
import { UtilityPill } from "@/components/topbar/utility-pill";
import { ClockPill } from "@/components/topbar/clock-pill";
import { APP_TOPBAR_DESKTOP_ROW_GUTTER_X } from "@/lib/layout-shell";
import { useSsrSafeReducedMotion } from "@/hooks/use-ssr-safe-reduced-motion";

/** Matches `h-14` — flow spacer / clip shell use the same height token. */
export const APP_TOPBAR_LAYOUT_HEIGHT_CLASS = "h-14";
/**
 * Mobile scroll region: clears the fixed `h-14` topbar plus a gap before the
 * first heading. From `sm` (640px) the weather pill is shown and the row is
 * busier — add more inset so the greeting / page title does not stick to the bar.
 */
export const APP_TOPBAR_LAYOUT_HEIGHT_CLASS_PT =
  "pt-[calc(3.5rem+1.25rem)] sm:pt-[calc(3.5rem+2.25rem)]";

const TOPBAR_TRANSITION =
  "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] will-change-transform transform-gpu";

type AppTopbarProps = {
  /** Mobile only: slide the bar up with `translateY(-100%)` (fixed layer; no layout reflow). */
  slideHidden?: boolean;
};

/**
 * Track whether the page has been scrolled past a small threshold so the
 * top bar can deepen its glass on scroll. Listens to the protected scroll
 * container when present (identified via `role="region"` with the main
 * content aria-label set by ProtectedScrollLayout).
 */
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const container = document.querySelector<HTMLElement>(
      '[role="region"][aria-label="Main content"]'
    );
    const target: Window | HTMLElement = container ?? window;
    const read = () => {
      const y =
        target === window
          ? window.scrollY
          : (target as HTMLElement).scrollTop;
      setScrolled(y > threshold);
    };
    read();
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, [threshold]);
  return scrolled;
}

/**
 * Stagger children entrance animation. Only runs under the Liquid Glass
 * theme — other themes intentionally get a static render so we don't
 * touch their existing presentation semantics.
 */
function EnterStagger({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const reduce = useSsrSafeReducedMotion();
  if (!enabled || reduce) return <>{children}</>;
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="contents"
    >
      {children}
    </motion.div>
  );
}

function EnterItem({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const reduce = useSsrSafeReducedMotion();
  if (!enabled || reduce) return <>{children}</>;
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: -6, scale: 0.98 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
        },
      }}
      className="contents"
    >
      {children}
    </motion.div>
  );
}

function TopbarInnerRow() {
  const { language } = useAppStore();
  const dashboardHref = useLocalizedPath("/dashboard");
  const isMobile = useIsMobile();
  const { uiTheme } = useTheme();
  const isGlass = uiTheme === "default";

  if (isMobile) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5 overflow-x-hidden px-3">
        <Link
          href={dashboardHref}
          className="flex min-h-11 min-w-0 items-center gap-2 text-foreground"
        >
          <LifeOsLogo size="sm" className="shrink-0" />
          <span className="truncate text-sm font-bold tracking-tight sm:text-base">
            {getAppDisplayName(language)}
          </span>
        </Link>
        <div className="flex-1" />
        <EnterStagger enabled={isGlass}>
          {/* Weather: on very narrow phones we hide the badge entirely to
              avoid wrapping — reappears from the `sm:` breakpoint. */}
          <EnterItem enabled={isGlass}>
            <div className="hidden sm:block">
              <WeatherBadge compact />
            </div>
          </EnterItem>
          <EnterItem enabled={isGlass}>
            <SearchIconTrigger />
          </EnterItem>
          <EnterItem enabled={isGlass}>
            <UtilityPill />
          </EnterItem>
          <EnterItem enabled={isGlass}>
            <ClockPill />
          </EnterItem>
        </EnterStagger>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-x-hidden lg:gap-3",
        APP_TOPBAR_DESKTOP_ROW_GUTTER_X
      )}
    >
      <SearchPill />
      <div className="flex-1" />
      <EnterStagger enabled={isGlass}>
        <EnterItem enabled={isGlass}>
          <WeatherBadge />
        </EnterItem>
        <EnterItem enabled={isGlass}>
          <UtilityPill />
        </EnterItem>
        <EnterItem enabled={isGlass}>
          <ClockPill />
        </EnterItem>
      </EnterStagger>
    </div>
  );
}

export function AppTopbar({ slideHidden = false }: AppTopbarProps) {
  const isMobile = useIsMobile();
  const scrolled = useScrolled(20);
  const reduce = useSsrSafeReducedMotion();
  const { uiTheme } = useTheme();
  const isGlass = uiTheme === "default";

  const motionProps = isGlass && !reduce
    ? {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
      }
    : {};

  if (isMobile) {
    return (
      <>
        <motion.header
          role="banner"
          {...motionProps}
          className={cn(
            "topbar-glass fixed inset-x-0 top-0 z-50 flex h-14 w-full flex-col items-stretch overflow-hidden",
            scrolled && "topbar-scrolled",
            TOPBAR_TRANSITION,
            slideHidden
              ? "-translate-y-full pointer-events-none"
              : "translate-y-0"
          )}
        >
          <TopbarInnerRow />
        </motion.header>
        <GlobalCommandPalette />
      </>
    );
  }

  return (
    <>
      <motion.header
        role="banner"
        {...motionProps}
        className={cn(
          "topbar-glass sticky top-0 z-40 flex w-full shrink-0 flex-col items-stretch",
          scrolled && "topbar-scrolled",
          APP_TOPBAR_LAYOUT_HEIGHT_CLASS
        )}
      >
        <TopbarInnerRow />
      </motion.header>
      <GlobalCommandPalette />
    </>
  );
}
