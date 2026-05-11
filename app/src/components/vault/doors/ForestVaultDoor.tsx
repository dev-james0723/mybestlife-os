"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { EASE_OUT_BACK, EASE_IN_OUT_QUAD } from "@/lib/animation/easings";
import { useVaultPerfProfile } from "@/components/vault/use-vault-performance";
import type { VaultDoorProps } from "@/components/vault/VaultGate";

type Firefly = { id: number; x: number; y: number; delay: number; duration: number };

/**
 * Hollow ancient tree: heart-shaped seam, glowing leaf sigil, vines retract,
 * trunk splits open with organic overshoot, pollen + fireflies on reveal.
 * Total choreography: ~3.6s.
 */
export function ForestVaultDoor({ onUnlock, reducedMotion }: VaultDoorProps) {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const prompt = copy.gate.prompts[uiTheme];

  const [phase, setPhase] = useState<"idle" | "unlocking" | "open">("idle");
  const sigilControls = useAnimationControls();
  const vineControls = useAnimationControls();
  const leftTrunkControls = useAnimationControls();
  const rightTrunkControls = useAnimationControls();
  const seamControls = useAnimationControls();
  const perf = useVaultPerfProfile(14);

  const fireflies = useMemo<Firefly[]>(
    () =>
      Array.from({ length: perf.particleCount }).map((_, i) => ({
        id: i,
        x: (i / perf.particleCount) * 100,
        y: 40 + (i % 3) * 20,
        delay: i * 0.06,
        duration: 2 + (i % 4) * 0.4,
      })),
    [perf.particleCount],
  );

  const startSequence = useCallback(async () => {
    if (phase !== "idle") return;
    if (reducedMotion) {
      onUnlock();
      return;
    }
    setPhase("unlocking");

    await sigilControls.start({
      opacity: [1, 0.3, 1, 0],
      scale: [1, 1.2, 0.8],
      transition: { duration: 0.7, ease: "easeInOut" },
    });

    await vineControls.start({
      pathLength: 0,
      opacity: 0.2,
      transition: { duration: 0.7, ease: EASE_IN_OUT_QUAD },
    });

    await seamControls.start({
      opacity: 1,
      transition: { duration: 0.4 },
    });

    await Promise.all([
      leftTrunkControls.start({
        rotate: -28,
        x: -10,
        transition: { duration: 1, ease: EASE_OUT_BACK },
      }),
      rightTrunkControls.start({
        rotate: 28,
        x: 10,
        transition: { duration: 1, ease: EASE_OUT_BACK },
      }),
    ]);

    setPhase("open");
    onUnlock();
  }, [phase, reducedMotion, sigilControls, vineControls, leftTrunkControls, rightTrunkControls, seamControls, onUnlock]);

  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Fireflies emerge when sigil scatters */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {fireflies.map((f) => (
          <motion.div
            key={f.id}
            className="absolute h-2 w-2 rounded-full bg-[oklch(0.92_0.18_95)] shadow-[0_0_8px_oklch(0.92_0.18_95/0.9)]"
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={
              phase !== "idle"
                ? {
                    opacity: [0, 1, 0.8, 0],
                    x: [0, Math.cos(f.id) * 80, Math.cos(f.id) * 140],
                    y: [0, -40 - f.y, -120 - f.y],
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: f.duration,
              delay: f.delay,
              ease: "easeOut",
            }}
            style={{ left: `${f.x}%`, top: "45%" }}
          />
        ))}
      </div>

      <div className="relative h-[min(66vh,520px)] w-[min(50vh,420px)]">
        {/* Golden interior glow */}
        <div
          aria-hidden
          className="absolute inset-[20%] rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.88_0.18_80/0.9),oklch(0.6_0.12_60/0.4),transparent)]"
        />

        <svg viewBox="0 0 420 520" className="h-full w-full">
          <defs>
            <linearGradient id="bark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6e4a2a" />
              <stop offset="50%" stopColor="#4d3318" />
              <stop offset="100%" stopColor="#2d1e10" />
            </linearGradient>
            <radialGradient id="moss" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="oklch(0.6 0.14 140 / 0.8)" />
              <stop offset="100%" stopColor="oklch(0.4 0.1 140 / 0)" />
            </radialGradient>
          </defs>

          {/* Warm seam */}
          <motion.path
            animate={seamControls}
            initial={{ opacity: 0 }}
            d="M210,40 Q190,240 210,480"
            stroke="oklch(0.9 0.2 80)"
            strokeWidth="3"
            fill="none"
            opacity="0.9"
          />

          {/* Trunk left half */}
          <motion.g
            animate={leftTrunkControls}
            initial={{ rotate: 0, x: 0 }}
            style={{ transformOrigin: "40px 260px" }}
          >
            <path
              d="M210,20 Q80,60 60,260 Q80,470 210,490 L210,40 Z"
              fill="url(#bark)"
              stroke="#1f1508"
              strokeWidth="1.5"
            />
            <path d="M210,20 Q120,60 90,220 L110,210 Q150,80 210,60 Z" fill="url(#moss)" opacity="0.7" />
          </motion.g>

          {/* Trunk right half */}
          <motion.g
            animate={rightTrunkControls}
            initial={{ rotate: 0, x: 0 }}
            style={{ transformOrigin: "380px 260px" }}
          >
            <path
              d="M210,20 Q340,60 360,260 Q340,470 210,490 L210,40 Z"
              fill="url(#bark)"
              stroke="#1f1508"
              strokeWidth="1.5"
            />
            <path d="M210,20 Q300,60 330,220 L310,210 Q270,80 210,60 Z" fill="url(#moss)" opacity="0.7" />
          </motion.g>

          {/* Vines across the seam */}
          <motion.g animate={vineControls} initial={{ pathLength: 1, opacity: 1 }}>
            <path
              d="M210,80 Q170,110 200,140 Q240,170 200,200 Q170,230 210,260"
              stroke="oklch(0.55 0.15 140)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M210,280 Q250,310 200,340 Q170,370 210,400 Q240,430 210,470"
              stroke="oklch(0.55 0.15 140)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </motion.g>

          {/* Glowing leaf sigil */}
          <motion.g
            animate={sigilControls}
            initial={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: "210px 260px" }}
          >
            <path
              d="M210,230 Q230,245 225,270 Q210,285 195,270 Q190,245 210,230 Z"
              fill="oklch(0.9 0.18 130 / 0.95)"
              stroke="oklch(0.95 0.12 130)"
              strokeWidth="1"
            />
            <circle cx="210" cy="260" r="28" fill="oklch(0.9 0.2 120 / 0.3)" />
          </motion.g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p
          className="text-xs uppercase tracking-[0.3em] text-emerald-800 dark:text-emerald-200"
          style={{ fontFamily: "var(--font-fraunces, var(--font-playfair, serif))" }}
        >
          {prompt.prompt}
        </p>
        <button
          type="button"
          onClick={startSequence}
          disabled={phase !== "idle"}
          className="rounded-full border border-emerald-700/40 bg-emerald-50/70 px-6 py-2 text-sm font-semibold tracking-wide text-emerald-900 shadow-[0_0_24px_oklch(0.8_0.14_120/0.35)] transition hover:bg-emerald-50 disabled:opacity-60 dark:bg-emerald-950/50 dark:text-emerald-100"
        >
          {phase === "idle" ? prompt.cta : copy.gate.unlocking}
        </button>
      </div>
    </div>
  );
}
