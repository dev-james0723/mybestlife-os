"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useVaultSession } from "@/stores/vault-store";
import { VaultGate } from "@/components/vault/VaultGate";
import { VaultInterior } from "@/components/vault/VaultInterior";
import { REDUCED_MOTION_FADE } from "@/lib/animation/easings";

export function VaultPage() {
  const isUnlocked = useVaultSession((s) => s.isUnlocked);
  const unlock = useVaultSession((s) => s.unlock);
  const setSkipAnimation = useVaultSession((s) => s.setSkipAnimation);
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (searchParams?.get("skipIntro") === "1") {
      setSkipAnimation(true);
      unlock();
    }
  }, [searchParams, setSkipAnimation, unlock]);

  useEffect(() => {
    if (prefersReducedMotion && !isUnlocked) {
      unlock();
    }
  }, [prefersReducedMotion, isUnlocked, unlock]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="interior"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? REDUCED_MOTION_FADE : { duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <VaultInterior />
          </motion.div>
        ) : (
          <motion.div
            key="gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={REDUCED_MOTION_FADE}
          >
            <VaultGate />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
