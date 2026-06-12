"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/lib/theme-context";
import { LiquidGlassController } from "./liquid-glass-controller";
import { useLiquidGlassStore } from "./liquid-glass-store";

/**
 * Animated wallpaper — root mount (protected layout).
 *
 * Renders nothing unless the active UI theme is "default", so the other
 * themes (astronaut / academia / forest) never pay for any of this — the
 * Three.js chunk is loaded lazily (ssr:false) and only on capable devices
 * (the controller's quality manager gates `canvasEnabled`).
 */
const LiquidGlassBackdrop = dynamic(() => import("./liquid-glass-backdrop"), {
  ssr: false,
});

export function LiquidGlassRoot() {
  const { uiTheme, colorMode } = useTheme();
  const canvasEnabled = useLiquidGlassStore((s) => s.canvasEnabled);

  if (uiTheme !== "default") return null;

  return (
    <>
      <LiquidGlassController />
      {canvasEnabled ? <LiquidGlassBackdrop colorMode={colorMode} /> : null}
    </>
  );
}
