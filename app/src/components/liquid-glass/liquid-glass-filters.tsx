"use client";

import { useMemo } from "react";
import { useLiquidGlassStore } from "./liquid-glass-store";

/**
 * Liquid Glass v2 — SVG displacement filters (L3, Chromium only).
 *
 * Renders a zero-size <svg> with rounded-rect lens displacement maps,
 * referenced from globals.css as
 *   backdrop-filter: url(#lg-displace-…) blur(…) saturate(…)
 * under html[data-lg-displacement]. The maps are generated at runtime on
 * an offscreen canvas: R encodes horizontal displacement, G vertical,
 * neutral 0.5 in the flat centre, ramping outward inside the edge band —
 * the same SDF maths as the WebGL lens shader, so both refraction layers
 * bend the same way.
 */

type FilterDef = {
  id: string;
  /** feDisplacementMap scale (px at full ramp). */
  scale: number;
  /** Corner radius as a fraction of map size. */
  radiusFrac: number;
  /** Edge band width as a fraction of map size. */
  bandFrac: number;
};

const FILTERS: FilterDef[] = [
  { id: "lg-displace-panel", scale: 24, radiusFrac: 0.16, bandFrac: 0.22 },
  { id: "lg-displace-panel-active", scale: 44, radiusFrac: 0.16, bandFrac: 0.22 },
  { id: "lg-displace-control", scale: 16, radiusFrac: 0.42, bandFrac: 0.3 },
];

/** Signed distance to a rounded box centred at origin. */
function sdRoundedBox(px: number, py: number, hx: number, hy: number, r: number) {
  const qx = Math.abs(px) - hx + r;
  const qy = Math.abs(py) - hy + r;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r;
}

function makeDisplacementMap(radiusFrac: number, bandFrac: number): string {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(size, size);
  const half = size / 2;
  const r = size * radiusFrac;
  const band = size * bandFrac;
  const eps = 0.75;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5 - half;
      const py = y + 0.5 - half;
      const d = sdRoundedBox(px, py, half, half, r);
      let dx = 0;
      let dy = 0;
      if (d < 0 && d > -band) {
        // Ramp: 0 at the inner edge of the band, 1 at the boundary.
        const t = 1 + d / band;
        const ease = t * t;
        // SDF gradient (outward normal) via central differences.
        const gx =
          sdRoundedBox(px + eps, py, half, half, r) -
          sdRoundedBox(px - eps, py, half, half, r);
        const gy =
          sdRoundedBox(px, py + eps, half, half, r) -
          sdRoundedBox(px, py - eps, half, half, r);
        const len = Math.hypot(gx, gy) || 1;
        // Outward displacement → backdrop sampled from outside the edge →
        // convex-lens magnification with edge bending.
        dx = (gx / len) * ease;
        dy = (gy / len) * ease;
      }
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(128 + dx * 127);
      img.data[i + 1] = Math.round(128 + dy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export function LiquidGlassFilters() {
  const enabled = useLiquidGlassStore((s) => s.displacementEnabled);

  // `enabled` only ever becomes true on the client (the controller sets it
  // after mount), so the canvas work below never runs during SSR.
  const maps = useMemo(() => {
    if (!enabled) return null;
    const generated: Record<string, string> = {};
    for (const def of FILTERS) {
      const key = `${def.radiusFrac}-${def.bandFrac}`;
      if (!generated[key]) generated[key] = makeDisplacementMap(def.radiusFrac, def.bandFrac);
    }
    return generated;
  }, [enabled]);

  if (!enabled || !maps) return null;

  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        {FILTERS.map((def) => (
          <filter
            key={def.id}
            id={def.id}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={maps[`${def.radiusFrac}-${def.bandFrac}`]}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="lg-map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="lg-map"
              scale={def.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
