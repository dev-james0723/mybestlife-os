"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useDeferredClientMount } from "@/hooks/use-deferred-client-mount";
import type { ColorMode, UiTheme } from "@/types/database";
import type { LiquidIconTargetType } from "@/lib/liquid-icons/navigation-assets";

type IconComponent = ComponentType<{ className?: string }>;

type DeferredLiquidNavIconProps = {
  fallbackIcon: IconComponent;
  targetType: LiquidIconTargetType;
  targetId: string;
  uiTheme: UiTheme;
  colorMode: ColorMode;
  className?: string;
  imageClassName?: string;
};

const LazyLiquidNavIcon = dynamic(
  () => import("@/components/liquid-icons/LiquidNavIcon").then((mod) => mod.LiquidNavIcon),
  { ssr: false },
);

export function DeferredLiquidNavIcon({
  fallbackIcon: FallbackIcon,
  ...props
}: DeferredLiquidNavIconProps) {
  const ready = useDeferredClientMount({ timeoutMs: 2_500, fallbackDelayMs: 1_500 });

  if (!ready) {
    return <FallbackIcon className={props.className} />;
  }

  return <LazyLiquidNavIcon fallbackIcon={FallbackIcon} {...props} />;
}
