"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useVaultSession } from "@/stores/vault-store";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import type { UiTheme } from "@/types/database";

const DefaultVaultDoor = dynamic(
  () => import("@/components/vault/doors/DefaultVaultDoor").then((m) => m.DefaultVaultDoor),
  { ssr: false },
);
const AstronautVaultDoor = dynamic(
  () => import("@/components/vault/doors/AstronautVaultDoor").then((m) => m.AstronautVaultDoor),
  { ssr: false },
);
const AcademiaVaultDoor = dynamic(
  () => import("@/components/vault/doors/AcademiaVaultDoor").then((m) => m.AcademiaVaultDoor),
  { ssr: false },
);
const ForestVaultDoor = dynamic(
  () => import("@/components/vault/doors/ForestVaultDoor").then((m) => m.ForestVaultDoor),
  { ssr: false },
);

export type VaultDoorProps = {
  onUnlock: () => void;
  reducedMotion: boolean;
  soundMuted: boolean;
};

function renderDoorForTheme(theme: UiTheme, props: VaultDoorProps) {
  switch (theme) {
    case "astronaut":
      return <AstronautVaultDoor {...props} />;
    case "academia":
      return <AcademiaVaultDoor {...props} />;
    case "forest":
      return <ForestVaultDoor {...props} />;
    case "default":
    default:
      return <DefaultVaultDoor {...props} />;
  }
}

export function VaultGate() {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const unlock = useVaultSession((s) => s.unlock);
  const setUnlocking = useVaultSession((s) => s.setUnlocking);
  const soundMuted = useVaultSession((s) => s.soundMuted);
  const setSoundMuted = useVaultSession((s) => s.setSoundMuted);

  const handleUnlock = useCallback(() => {
    setUnlocking(false);
    unlock();
  }, [setUnlocking, unlock]);

  const handleSkip = useCallback(() => {
    unlock();
  }, [unlock]);

  return (
    <section
      aria-label={copy.gate.prompts[uiTheme].prompt}
      className="relative flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center overflow-hidden"
      data-ui-theme={uiTheme}
    >
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center px-4">
        {renderDoorForTheme(uiTheme, {
          onUnlock: handleUnlock,
          reducedMotion: prefersReducedMotion,
          soundMuted,
        })}
        <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-md px-3 py-1 transition hover:bg-foreground/5 hover:text-foreground"
          >
            {copy.gate.skipLink}
          </button>
          <span aria-hidden="true" className="text-border">·</span>
          <button
            type="button"
            onClick={() => setSoundMuted(!soundMuted)}
            className="rounded-md px-3 py-1 transition hover:bg-foreground/5 hover:text-foreground"
          >
            {soundMuted ? copy.gate.unmute : copy.gate.mute}
          </button>
        </div>
      </div>
    </section>
  );
}
