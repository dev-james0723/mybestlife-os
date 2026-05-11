"use client";

/**
 * Lightweight, CSS-only watermark overlay. We purposely don't burn the label
 * into the PDF itself: that would require re-rendering the PDF client-side
 * and greatly inflate the bundle. The `pointer-events-none` overlay is good
 * enough to deter casual screenshot sharing, which is what the Phase 4 spec
 * asks for ("traceable screenshots").
 */
export function WatermarkOverlay({ text }: { text: string }) {
  const rows = 6;
  const cols = 4;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="grid h-full w-full grid-rows-[repeat(6,1fr)] grid-cols-[repeat(4,1fr)]">
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[10px] font-medium tracking-wide text-black/10 dark:text-white/10"
            style={{ transform: "rotate(-28deg)" }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
