"use client";

/**
 * Placeholder radar surface. Renders a stylised SVG "radar sweep" over
 * a dark background so the panel doesn't feel decorative-only. Will be
 * swapped for a real tile-based radar provider (RainViewer, OWM tile
 * layer, etc.) in a follow-up.
 */
export default function WeatherRadarInner({
  view,
}: {
  view: "satellite" | "street";
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-view={view}
    >
      {/* Base — dark night-vision tint. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #0d1a14 0%, #050908 100%)",
        }}
      />

      {/* Grid overlay. */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern id="radar-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="rgba(200,229,58,0.06)"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="radar-sweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,229,58,0.4)" />
            <stop offset="60%" stopColor="rgba(200,229,58,0.05)" />
            <stop offset="100%" stopColor="rgba(200,229,58,0)" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#radar-grid)" />
        {/* Concentric rings. */}
        {[15, 25, 35, 45].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="rgba(200,229,58,0.12)"
            strokeWidth="0.3"
          />
        ))}
        {/* Centre marker. */}
        <circle cx="50" cy="50" r="1.2" fill="#c8e53a" />
      </svg>

      {/* Sweep line — rotates. */}
      <div
        className="absolute left-1/2 top-1/2 size-[140%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 75%, rgba(200,229,58,0.25) 92%, transparent 100%)",
          animation: "weather-radar-sweep 8s linear infinite",
        }}
      />

      <style jsx>{`
        @keyframes weather-radar-sweep {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="weather-radar-sweep"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
