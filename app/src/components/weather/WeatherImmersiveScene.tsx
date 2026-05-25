"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { WeatherScene } from "@/lib/weather/scene-mapper";

import { WeatherBackgroundScene } from "./WeatherBackgroundScene";

interface WeatherImmersiveSceneProps {
  scene: WeatherScene | null;
  backgroundImageUrl: string | null;
  colorMode: "light" | "dark";
}

/**
 * Renders the cinematic weather scene as a viewport-filling, fixed layer
 * *behind the entire app chrome* (sidebar, topbar, content) instead of
 * boxed inside the page content.
 *
 * How it works:
 * - The scene is portaled to `document.body` so no `overflow:hidden` or
 *   transformed ancestor can clip it, and it sits in the root stacking
 *   context at `z-index:-1` (above the body background, below all app
 *   content).
 * - While mounted it adds `weather-immersive` (+ `weather-immersive-light`)
 *   to <html>; scoped CSS in globals.css then makes the sidebar wrapper /
 *   inset / scroll region transparent so the animation shows through. The
 *   class is removed on unmount, so every other page is untouched.
 */
export function WeatherImmersiveScene({
  scene,
  backgroundImageUrl,
  colorMode,
}: WeatherImmersiveSceneProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("weather-immersive");
    html.classList.toggle("weather-immersive-light", colorMode === "light");
    return () => {
      html.classList.remove("weather-immersive", "weather-immersive-light");
    };
  }, [colorMode]);

  if (!mounted) return null;

  return createPortal(
    <div className="weather-immersive-layer" aria-hidden>
      <WeatherBackgroundScene scene={scene} backgroundImageUrl={backgroundImageUrl} />
    </div>,
    document.body,
  );
}
