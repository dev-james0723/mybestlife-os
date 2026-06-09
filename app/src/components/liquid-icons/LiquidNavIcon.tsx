"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, createElement, type ComponentType } from "react";
import { useReducedMotion } from "framer-motion";
import type { ColorMode, UiTheme } from "@/types/database";
import {
  getLiquidIconAssetId,
  getLiquidIconSrc,
  isImageLiquidIconPackId,
  type LiquidIconTargetType,
} from "@/lib/liquid-icons/navigation-assets";
import { isAnimatedIconPackId } from "@/lib/liquid-icons/animated-icon-pack-metadata";
import {
  getAnimatedIconPackAssetComponent,
  type AnimatedIconComponent,
  type AnimatedIconHandle,
} from "@/lib/liquid-icons/animated-icon-pack-components";
import { getStyledIconPackAssetComponent } from "@/lib/liquid-icons/styled-icon-pack-components";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import type { StyledIconProps } from "@styled-icons/styled-icon";

type IconComponent = ComponentType<{ className?: string }>;

const NAV_ANIMATION_REPLAY_MS = 7600;
const NAV_ANIMATION_STOP_MS = 1800;

function getNavAnimationDelay(assetId: string): number {
  let hash = 0;
  for (const character of assetId) {
    hash = (hash * 31 + character.charCodeAt(0)) % 997;
  }
  return 240 + (hash % 980);
}

function AnimatedNavIcon({
  Icon,
  assetId,
  className,
  imageClassName,
}: {
  Icon: AnimatedIconComponent;
  assetId: string;
  className?: string;
  imageClassName?: string;
}) {
  const ref = useRef<AnimatedIconHandle>(null);
  const scheduledTimers = useRef<number[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const clearScheduledTimers = useCallback(() => {
    for (const timer of scheduledTimers.current) {
      window.clearTimeout(timer);
    }
    scheduledTimers.current = [];
  }, []);

  const safelyStart = useCallback(() => {
    try {
      const maybePromise = ref.current?.startAnimation() as unknown;
      if (
        maybePromise &&
        typeof maybePromise === "object" &&
        "catch" in maybePromise &&
        typeof maybePromise.catch === "function"
      ) {
        void maybePromise.catch(() => {});
      }
    } catch {
      // Upstream motion controls can be unavailable during a brief mount window.
    }
  }, []);

  const safelyStop = useCallback(() => {
    try {
      const maybePromise = ref.current?.stopAnimation() as unknown;
      if (
        maybePromise &&
        typeof maybePromise === "object" &&
        "catch" in maybePromise &&
        typeof maybePromise.catch === "function"
      ) {
        void maybePromise.catch(() => {});
      }
    } catch {
      // Keep navigation resilient if a copied icon has a control timing quirk.
    }
  }, []);

  const playAnimation = useCallback(() => {
    clearScheduledTimers();
    safelyStop();
    const startTimer = window.setTimeout(safelyStart, 90);
    const stopTimer = window.setTimeout(safelyStop, NAV_ANIMATION_STOP_MS);
    scheduledTimers.current = [startTimer, stopTimer];
  }, [clearScheduledTimers, safelyStart, safelyStop]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const delay = getNavAnimationDelay(assetId);
    const firstPlayTimer = window.setTimeout(playAnimation, delay);
    const replayTimer = window.setInterval(playAnimation, NAV_ANIMATION_REPLAY_MS + delay);

    return () => {
      window.clearTimeout(firstPlayTimer);
      window.clearInterval(replayTimer);
      clearScheduledTimers();
      safelyStop();
    };
  }, [assetId, clearScheduledTimers, playAnimation, prefersReducedMotion, safelyStop]);

  const handleReplay = useCallback(() => {
    if (prefersReducedMotion) return;
    playAnimation();
  }, [playAnimation, prefersReducedMotion]);

  return (
    <span
      aria-hidden
      data-animated-nav-icon="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center text-current",
        className,
      )}
      onFocus={handleReplay}
      onMouseEnter={handleReplay}
      onMouseLeave={prefersReducedMotion ? undefined : safelyStop}
    >
      <Icon
        ref={ref}
        aria-hidden
        className={cn("h-full w-full", imageClassName)}
        size={16}
      />
    </span>
  );
}

type LiquidNavIconProps = {
  fallbackIcon: IconComponent;
  targetType: LiquidIconTargetType;
  targetId: string;
  uiTheme: UiTheme;
  colorMode: ColorMode;
  className?: string;
  imageClassName?: string;
};

export function LiquidNavIcon({
  fallbackIcon: FallbackIcon,
  targetType,
  targetId,
  uiTheme,
  colorMode,
  className,
  imageClassName,
}: LiquidNavIconProps) {
  const { iconPack } = useTheme();
  const assetId = getLiquidIconAssetId(targetType, targetId);
  const AnimatedIcon =
    assetId && isAnimatedIconPackId(iconPack)
      ? getAnimatedIconPackAssetComponent(iconPack, assetId)
      : undefined;
  const StyledIcon =
    assetId && !isImageLiquidIconPackId(iconPack) && !isAnimatedIconPackId(iconPack)
      ? getStyledIconPackAssetComponent(iconPack, assetId)
      : undefined;

  if (AnimatedIcon && assetId) {
    return (
      <AnimatedNavIcon
        Icon={AnimatedIcon}
        assetId={assetId}
        className={className}
        imageClassName={imageClassName}
      />
    );
  }

  if (StyledIcon) {
    const styledIconProps: StyledIconProps & { "data-styled-nav-icon": string } = {
      "aria-hidden": true,
      focusable: "false",
      "data-styled-nav-icon": "true",
      className: cn(
        "pointer-events-none shrink-0 select-none text-current",
        className,
        imageClassName,
      ),
    };

    return createElement(StyledIcon, styledIconProps);
  }

  const src = getLiquidIconSrc({ targetType, targetId, uiTheme, colorMode, iconPack });

  if (!src) {
    return <FallbackIcon className={className} />;
  }

  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      unoptimized
      loading="eager"
      decoding="async"
      aria-hidden
      data-liquid-nav-icon
      draggable={false}
      className={cn("pointer-events-none shrink-0 select-none object-contain", className, imageClassName)}
    />
  );
}
