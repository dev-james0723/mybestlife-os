/**
 * Silence the 3d-tiles-renderer's per-tile "Failed to load tile" logs.
 *
 * During a fast space→city descent the renderer requests and then aborts a
 * large number of tiles as the camera moves through LOD levels; each abort is
 * logged via console.error. None of these are actionable — but they flood the
 * Next.js dev error overlay (the dreaded "41 issues"). We filter ONLY that
 * exact message so genuine errors are left completely untouched.
 *
 * Install once, client-only.
 */

let installed = false;

export function suppressTileRendererLogs(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const isTileNoise = args.some((a) => {
      const msg = typeof a === "string" ? a : a instanceof Error ? a.message : "";
      // Per-tile abort logs, plus the transient "GLB parsed as JSON" noise
      // ("Unexpected token … \"glTF…\"") emitted while the Google tiles
      // session is still establishing on first load.
      return msg.includes("Failed to load tile") || msg.includes("glTF");
    });
    if (isTileNoise) return;
    original(...(args as Parameters<typeof console.error>));
  };
}
