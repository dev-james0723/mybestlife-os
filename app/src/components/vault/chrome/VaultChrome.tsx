"use client";

import { useTheme } from "@/lib/theme-context";

/**
 * Theme-aware ambient background for the vault interior. Rendered fixed
 * behind VaultInterior so the gallery cards feel like they live inside the
 * vault of the active theme. Uses CSS-only effects to keep the bundle lean.
 */
export function VaultChrome() {
  const { uiTheme } = useTheme();

  return (
    <div
      aria-hidden="true"
      data-ui-theme={uiTheme}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {uiTheme === "default" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.03_260/0.8),transparent_70%)]" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent,transparent_3px,oklch(1_0_0/0.015)_3px,oklch(1_0_0/0.015)_4px)]" />
          <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.75_0.22_320/0.25),transparent)] blur-3xl" />
        </>
      )}
      {uiTheme === "astronaut" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,oklch(0.2_0.04_220/0.85),transparent_75%)]" />
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(2px_2px_at_20%_30%,white,transparent),radial-gradient(1px_1px_at_65%_55%,white,transparent),radial-gradient(1.5px_1.5px_at_80%_20%,white,transparent),radial-gradient(1px_1px_at_40%_75%,white,transparent),radial-gradient(2px_2px_at_12%_80%,white,transparent)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        </>
      )}
      {uiTheme === "academia" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.05_60/0.8),transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.25_0.04_40/0.4),transparent_40%,transparent_60%,oklch(0.2_0.03_30/0.5))]" />
          <div className="absolute inset-0 opacity-25 [background:repeating-linear-gradient(90deg,transparent,transparent_60px,oklch(0.55_0.1_40/0.2)_60px,oklch(0.55_0.1_40/0.2)_62px)]" />
        </>
      )}
      {uiTheme === "forest" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.32_0.08_140/0.8),transparent_75%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.6_0.2_90/0.15),transparent_60%)]" />
          <div className="absolute inset-0 opacity-30 [background:radial-gradient(closest-side_at_15%_25%,oklch(0.55_0.15_140/0.4),transparent_40%),radial-gradient(closest-side_at_85%_75%,oklch(0.6_0.15_140/0.3),transparent_40%)]" />
        </>
      )}
    </div>
  );
}
