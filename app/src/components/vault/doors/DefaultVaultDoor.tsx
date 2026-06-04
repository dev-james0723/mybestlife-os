"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { EASE_HEAVY_GRACEFUL, EASE_IN_OUT_CUBIC } from "@/lib/animation/easings";
import type { VaultDoorProps } from "@/components/vault/VaultGate";

const BOLT_POSITIONS = [0, 72, 144, 216, 288] as const;

/**
 * Classic bank vault: brushed steel door with a combination dial, five bolts
 * that retract sequentially, and a warm gradient spill when the door swings.
 * Total choreography: ~3.2s.
 */
export function DefaultVaultDoor({ onUnlock, reducedMotion }: VaultDoorProps) {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const prompt = copy.gate.prompts[uiTheme];

  const [phase, setPhase] = useState<"idle" | "unlocking" | "opening">("idle");
  const dialControls = useAnimationControls();
  const boltsControls = useAnimationControls();
  const doorControls = useAnimationControls();
  const stageControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  const startSequence = useCallback(async () => {
    if (phase !== "idle") return;

    if (reducedMotion) {
      setPhase("opening");
      onUnlock();
      return;
    }

    setPhase("unlocking");

    await dialControls.start({
      rotate: 720,
      transition: { duration: 0.6, ease: EASE_IN_OUT_CUBIC },
    });
    await dialControls.start({
      rotate: 360,
      transition: { duration: 0.6, ease: EASE_IN_OUT_CUBIC },
    });
    await dialControls.start({
      rotate: 540,
      transition: { duration: 0.5, ease: EASE_IN_OUT_CUBIC },
    });

    await boltsControls.start((i: number) => ({
      x: 18,
      opacity: 0.9,
      transition: { delay: i * 0.04, duration: 0.18, ease: "easeOut" },
    }));

    await glowControls.start({
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    });

    setPhase("opening");

    stageControls.start({
      scale: 1.04,
      transition: { duration: 0.8, ease: EASE_HEAVY_GRACEFUL },
    });

    await doorControls.start({
      rotateY: -95,
      transition: { duration: 0.8, ease: EASE_HEAVY_GRACEFUL },
    });

    onUnlock();
  }, [
    phase,
    reducedMotion,
    dialControls,
    boltsControls,
    doorControls,
    stageControls,
    glowControls,
    onUnlock,
  ]);

  const lockedLabelId = "vault-default-label";

  return (
    <motion.div
      animate={stageControls}
      className="relative flex flex-col items-center gap-4"
      style={{ perspective: 1400 }}
    >
      {/* Warm light bleeding out of the door's edge once bolts retract. */}
      <motion.div
        aria-hidden
        animate={glowControls}
        initial={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.8 0.18 330 / 0.55), transparent 70%)",
        }}
      />

      <div className="relative h-[min(60vh,480px)] w-[min(60vh,480px)]">
        {/* Rear room glow revealed when door opens */}
        <div
          aria-hidden
          className="absolute inset-[14%] rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.18_330/0.85),oklch(0.62_0.22_300/0.5),transparent)]"
        />

        {/* Door */}
        <motion.button
          type="button"
          onClick={startSequence}
          disabled={phase !== "idle"}
          aria-labelledby={lockedLabelId}
          animate={doorControls}
          initial={{ rotateY: 0 }}
          style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
          className="group absolute inset-0 cursor-pointer focus-visible:outline-none"
        >
          <svg
            viewBox="0 0 480 480"
            className="h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
            role="presentation"
          >
            <defs>
              <radialGradient id="steel" cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#d8dde4" />
                <stop offset="55%" stopColor="#8a94a0" />
                <stop offset="100%" stopColor="#2c333d" />
              </radialGradient>
              <radialGradient id="dialFace" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#e9edf2" />
                <stop offset="60%" stopColor="#9aa3af" />
                <stop offset="100%" stopColor="#3a424d" />
              </radialGradient>
              <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5d07a" />
                <stop offset="100%" stopColor="#a07614" />
              </linearGradient>
              <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            <circle cx="240" cy="240" r="228" fill="url(#steel)" stroke="#1b2028" strokeWidth="6" />
            <circle
              cx="240"
              cy="240"
              r="210"
              fill="none"
              stroke="#0e1116"
              strokeWidth="2"
              opacity="0.6"
            />
            <circle
              cx="240"
              cy="240"
              r="176"
              fill="none"
              stroke="#b7c0cb"
              strokeWidth="1"
              opacity="0.4"
            />

            {/* Bolt heads */}
            {BOLT_POSITIONS.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const r = 198;
              const cx = 240 + Math.cos(rad) * r;
              const cy = 240 + Math.sin(rad) * r;
              return (
                <motion.g
                  key={angle}
                  custom={i}
                  animate={boltsControls}
                  initial={{ x: 0, opacity: 1 }}
                  style={{ originX: `${cx}px`, originY: `${cy}px` }}
                >
                  <circle cx={cx} cy={cy} r="14" fill="url(#brass)" stroke="#3d2a05" strokeWidth="1.5" />
                  <circle cx={cx - 3} cy={cy - 3} r="5" fill="#fff5d8" opacity="0.5" />
                </motion.g>
              );
            })}

            {/* Central dial */}
            <g>
              <circle cx="240" cy="240" r="120" fill="#1a1f27" />
              <motion.g
                animate={dialControls}
                initial={{ rotate: 0 }}
                style={{ originX: "240px", originY: "240px" }}
              >
                <circle cx="240" cy="240" r="108" fill="url(#dialFace)" stroke="#0d1015" strokeWidth="3" />
                {Array.from({ length: 40 }).map((_, i) => {
                  const a = (i * 9 * Math.PI) / 180;
                  const x1 = 240 + Math.cos(a) * 100;
                  const y1 = 240 + Math.sin(a) * 100;
                  const x2 = 240 + Math.cos(a) * (i % 5 === 0 ? 86 : 92);
                  const y2 = 240 + Math.sin(a) * (i % 5 === 0 ? 86 : 92);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#202631"
                      strokeWidth={i % 5 === 0 ? 2.5 : 1.2}
                    />
                  );
                })}
                <circle cx="240" cy="240" r="12" fill="#20262e" stroke="#0b0d11" strokeWidth="2" />
                <polygon points="240,150 234,242 246,242" fill="#d8dde4" filter="url(#innerShadow)" />
              </motion.g>
              {/* cold blue LED ring */}
              <circle
                cx="240"
                cy="240"
                r="124"
                fill="none"
                stroke="oklch(0.85 0.12 230)"
                strokeWidth="1"
                opacity="0.7"
              />
            </g>

            {/* Hinge pins */}
            <circle cx="24" cy="140" r="12" fill="#242a33" stroke="#0b0d11" strokeWidth="2" />
            <circle cx="24" cy="340" r="12" fill="#242a33" stroke="#0b0d11" strokeWidth="2" />
          </svg>
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p
          id={lockedLabelId}
          className="font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground"
        >
          {prompt.prompt}
        </p>
        <button
          type="button"
          onClick={startSequence}
          disabled={phase !== "idle"}
          className="min-h-11 rounded-full border border-foreground/15 bg-background/70 px-6 py-2 text-sm font-semibold tracking-wide text-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)] backdrop-blur transition hover:bg-background disabled:opacity-60"
        >
          {phase === "idle" ? prompt.cta : copy.gate.unlocking}
        </button>
      </div>
    </motion.div>
  );
}
