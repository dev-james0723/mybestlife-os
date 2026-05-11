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

export function TrashScene({
  parallaxX,
  parallaxY,
  phase,
  reduceMotion,
  onBackdropReady,
}: SceneProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-stone-950">
      {/* L1: cinematic photo backdrop */}
      <BackdropLayer
        src="/ritual/office-trash.png"
        alt=""
        depth="back"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
        overlayClassName="bg-gradient-to-b from-amber-950/20 via-transparent to-black/70 mix-blend-multiply"
        onReady={onBackdropReady}
      />

      {/* L2: midground dust motes drifting */}
      <ParallaxLayer
        depth="mid"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute h-1.5 w-1.5 rounded-full bg-amber-200/30",
              !reduceMotion && "animate-[ritual-dust-rise_var(--d)_ease-in-out_infinite]"
            )}
            style={{
              left: `${r(i) * 100}%`,
              top: `${r(i + 10) * 100}%`,
              ["--d" as never]: `${4 + r(i + 20) * 6}s`,
              animationDelay: `${r(i + 30) * 5}s`,
            }}
          />
        ))}
      </ParallaxLayer>

      {/* L3: foreground vignette + impact burst */}
      <ParallaxLayer
        depth="front"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,black_100%)] pointer-events-none" />

        {phase !== "stage" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.2, opacity: 0.85 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="absolute h-24 w-24 rounded-[40%] border-[6px] border-amber-200/40"
            />
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * Math.PI * 2;
              const velocity = 50 + r(i) * 90;
              return (
                <motion.div
                  key={`dust-${i}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * velocity,
                    y: Math.sin(angle) * velocity - 20,
                    opacity: 0,
                    scale: 2 + r(i + 10) * 2,
                  }}
                  transition={{ duration: 0.6 + r(i + 20) * 0.4, ease: "easeOut" }}
                  className="absolute h-6 w-6 rounded-full bg-amber-100/30 blur-sm"
                />
              );
            })}
          </div>
        )}
      </ParallaxLayer>
    </div>
  );
}
