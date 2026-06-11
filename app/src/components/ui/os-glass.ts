// The bare `os-glass-surface` / `os-glass-control` marker classes carry no
// styling of their own — globals.css re-skins them with the Liquid Glass v2
// material under html[data-ui-theme="default"] only.
export const osGlassPanelClassName =
  "os-glass-surface relative overflow-hidden rounded-2xl border border-slate-300/60 bg-white/78 text-slate-950 shadow-[0_18px_56px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/12 dark:bg-slate-950/82 dark:text-white dark:shadow-[0_18px_56px_rgba(2,8,23,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]";

export const osFrostedPanelClassName =
  "os-glass-surface relative overflow-hidden rounded-2xl border border-slate-300/55 bg-white/70 text-slate-950 shadow-[0_12px_38px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-lg backdrop-saturate-150 dark:border-white/10 dark:bg-slate-950/72 dark:text-white dark:shadow-[0_12px_38px_rgba(2,8,23,0.24),inset_0_1px_0_rgba(255,255,255,0.07)]";

export const osSolidPanelClassName =
  "rounded-2xl border border-slate-200/80 bg-white/92 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-slate-950/92 dark:text-white dark:shadow-[0_10px_30px_rgba(2,8,23,0.24)]";

export const osGlassControlClassName =
  "os-glass-control border border-slate-300/55 bg-white/72 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl backdrop-saturate-150 transition-[background,border-color,color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-slate-400/70 hover:bg-white/90 hover:text-slate-950 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none dark:border-white/12 dark:bg-white/[0.055] dark:text-white/78 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:border-white/22 dark:hover:bg-white/[0.085] dark:hover:text-white";

export const osPrimaryControlClassName =
  "bg-lime-300 text-slate-950 shadow-[0_10px_30px_rgba(190,242,100,0.16),inset_0_1px_0_rgba(255,255,255,0.42)] transition-[background,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-lime-200 active:translate-y-px focus-visible:ring-lime-300/55 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none";

export const osControlSizeClassName =
  "h-11 min-h-11 min-w-11 rounded-xl px-3 text-sm font-semibold";

export const osIconControlSizeClassName =
  "h-11 min-h-11 w-11 rounded-xl p-0";

export const osSegmentedShellClassName =
  "relative flex min-w-0 items-center gap-1 rounded-[1.35rem] p-1";

export const osMapSurfaceClassName =
  "os-glass-surface relative overflow-hidden rounded-[1.4rem] border border-slate-300/55 bg-white/76 shadow-[0_18px_60px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/12 dark:bg-slate-950/76 dark:shadow-[0_18px_60px_rgba(2,8,23,0.42),inset_0_1px_0_rgba(255,255,255,0.08)]";

export const osSheetSurfaceClassName =
  "border-slate-200/80 bg-white/96 text-slate-950 shadow-[0_24px_90px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-950/96 dark:text-white dark:shadow-[0_24px_90px_rgba(2,8,23,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]";

export const osDialogSurfaceClassName =
  "border border-slate-200/80 bg-white/94 text-slate-950 shadow-[0_24px_90px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/12 dark:bg-slate-950/94 dark:text-white dark:shadow-[0_24px_90px_rgba(2,8,23,0.48),inset_0_1px_0_rgba(255,255,255,0.08)]";

export const osSheenClassName =
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/24 before:to-transparent";
