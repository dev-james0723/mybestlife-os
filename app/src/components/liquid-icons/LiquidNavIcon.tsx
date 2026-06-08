"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import type { ColorMode, UiTheme } from "@/types/database";
import {
  getLiquidIconSrc,
  type LiquidIconTargetType,
} from "@/lib/liquid-icons/navigation-assets";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

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
      aria-hidden
      data-liquid-nav-icon
      draggable={false}
      className={cn("pointer-events-none shrink-0 select-none object-contain", className, imageClassName)}
    />
  );
}
