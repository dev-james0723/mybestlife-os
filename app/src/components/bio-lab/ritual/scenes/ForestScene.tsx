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

export function ForestScene({
  parallaxX,
  parallaxY,
  phase,
  reduceMotion,
  onBackdropReady,
}: SceneProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-emerald-950">
      {/* L1: cinematic forest photo */}
      <BackdropLayer
        src="/ritual/forest-mystical.png"
        alt=""
        depth="back"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
        overlayClassName="bg-gradient-to-b from-emerald-900/30 via-transparent to-black/60 mix-blend-multiply"
        onReady={onBackdropReady}
      />

      {/* L2: midground falling leaves */}
      <ParallaxLayer
        depth="mid"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute h-3 w-3 rounded-tl-full rounded-br-full bg-lime-400/70 shadow-[0_0_4px_rgba(132,204,22,0.4)]",
              !reduceMotion && "ritual-leaf-fall"
            )}
            style={{
              left: `${10 + r(i) * 80}%`,
              top: `-5%`,
              ["--d" as never]: `${4 + r(i + 10) * 4}s`,
              animationDelay: `${r(i + 20) * 4}s`,
            }}
          />
        ))}
      </ParallaxLayer>

      {/* L3: foreground god-ray glow + impact burst */}
      <ParallaxLayer
        depth="front"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(254,240,138,0.18),_transparent_60%)] mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />

        {phase !== "stage" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * Math.PI * 2;
              const velocity = 80 + r(i) * 130;
              return (
                <motion.div
                  key={`burst-${i}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
                  animate={{
                    x: Math.cos(angle) * velocity,
                    y: Math.sin(angle) * velocity + 60,
                    opacity: 0,
                    scale: 1.6,
                    rotate: r(i + 30) * 360,
                  }}
                  transition={{ duration: 0.7 + r(i + 40) * 0.4, ease: "easeOut" }}
                  className="absolute h-4 w-4 rounded-tl-full rounded-br-full bg-lime-300 shadow-[0_0_8px_rgba(190,242,100,0.5)]"
                />
              );
            })}
          </div>
        )}
      </ParallaxLayer>
    </div>
  );
}
