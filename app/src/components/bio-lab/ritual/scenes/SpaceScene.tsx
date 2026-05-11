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

export function SpaceScene({
  parallaxX,
  parallaxY,
  phase,
  reduceMotion,
  onBackdropReady,
}: SceneProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* L1: cinematic nebula photo */}
      <BackdropLayer
        src="/ritual/space-nebula.png"
        alt=""
        depth="back"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
        overlayClassName="bg-gradient-to-b from-indigo-950/20 via-transparent to-black/40 mix-blend-multiply"
        onReady={onBackdropReady}
      />

      {/* L2: midground twinkling stars + meteor */}
      <ParallaxLayer
        depth="mid"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        {Array.from({ length: 40 }).map((_, i) => {
          const big = r(i) > 0.8;
          const blur = r(i + 10) > 0.5 ? "blur-[0.5px]" : "blur-none";
          return (
            <div
              key={i}
              className={cn(
                "absolute rounded-full bg-white",
                big ? "h-1 w-1" : "h-[2px] w-[2px]",
                blur,
                !reduceMotion && "animate-[ritual-star-twinkle_var(--d)_ease-in-out_infinite]"
              )}
              style={{
                left: `${r(i + 20) * 100}%`,
                top: `${r(i + 30) * 100}%`,
                ["--d" as never]: `${2 + r(i + 40) * 4}s`,
                animationDelay: `${r(i + 50) * 4}s`,
                opacity: 0.3 + r(i + 60) * 0.7,
              }}
            />
          );
        })}

        <div
          className={cn(
            "absolute right-1/4 top-0 h-[1px] w-32 rotate-[35deg] bg-gradient-to-r from-transparent via-white to-transparent opacity-0",
            !reduceMotion && "animate-[ritual-meteor_6s_linear_infinite_2s]"
          )}
        />
      </ParallaxLayer>

      {/* L3: foreground vignette + supernova impact */}
      <ParallaxLayer
        depth="front"
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        reduceMotion={reduceMotion}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

        {phase !== "stage" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-screen">
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 8, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute h-12 w-12 rounded-full bg-white blur-xl"
            />
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 2, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute h-1 w-32 rotate-45 bg-white blur-sm"
            />
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 2, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute h-1 w-32 -rotate-45 bg-white blur-sm"
            />
            {Array.from({ length: 22 }).map((_, i) => {
              const angle = (i / 22) * Math.PI * 2;
              const velocity = 100 + r(i) * 220;
              return (
                <motion.div
                  key={`starburst-${i}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * velocity,
                    y: Math.sin(angle) * velocity,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.7 + r(i + 10) * 0.5, ease: "easeOut" }}
                  className="absolute h-1.5 w-1.5 rounded-full bg-fuchsia-200 blur-[1px]"
                />
              );
            })}
          </div>
        )}
      </ParallaxLayer>
    </div>
  );
}
