/**
 * Time formatting helpers for the clock widget.
 *
 * Kept pure + tabular-safe (zero-padded) so the panel never jitters as
 * digits grow/shrink by a pixel.
 */

export function formatHMS(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** `mm:ss.cs` — centi-seconds for stopwatch. */
export function formatStopwatch(ms: number): string {
  const clamped = Math.max(0, ms);
  const total = Math.floor(clamped);
  const centis = Math.floor((total % 1000) / 10);
  const totalSec = Math.floor(total / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(centis)}`
    : `${pad(m)}:${pad(s)}.${pad(centis)}`;
}
