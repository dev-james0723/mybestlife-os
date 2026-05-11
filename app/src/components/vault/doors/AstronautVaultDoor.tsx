"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useVaultPerfProfile } from "@/components/vault/use-vault-performance";
import type { VaultDoorProps } from "@/components/vault/VaultGate";

const HUD_LINES = ["IDENTITY VERIFIED", "DEPRESSURIZING", "OPENING"] as const;

/**
 * Sci-fi airlock: hexagonal door with 6 triangular panels that iris outward.
 * Cool cyan edge lighting, palm-scan biometric prompt, HUD typing.
 * Total choreography: ~3.0s.
 */
export function AstronautVaultDoor({ onUnlock, reducedMotion }: VaultDoorProps) {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const prompt = copy.gate.prompts[uiTheme];

  const [phase, setPhase] = useState<"idle" | "unlocking">("idle");
  const [hudLine, setHudLine] = useState(0);
  const panelControls = useAnimationControls();
  const scanLineControls = useAnimationControls();
  const stageControls = useAnimationControls();
  const perf = useVaultPerfProfile();
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const startSequence = useCallback(async () => {
    if (phase !== "idle") return;
    if (reducedMotion) {
      onUnlock();
      return;
    }
    setPhase("unlocking");

    await scanLineControls.start({
      y: ["-100%", "120%"],
      opacity: [0, 1, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    });

    for (let i = 0; i < HUD_LINES.length; i++) {
      setHudLine(i);
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 170);
        timeoutsRef.current.push(t);
      });
    }

    if (perf.allowShake) {
      stageControls.start({
        x: [0, -1, 1, -1, 1, 0],
        transition: { duration: 0.18 },
      });
    }

    await panelControls.start((i: number) => ({
      rotate: 60 * i,
      x: Math.cos((60 * i - 90) * (Math.PI / 180)) * 280,
      y: Math.sin((60 * i - 90) * (Math.PI / 180)) * 280,
      opacity: 0,
      transition: { delay: 0.06 * i, duration: 1.1, ease: EASE_OUT_EXPO },
    }));

    onUnlock();
  }, [phase, reducedMotion, onUnlock, panelControls, scanLineControls, stageControls, perf.allowShake]);

  return (
    <motion.div
      animate={stageControls}
      className="relative flex flex-col items-center gap-6"
      data-theme="astronaut"
    >
      <div className="relative h-[min(60vh,480px)] w-[min(60vh,480px)]">
        <div
          aria-hidden
          className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,oklch(0.92_0.12_200/0.55),transparent_70%)]"
        />
        <svg viewBox="0 0 480 480" className="h-full w-full">
          <defs>
            <linearGradient id="panelSkin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dde6ee" />
              <stop offset="100%" stopColor="#6d7b8c" />
            </linearGradient>
            <linearGradient id="panelEdge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.88 0.14 210)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="oklch(0.92 0.16 210)" />
              <stop offset="100%" stopColor="oklch(0.88 0.14 210)" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Outer hex frame */}
          <polygon
            points="240,32 432,144 432,336 240,448 48,336 48,144"
            fill="none"
            stroke="url(#panelEdge)"
            strokeWidth="3"
          />
          <polygon
            points="240,56 408,150 408,330 240,424 72,330 72,150"
            fill="#101821"
            opacity="0.78"
          />

          {/* 6 triangular panels */}
          {Array.from({ length: 6 }).map((_, i) => {
            const a1 = ((i * 60 - 90 - 30) * Math.PI) / 180;
            const a2 = ((i * 60 - 90 + 30) * Math.PI) / 180;
            const r = 170;
            const p1 = `${240 + Math.cos(a1) * r},${240 + Math.sin(a1) * r}`;
            const p2 = `${240 + Math.cos(a2) * r},${240 + Math.sin(a2) * r}`;
            return (
              <motion.polygon
                key={i}
                custom={i}
                animate={panelControls}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                points={`240,240 ${p1} ${p2}`}
                fill="url(#panelSkin)"
                stroke="oklch(0.9 0.12 210)"
                strokeWidth="1"
              />
            );
          })}

          {/* Scan line */}
          <motion.rect
            animate={scanLineControls}
            initial={{ y: "-100%", opacity: 0 }}
            x="60"
            y="80"
            width="360"
            height="2"
            fill="oklch(0.92 0.16 210)"
            opacity="0.9"
          />
        </svg>

        {/* HUD readout */}
        <div className="pointer-events-none absolute left-1/2 top-[18%] -translate-x-1/2 rounded border border-cyan-400/40 bg-black/50 px-4 py-1 font-mono text-[10px] tracking-[0.3em] text-cyan-200 backdrop-blur">
          {phase === "unlocking" ? HUD_LINES[hudLine] : "READY"}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-300/80">
          {prompt.prompt}
        </p>
        <button
          type="button"
          onClick={startSequence}
          disabled={phase !== "idle"}
          className="rounded-full border border-cyan-400/50 bg-black/40 px-6 py-2 text-sm font-semibold tracking-wide text-cyan-100 shadow-[0_0_20px_oklch(0.8_0.16_210/0.35)] backdrop-blur transition hover:bg-black/60 disabled:opacity-60"
        >
          {phase === "idle" ? prompt.cta : copy.gate.unlocking}
        </button>
      </div>
    </motion.div>
  );
}
