"use client";

import { useCallback, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { EASE_WOODEN } from "@/lib/animation/easings";
import type { VaultDoorProps } from "@/components/vault/VaultGate";

/**
 * Antique oak cabinet: brass keyhole, double wooden doors swing outward with
 * a subtle overshoot, warm amber interior glow.
 * Total choreography: ~3.4s.
 */
export function AcademiaVaultDoor({ onUnlock, reducedMotion }: VaultDoorProps) {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const prompt = copy.gate.prompts[uiTheme];

  const [phase, setPhase] = useState<"idle" | "unlocking">("idle");
  const keyControls = useAnimationControls();
  const leftDoorControls = useAnimationControls();
  const rightDoorControls = useAnimationControls();
  const seamControls = useAnimationControls();

  const startSequence = useCallback(async () => {
    if (phase !== "idle") return;
    if (reducedMotion) {
      onUnlock();
      return;
    }
    setPhase("unlocking");

    await keyControls.start({
      x: 0,
      y: [0, -6, 0],
      rotate: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    });
    await keyControls.start({
      rotate: 90,
      transition: { duration: 0.4, ease: "easeInOut" },
    });

    await seamControls.start({
      opacity: 1,
      transition: { duration: 0.25 },
    });

    await Promise.all([
      leftDoorControls.start({
        rotateY: -40,
        transition: { duration: 1.4, ease: EASE_WOODEN },
      }),
      rightDoorControls.start({
        rotateY: 40,
        transition: { duration: 1.4, ease: EASE_WOODEN },
      }),
    ]);

    onUnlock();
  }, [phase, reducedMotion, keyControls, leftDoorControls, rightDoorControls, seamControls, onUnlock]);

  return (
    <div className="relative flex flex-col items-center gap-6" style={{ perspective: 1600 }}>
      <p
        className="text-[11px] uppercase tracking-[0.5em] text-amber-800/80 dark:text-amber-200/70"
        style={{ fontFamily: "var(--font-fraunces, var(--font-playfair, serif))" }}
      >
        INSTRUMENTARIUM
      </p>

      <div className="relative h-[min(62vh,520px)] w-[min(48vh,400px)]">
        {/* Amber interior reveal */}
        <div
          aria-hidden
          className="absolute inset-[8%] rounded-sm bg-[radial-gradient(closest-side,oklch(0.85_0.16_70/0.9),oklch(0.55_0.1_50/0.4),transparent)]"
        />

        {/* Warm seam */}
        <motion.div
          animate={seamControls}
          initial={{ opacity: 0 }}
          aria-hidden
          className="absolute left-1/2 top-[5%] h-[90%] w-[3px] -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,oklch(0.88_0.18_70),transparent)] blur-[2px]"
        />

        <svg viewBox="0 0 400 520" className="h-full w-full">
          <defs>
            <linearGradient id="oak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b4423" />
              <stop offset="50%" stopColor="#8a5a2f" />
              <stop offset="100%" stopColor="#5a361d" />
            </linearGradient>
            <pattern id="grain" width="8" height="80" patternUnits="userSpaceOnUse">
              <rect width="8" height="80" fill="url(#oak)" />
              <path d="M0,8 Q4,20 0,40 Q4,60 0,80" stroke="#3c2213" strokeWidth="0.4" fill="none" opacity="0.3" />
            </pattern>
          </defs>

          {/* Frame */}
          <rect x="6" y="6" width="388" height="508" rx="6" fill="#3c2213" />
          <rect x="18" y="18" width="364" height="484" rx="4" fill="#2a180d" />

          {/* Left door */}
          <motion.g
            animate={leftDoorControls}
            initial={{ rotateY: 0 }}
            style={{ transformOrigin: "18px 260px", transformStyle: "preserve-3d" }}
          >
            <rect x="22" y="24" width="174" height="472" rx="3" fill="url(#grain)" stroke="#2a180d" strokeWidth="1" />
            <rect x="36" y="44" width="146" height="200" rx="2" fill="none" stroke="#3c2213" strokeWidth="2" />
            <rect x="36" y="266" width="146" height="210" rx="2" fill="none" stroke="#3c2213" strokeWidth="2" />
          </motion.g>

          {/* Right door */}
          <motion.g
            animate={rightDoorControls}
            initial={{ rotateY: 0 }}
            style={{ transformOrigin: "382px 260px", transformStyle: "preserve-3d" }}
          >
            <rect x="204" y="24" width="174" height="472" rx="3" fill="url(#grain)" stroke="#2a180d" strokeWidth="1" />
            <rect x="218" y="44" width="146" height="200" rx="2" fill="none" stroke="#3c2213" strokeWidth="2" />
            <rect x="218" y="266" width="146" height="210" rx="2" fill="none" stroke="#3c2213" strokeWidth="2" />
          </motion.g>

          {/* Central keyhole + brass key */}
          <g>
            <circle cx="200" cy="260" r="22" fill="#2a180d" />
            <circle cx="200" cy="260" r="14" fill="#10080a" />
            <rect x="196" y="268" width="8" height="24" fill="#10080a" />
          </g>

          <motion.g
            animate={keyControls}
            initial={{ x: 40, y: 0, rotate: 0 }}
            style={{ transformOrigin: "200px 260px" }}
          >
            <rect x="196" y="256" width="40" height="8" fill="#d9a94a" stroke="#7a5510" strokeWidth="1" />
            <circle cx="232" cy="260" r="10" fill="none" stroke="#d9a94a" strokeWidth="3" />
            <rect x="204" y="264" width="4" height="6" fill="#7a5510" />
          </motion.g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p
          className="text-xs uppercase tracking-[0.4em] text-amber-800/80 dark:text-amber-200/80"
          style={{ fontFamily: "var(--font-fraunces, var(--font-playfair, serif))" }}
        >
          {prompt.prompt}
        </p>
        <button
          type="button"
          onClick={startSequence}
          disabled={phase !== "idle"}
          className="rounded-md border border-amber-700/40 bg-amber-50/80 px-6 py-2 text-sm font-semibold tracking-wide text-amber-900 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.4)] transition hover:bg-amber-50 disabled:opacity-60 dark:bg-amber-950/50 dark:text-amber-100"
          style={{ fontFamily: "var(--font-fraunces, var(--font-playfair, serif))" }}
        >
          {phase === "idle" ? prompt.cta : copy.gate.unlocking}
        </button>
      </div>
    </div>
  );
}
