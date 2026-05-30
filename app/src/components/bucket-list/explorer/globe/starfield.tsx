"use client";

/**
 * Starfield — a large shell of points surrounding the whole scene. Uses
 * sizeAttenuation:false so stars stay a constant pixel size regardless of
 * the ECEF-scale camera distance (no scaling math needed). Radius sits well
 * outside the camera's orbital distance but inside the far plane.
 *
 * Positions come from a seeded PRNG (not Math.random) so generation is pure
 * + stable across renders.
 */

import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";

/** Deterministic PRNG (mulberry32) — pure, so it's render-safe. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Starfield({ count = 6500, radius = 9e7 }: { count?: number; radius?: number }) {
  const geometry = useMemo(() => {
    const rand = makeRng(0x5eed);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand();
      const v = rand();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.85 + rand() * 0.3);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return g;
  }, [count, radius]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#dfe9ff"
        size={1.6}
        sizeAttenuation={false}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
