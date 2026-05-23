"use client";

import { useMemo } from "react";

import type { WeatherScene } from "@/lib/weather/scene-mapper";

interface WeatherBackgroundSceneProps {
  scene: WeatherScene | null;
  backgroundImageUrl: string | null;
}

/**
 * Cinematic, position:absolute background that lives inside the weather
 * workspace shell. Layers (from back to front):
 *
 *   1. Base gradient   — always-on, per scene
 *   2. Photo           — Unsplash photo (optional)
 *   3. Scrim           — dark vignette to guarantee text contrast
 *   4. Sun glow        — clear-day only
 *   5. Starfield       — clear-night only
 *   6. Fog drift       — fog scenes
 *   7. Rain layer      — rain scenes
 *   8. Snow layer      — snow scenes
 *   9. Lightning flash — thunderstorm scenes
 *
 * Each animated layer respects `prefers-reduced-motion` via the rules in
 * `globals.css`.
 */
export function WeatherBackgroundScene({
  scene,
  backgroundImageUrl,
}: WeatherBackgroundSceneProps) {
  // Pre-compute drop positions once so React doesn't re-randomize every
  // render (which would visually "shake" the rain pattern).
  const rainDrops = useMemo(
    () => (scene?.layers.rain ? makeRainDrops(scene.layers.rain) : []),
    [scene?.layers.rain],
  );
  const snowflakes = useMemo(
    () => (scene?.layers.snow ? makeSnowflakes() : []),
    [scene?.layers.snow],
  );

  if (!scene) {
    return (
      <div className="weather-scene-root" aria-hidden>
        <div
          className="weather-scene-gradient"
          style={{
            background: "linear-gradient(180deg, #131520 0%, #1d2030 100%)",
          }}
        />
        <div className="weather-scene-scrim" />
      </div>
    );
  }

  return (
    <div className="weather-scene-root" aria-hidden>
      {/* 1. Base gradient. */}
      <div
        className="weather-scene-gradient"
        style={{ background: scene.baseGradient }}
      />

      {/* 2. Photo layer (Unsplash). */}
      {backgroundImageUrl ? (
        <div
          className="weather-scene-photo"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />
      ) : null}

      {/* 3. Scrim. */}
      <div className="weather-scene-scrim" />

      {/* 4. Sun glow. */}
      {scene.layers.sun ? <div className="weather-sun-glow" /> : null}

      {/* 5. Starfield. */}
      {scene.layers.starfield ? <div className="weather-starfield" /> : null}

      {/* 6. Fog drift. */}
      {scene.layers.fog ? <div className="weather-fog-layer" /> : null}

      {/* 7. Rain. */}
      {scene.layers.rain ? (
        <div className={`weather-rain-layer weather-rain-${scene.layers.rain}`}>
          {rainDrops.map((d, i) => (
            <span
              key={i}
              className="weather-rain-drop"
              style={{
                left: `${d.left}%`,
                animationDuration: `${d.duration}s`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* 8. Snow. */}
      {scene.layers.snow ? (
        <div className="weather-snow-layer">
          {snowflakes.map((s, i) => (
            <span
              key={i}
              className="weather-snowflake"
              style={{
                left: `${s.left}%`,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
                width: `${s.size}px`,
                height: `${s.size}px`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* 9. Lightning. */}
      {scene.layers.lightning ? <div className="weather-lightning" /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deterministic-enough particle generators
// ---------------------------------------------------------------------------

function makeRainDrops(intensity: "light" | "moderate" | "heavy") {
  const count = intensity === "heavy" ? 90 : intensity === "moderate" ? 60 : 35;
  return Array.from({ length: count }, (_, i) => {
    // Use the index to get a stable spread that doesn't flicker on remount.
    const left = ((i * 53) % 100) + ((i * 7) % 10) / 10;
    const duration = 0.5 + ((i * 13) % 10) / 14; // 0.5s..1.2s
    const delay = ((i * 31) % 30) / 10; // 0..3s
    return { left, duration, delay };
  });
}

function makeSnowflakes() {
  return Array.from({ length: 50 }, (_, i) => {
    const left = ((i * 71) % 100) + ((i * 11) % 10) / 10;
    const duration = 6 + ((i * 17) % 8); // 6s..14s
    const delay = ((i * 23) % 50) / 10; // 0..5s
    const size = 3 + ((i * 5) % 4); // 3px..6px
    return { left, duration, delay, size };
  });
}
