import type { EngineCapability } from "./engine-adapter";

/**
 * SSR-safe WebGL detection — mirrors the Brain sphere's probe. Returns
 * false on the server so the Canvas never mounts during SSR/build.
 */
let webGLAvailable: boolean | undefined;

export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (webGLAvailable !== undefined) return webGLAvailable;
  try {
    const canvas = document.createElement("canvas");
    // Three r180 requires WebGL2. Release the probe: repeated getSnapshot
    // calls previously leaked contexts and evicted the live canvas on iOS.
    const context = canvas.getContext("webgl2");
    webGLAvailable = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return webGLAvailable;
  } catch {
    webGLAvailable = false;
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
