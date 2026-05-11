"use client";

import { motion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { BackdropLayer, ParallaxLayer } from "../BackdropLayer";

const r = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type SceneProps = {
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  phase: "stage" | "impact" | "cleared";
  reduceMotion: boolean;
  /** Forwarded to BackdropLayer so the orchestrator can synchronize the
   *  fade-in of every scene layer with the backdrop photo being decoded. */
  onBackdropReady?: () => void;
};

export function OceanScene({
  parallaxX,
  parallaxY,
  phase,
  reduceMotion,
  onBackdropReady,
}: SceneProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-blue-950">
      {/* L1: cinematic underwater photo */}
      <BackdropLayer
        src="/ritual/ocean-deep.png"
        alt=""
        depth="back"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
        overlayClassName="bg-gradient-to-b from-cyan-900/30 via-transparent to-blue-950/70 mix-blend-multiply"
        onReady={onBackdropReady}
      />

      {/* L2: midground god rays + drifting particles */}
      <ParallaxLayer
        depth="mid"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,_rgba(186,230,253,0.35),_transparent_60%)] mix-blend-screen pointer-events-none" />
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute h-1 w-1 rounded-full bg-cyan-100/60",
              !reduceMotion && "animate-[ritual-dust-rise_var(--d)_ease-in-out_infinite]"
            )}
            style={{
              left: `${r(i) * 100}%`,
              top: `${r(i + 7) * 100}%`,
              ["--d" as never]: `${5 + r(i + 14) * 6}s`,
              animationDelay: `${r(i + 21) * 5}s`,
            }}
          />
        ))}
      </ParallaxLayer>

      {/* L3: foreground vignette + impact ripples */}
      <ParallaxLayer
        depth="front"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.85)_100%)] pointer-events-none" />

        {phase !== "stage" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.85 }}
                animate={{ scale: 4 + i * 2, opacity: 0 }}
                transition={{ duration: 1.2 + i * 0.4, ease: "easeOut", delay: i * 0.1 }}
                className="absolute h-24 w-24 rounded-full border-2 border-cyan-100/80"
              />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={`splash-${i}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (r(i) - 0.5) * 220,
                  y: -100 - r(i + 10) * 120,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 0.8 + r(i + 20) * 0.4, ease: "easeOut" }}
                className="absolute h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
              />
            ))}
          </div>
        )}
      </ParallaxLayer>
    </div>
  );
}
