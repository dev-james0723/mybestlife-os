"use client";

import { useEffect, useState } from "react";

/**
 * Centralized quality tier for vault animations. On narrow viewports we halve
 * particle counts and drop shake/dolly motion to hit 60fps on lower-end phones.
 */
export type VaultPerfProfile = {
  mobile: boolean;
  particleCount: number;
  allowShake: boolean;
  allowDolly: boolean;
};

const MOBILE_BREAKPOINT = 640;

export function useVaultPerfProfile(baseParticleCount = 14): VaultPerfProfile {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return {
    mobile,
    particleCount: mobile ? Math.max(4, Math.floor(baseParticleCount / 2)) : baseParticleCount,
    allowShake: !mobile,
    allowDolly: !mobile,
  };
}
