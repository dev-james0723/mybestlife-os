import type { EngineCapability } from "./engine-adapter";

/**
 * SSR-safe WebGL detection — mirrors the Brain sphere's probe. Returns
 * false on the server so the Canvas never mounts during SSR/build.
 */
export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Coarse capability probe used to pick the engine route + tile detail.
 * Conservative: anything without WebGL falls straight to the image route.
 */
export function detectCapability(): EngineCapability {
  if (!detectWebGL()) return { webgl: false, tier: "none" };
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4;
  const deviceMemory =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
      : 4;
  const tier: EngineCapability["tier"] =
    cores >= 8 && deviceMemory >= 8 ? "high" : cores >= 4 ? "mid" : "low";
  return { webgl: true, tier };
}
