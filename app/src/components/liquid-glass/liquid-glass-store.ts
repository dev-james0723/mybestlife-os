"use client";

import { create } from "zustand";

/**
 * Liquid Glass v2 — shared state between LiquidGlassController (DOM side)
 * and LiquidGlassBackdrop (WebGL side).
 *
 * Two channels:
 *  - a zustand store for low-frequency React state (quality tier, flags)
 *  - a mutable, non-React lens registry for per-frame rect syncing, so
 *    scrolling never triggers React re-renders.
 */

export type LiquidGlassQuality = "high" | "mid" | "low";

export const MAX_LENSES = 12;

/* ---------------------------------------------------------------- */
/* Animated wallpaper scenes                                         */
/* ---------------------------------------------------------------- */

export const LG_SCENES = [
  "stardust",
  "aurora",
  "ocean",
  "nebula",
  "bokeh",
  "butterflies",
] as const;

export type LiquidGlassScene = (typeof LG_SCENES)[number];

/** Shader scene index — must match the dispatch order in the fragment shader. */
export const LG_SCENE_INDEX: Record<LiquidGlassScene, number> = {
  aurora: 0,
  ocean: 1,
  nebula: 2,
  bokeh: 3,
  butterflies: 4,
  stardust: 5,
};

export const LG_SCENE_STORAGE_KEY = "mylifeos-lg-scene";
export const LG_DEFAULT_SCENE: LiquidGlassScene = "stardust";

export function parseLiquidGlassScene(value: unknown): LiquidGlassScene {
  return LG_SCENES.includes(value as LiquidGlassScene)
    ? (value as LiquidGlassScene)
    : LG_DEFAULT_SCENE;
}

function readStoredScene(): LiquidGlassScene {
  if (typeof window === "undefined") return LG_DEFAULT_SCENE;
  try {
    return parseLiquidGlassScene(localStorage.getItem(LG_SCENE_STORAGE_KEY));
  } catch {
    return LG_DEFAULT_SCENE;
  }
}

/** data-lg-lens values, highest priority first when competing for slots. */
const LENS_RANK: Record<string, number> = {
  overlay: 4,
  island: 3,
  pill: 2,
  panel: 1,
};

export type LensEntry = {
  el: Element;
  rank: number;
  /** Resolved border-radius in CSS px (read once at registration). */
  radius: number;
  /** Refraction strength multiplier; press wobble tweens this to ~1.6. */
  strength: number;
  visible: boolean;
};

export type LensSnapshotItem = {
  /** Viewport-space rect, CSS px. */
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  strength: number;
};

class LensRegistry {
  private entries = new Map<Element, LensEntry>();
  private listeners = new Set<() => void>();
  /** Reused snapshot buffer — the WebGL side reads this in useFrame. */
  readonly snapshot: LensSnapshotItem[] = [];
  snapshotCount = 0;
  /** Timestamp until which the backdrop should keep re-rendering (drift + sync). */
  activityUntil = 0;

  register(el: Element) {
    if (this.entries.has(el)) return;
    const kind = el.getAttribute("data-lg-lens") ?? "panel";
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
    this.entries.set(el, {
      el,
      rank: LENS_RANK[kind] ?? 1,
      radius,
      strength: 1,
      visible: true,
    });
    this.bump();
  }

  unregister(el: Element) {
    if (this.entries.delete(el)) this.bump();
  }

  get(el: Element) {
    return this.entries.get(el);
  }

  setVisible(el: Element, visible: boolean) {
    const entry = this.entries.get(el);
    if (entry && entry.visible !== visible) {
      entry.visible = visible;
      this.bump();
    }
  }

  all() {
    return this.entries.values();
  }

  get size() {
    return this.entries.size;
  }

  /**
   * Re-measure visible lenses and refresh the snapshot buffer with the
   * top MAX_LENSES by rank, then area. Called from the controller's rAF
   * loop; getBoundingClientRect on ≤ a few dozen elements is cheap.
   */
  measure() {
    const candidates: Array<{ entry: LensEntry; rect: DOMRect }> = [];
    for (const entry of this.entries.values()) {
      if (!entry.visible || !entry.el.isConnected) continue;
      const rect = entry.el.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24) continue;
      if (rect.bottom < 0 || rect.right < 0) continue;
      if (rect.top > window.innerHeight || rect.left > window.innerWidth) continue;
      candidates.push({ entry, rect });
    }
    candidates.sort(
      (a, b) =>
        b.entry.rank - a.entry.rank ||
        b.rect.width * b.rect.height - a.rect.width * a.rect.height
    );
    const count = Math.min(candidates.length, MAX_LENSES);
    this.snapshot.length = Math.max(this.snapshot.length, count);
    for (let i = 0; i < count; i++) {
      const { entry, rect } = candidates[i];
      const slot = this.snapshot[i] ?? { x: 0, y: 0, w: 0, h: 0, r: 0, strength: 1 };
      slot.x = rect.left;
      slot.y = rect.top;
      slot.w = rect.width;
      slot.h = rect.height;
      slot.r = entry.radius;
      slot.strength = entry.strength;
      this.snapshot[i] = slot;
    }
    this.snapshotCount = count;
  }

  /** Keep the WebGL canvas live for `ms` more milliseconds. */
  keepAlive(ms = 600) {
    this.activityUntil = Math.max(this.activityUntil, performance.now() + ms);
    this.bump();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  bump() {
    for (const fn of this.listeners) fn();
  }
}

export const lensRegistry = new LensRegistry();

type LiquidGlassState = {
  quality: LiquidGlassQuality;
  /** WebGL wallpaper+lens canvas should mount (default theme, capable device). */
  canvasEnabled: boolean;
  /** Chromium-only SVG displacement backdrop-filter is active. */
  displacementEnabled: boolean;
  /** Active animated wallpaper scene (persisted to localStorage). */
  scene: LiquidGlassScene;
  setScene: (scene: LiquidGlassScene) => void;
  set: (partial: Partial<Omit<LiquidGlassState, "set" | "setScene">>) => void;
};

export const useLiquidGlassStore = create<LiquidGlassState>((set) => ({
  quality: "mid",
  canvasEnabled: false,
  displacementEnabled: false,
  scene: readStoredScene(),
  setScene: (scene) => {
    set({ scene });
    try {
      localStorage.setItem(LG_SCENE_STORAGE_KEY, scene);
    } catch {
      /* private mode etc. — scene still applies for the session */
    }
  },
  set: (partial) => set(partial),
}));
