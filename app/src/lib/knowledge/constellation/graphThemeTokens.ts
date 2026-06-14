/**
 * Theme tokens for Knowledge Constellation + Life OS Brain graph surfaces.
 * Layout and interaction stay the same; only these visuals switch with color mode.
 */
import type { ColorMode } from "@/types/database";
import type { ConstellationEdgeType, ConstellationNodeType } from "@/types/constellation";
import { EDGE_STYLE, NODE_COLORS } from "@/lib/knowledge/constellation/constants";

export type GraphSurfaceMode = "dark" | "light";

export function graphSurfaceModeFromColorMode(colorMode: ColorMode): GraphSurfaceMode {
  return colorMode === "light" ? "light" : "dark";
}

/** Canvas / DOM backgrounds and chrome — shared by 2D canvas, 3D shell, page shells. */
export type GraphShellTokens = {
  pageBg: string;
  pageTextClass: string;
  canvasBackdropCss: string;
  sphere3dBackdropCss: string;
  labelPillFill: string;
  matchedRingFallback: string;
  glowGradientEnd: string;
};

/** Semantic Tailwind class bundles for panels, lists, and chrome (no layout). */
export type GraphUiTone = {
  heading: string;
  title: string;
  body: string;
  sub: string;
  muted: string;
  faint: string;
  border: string;
  borderSoft: string;
  borderDashed: string;
  inset: string;
  rowHover: string;
  badge: string;
  ghostBtn: string;
  pillSurface: string;
};

export type GraphThemeRow = {
  shell: GraphShellTokens;
  tone: GraphUiTone;
  /** Float banners (filters hint, local mode). */
  banner: {
    wrap: string;
    text: string;
    subText: string;
    btn: string;
  };
  toolbar: {
    wrap: string;
    input: string;
    dropdown: string;
    dropdownItem: string;
    meta: string;
  };
  legend: {
    wrap: string;
  };
  bottomInspector: {
    wrap: string;
  };
  /**
   * Liquid Glass tokens — translucent panels with backdrop-filter, used
   * by the floating zoom control, page header, and other glass surfaces.
   * Mirrors `.glass-panel` from `liquid_glass_ui.md` (§8.1).
   */
  glass: {
    /** Standard glass surface (translucent, blurred, soft border). */
    panel: string;
    /** Compact pill / chip surface using the same glass treatment. */
    pill: string;
    /** Glass header shell — page title + subtitle. */
    header: string;
    /** Subtle hairline divider used inside glass surfaces. */
    divider: string;
  };
};

const DARK_SHELL: GraphShellTokens = {
  pageBg: "#07080f",
  pageTextClass: "text-slate-100",
  canvasBackdropCss:
    "radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.06) 0%, rgba(8, 11, 22, 0) 60%), radial-gradient(circle at 75% 80%, rgba(167, 139, 250, 0.05) 0%, rgba(8, 11, 22, 0) 55%), #07080f",
  sphere3dBackdropCss: "radial-gradient(circle at 50% 45%, #0a1024 0%, #04050d 70%)",
  labelPillFill: "rgba(7, 8, 15, 0.78)",
  matchedRingFallback: "rgba(255, 255, 255, 0.85)",
  glowGradientEnd: "rgba(0, 0, 0, 0)",
};

const LIGHT_SHELL: GraphShellTokens = {
  pageBg:
    "radial-gradient(ellipse 120% 80% at 50% -10%, rgba(99, 102, 241, 0.06) 0%, transparent 52%), linear-gradient(180deg, #f5f7fc 0%, #eef2f9 42%, #e9eef6 100%)",
  pageTextClass: "text-slate-900",
  canvasBackdropCss:
    "radial-gradient(circle at 48% 38%, rgba(56, 189, 248, 0.09) 0%, rgba(255, 255, 255, 0) 58%), radial-gradient(circle at 72% 72%, rgba(129, 140, 248, 0.07) 0%, rgba(255, 255, 255, 0) 55%), linear-gradient(180deg, #f8fafc 0%, #f1f5fb 55%, #eef2f8 100%)",
  sphere3dBackdropCss:
    "radial-gradient(circle at 50% 42%, #f4f7fd 0%, #e8edf6 52%, #dfe6f2 100%)",
  labelPillFill: "rgba(255, 255, 255, 0.88)",
  matchedRingFallback: "rgba(15, 23, 42, 0.55)",
  glowGradientEnd: "rgba(255, 255, 255, 0)",
};

const DARK_TONE: GraphUiTone = {
  heading: "text-slate-400",
  title: "text-slate-100",
  body: "text-slate-200/95",
  sub: "text-slate-300",
  muted: "text-slate-400",
  faint: "text-slate-500",
  border: "border-white/5",
  borderSoft: "border-white/10",
  borderDashed: "border-dashed border-white/10",
  inset: "border-white/10 bg-white/5",
  rowHover: "hover:bg-white/5",
  badge: "border-white/10 bg-white/5 text-slate-200",
  ghostBtn: "text-slate-300 hover:bg-white/5 hover:text-slate-100",
  pillSurface: "border-white/10 bg-white/5",
};

const LIGHT_TONE: GraphUiTone = {
  heading: "text-slate-500",
  title: "text-slate-900",
  body: "text-slate-800",
  sub: "text-slate-600",
  muted: "text-slate-500",
  faint: "text-slate-400",
  border: "border-slate-200/80",
  borderSoft: "border-slate-200/70",
  borderDashed: "border-dashed border-slate-200/70",
  inset: "border-slate-200/80 bg-white/70",
  rowHover: "hover:bg-slate-900/[0.04]",
  badge: "border-slate-200/90 bg-white/90 text-slate-800",
  ghostBtn: "text-slate-600 hover:bg-slate-900/[0.06] hover:text-slate-900",
  pillSurface: "border-slate-200/80 bg-white/85",
};

export const GRAPH_THEME: Record<GraphSurfaceMode, GraphThemeRow> = {
  dark: {
    shell: DARK_SHELL,
    tone: DARK_TONE,
    banner: {
      wrap: "rounded-full border border-cyan-300/30 bg-slate-950/85 px-3.5 py-1.5 text-xs text-slate-200 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md",
      text: "font-medium text-slate-200",
      subText: "text-slate-400",
      btn: "rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-200 transition-colors hover:bg-white/10",
    },
    toolbar: {
      wrap: "pointer-events-auto flex flex-wrap items-center gap-2 border-b border-white/5 bg-slate-950/40 px-3 py-2 backdrop-blur-md",
      input:
        "h-9 border-white/10 bg-white/5 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400/50",
      dropdown:
        "absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-2xl backdrop-blur-md",
      dropdownItem: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5",
      meta: "text-slate-400",
    },
    legend: {
      wrap:
        "pointer-events-auto absolute right-3 bottom-3 z-30 w-72 rounded-2xl border border-white/10 bg-slate-950/85 p-4 text-sm text-slate-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md",
    },
    bottomInspector: {
      wrap:
        "flex w-full max-h-[min(40dvh,420px)] shrink-0 flex-col overflow-hidden border-t border-white/10 bg-slate-950/95 transition-opacity duration-150 ease-out motion-reduce:transition-none sm:max-h-[min(36dvh,400px)] landscape:max-h-[min(32dvh,360px)] lg:hidden",
    },
    glass: {
      panel:
        "rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.05]",
      pill:
        "rounded-full border border-white/10 bg-white/[0.06] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.05]",
      header:
        "rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.035]",
      divider: "border-white/10",
    },
  },
  light: {
    shell: LIGHT_SHELL,
    tone: LIGHT_TONE,
    banner: {
      wrap: "rounded-full border border-sky-300/50 bg-white/80 px-3.5 py-1.5 text-xs text-slate-800 shadow-[0_10px_28px_-14px_rgba(15,23,42,0.12)] backdrop-blur-md",
      text: "font-medium text-slate-800",
      subText: "text-slate-500",
      btn: "rounded-full border border-slate-300/80 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50",
    },
    toolbar: {
      wrap: "pointer-events-auto flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-md",
      input:
        "h-9 border-slate-200/90 bg-white/90 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500/35",
      dropdown:
        "absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 py-1 shadow-xl backdrop-blur-md",
      dropdownItem:
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100/80",
      meta: "text-slate-500",
    },
    legend: {
      wrap:
        "pointer-events-auto absolute right-3 bottom-3 z-30 w-72 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-800 shadow-[0_20px_50px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md",
    },
    bottomInspector: {
      wrap:
        "flex w-full max-h-[min(40dvh,420px)] shrink-0 flex-col overflow-hidden border-t border-slate-200/80 bg-white/92 transition-opacity duration-150 ease-out motion-reduce:transition-none sm:max-h-[min(36dvh,400px)] landscape:max-h-[min(32dvh,360px)] lg:hidden shadow-[0_-12px_32px_-16px_rgba(15,23,42,0.08)]",
    },
    glass: {
      panel:
        "rounded-2xl border border-slate-200/70 bg-white/70 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/65",
      pill:
        "rounded-full border border-slate-200/80 bg-white/75 shadow-[0_8px_22px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70",
      header:
        "rounded-2xl border border-slate-200/70 bg-white/65 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/55",
      divider: "border-slate-200/80",
    },
  },
};

/** Filters / detail panel outer shell by variant. */
export function graphFiltersShellClass(mode: GraphSurfaceMode, variant: "panel" | "drawer"): string {
  if (mode === "light") {
    return variant === "panel"
      ? "h-full w-72 border-r border-slate-200/70 bg-white/55 backdrop-blur-xl"
      : "h-full w-full bg-white";
  }
  return variant === "panel"
    ? "h-full w-72 border-r border-white/5 bg-slate-950/40 backdrop-blur"
    : "h-full w-full bg-slate-950";
}

export function graphDetailShellClass(
  mode: GraphSurfaceMode,
  variant: "panel" | "drawer" | "bottomBar",
): string {
  if (mode === "light") {
    if (variant === "panel")
      return "h-full w-80 border-l border-white/45 bg-white/58 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28),inset_1px_0_0_rgba(255,255,255,0.7),inset_-1px_0_0_rgba(255,255,255,0.24)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/48";
    if (variant === "drawer") return "h-full w-full bg-white";
    return "flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-white/92";
  }
  if (variant === "panel")
    return "h-full w-80 border-l border-white/12 bg-white/[0.065] shadow-[0_24px_90px_-34px_rgba(0,0,0,0.82),inset_1px_0_0_rgba(255,255,255,0.16),inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/[0.055]";
  if (variant === "drawer") return "h-full w-full bg-slate-950";
  return "flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950/95";
}

export function graphLocalOrbitShellClass(mode: GraphSurfaceMode): string {
  if (mode === "light") {
    return "flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-slate-200/70 bg-white/55 text-sm text-slate-800 backdrop-blur-xl";
  }
  return "flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-white/5 bg-slate-950/40 text-sm text-slate-200 backdrop-blur";
}

export function adjustRgbaAlpha(rgba: string, factor: number): string {
  const m = rgba.match(
    /rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/,
  );
  if (!m) return rgba;
  const a = Math.min(1, Number(m[4]) * factor);
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a.toFixed(3)})`;
}

const LIGHT_LABEL = "rgba(30, 41, 59, 0.94)";

/**
 * Node paint colors for the canvas / 3D — dark uses canonical NODE_COLORS;
 * light mode deepens label text, softens glow, keeps cores readable on pale ground.
 */
export function resolveNodeVisuals(
  type: ConstellationNodeType,
  mode: GraphSurfaceMode,
): { core: string; glow: string; ring: string; label: string } {
  const base = NODE_COLORS[type];
  if (mode === "dark") return { ...base };
  return {
    core: base.core,
    glow: adjustRgbaAlpha(base.glow, 0.42),
    ring: base.ring,
    label: LIGHT_LABEL,
  };
}

/**
 * Edge base opacity from EDGE_STYLE, boosted slightly in light mode so strokes stay legible.
 */
export function resolveEdgeBaseOpacity(
  edgeType: ConstellationEdgeType,
  mode: GraphSurfaceMode,
): number {
  const style = EDGE_STYLE[edgeType] ?? EDGE_STYLE.explicit_link;
  const o = style.opacity;
  if (mode === "dark") return o;
  const boosted = o < 0.32 ? o * 1.45 : o * 1.2;
  return Math.min(1, boosted);
}

export function resolveEdgeColorRgba(
  edgeType: ConstellationEdgeType,
  opacity: number,
  mode: GraphSurfaceMode,
): string {
  const style = EDGE_STYLE[edgeType] ?? EDGE_STYLE.explicit_link;
  const o =
    mode === "light" ? Math.min(1, opacity * (style.opacity < 0.35 ? 1.25 : 1.08)) : opacity;
  return style.color.replace(
    /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
    (_m, r, g, b) => `rgba(${r}, ${g}, ${b}, ${o.toFixed(3)})`,
  );
}

export type Sphere3dLabelTextureOpts = {
  color: string;
  background: string;
  border: string;
};

export function sphere3dLabelTextureOpts(mode: GraphSurfaceMode): Sphere3dLabelTextureOpts {
  if (mode === "dark") {
    return {
      color: "rgba(241, 245, 249, 0.96)",
      background: "rgba(7, 8, 15, 0.78)",
      border: "rgba(255, 255, 255, 0.10)",
    };
  }
  return {
    color: "rgba(15, 23, 42, 0.94)",
    background: "rgba(255, 255, 255, 0.9)",
    border: "rgba(148, 163, 184, 0.45)",
  };
}

/**
 * Brain Page 3D Sphere — edge palette tokens.
 *
 *   - `baseColor` / `baseOpacity` paint the resting edge silhouette.
 *     Tuned to be elegant but readable; per spec A "subtle but
 *     visible". Default opacity sits noticeably above the 0.35
 *     baseline so relationship structure is perceivable at rest.
 *   - `dimOpacity` is what the base layer fades to when something
 *     is highlighted (selection or hover) — keeps spatial context
 *     without competing with the illuminated accent layer.
 *   - `accentColor` / `accentOpacity` paint the connections of the
 *     focused / hovered node. Cool cyan reads as "illuminated" in
 *     both modes; light mode trades a little saturation for
 *     contrast against the pale backdrop.
 */
export type Sphere3dEdgePalette = {
  baseColor: number;
  baseOpacity: number;
  dimOpacity: number;
  accentColor: number;
  accentOpacity: number;
};

export function sphere3dEdgePalette(mode: GraphSurfaceMode): Sphere3dEdgePalette {
  if (mode === "dark") {
    return {
      baseColor: 0x94a3b8,
      baseOpacity: 0.62,
      dimOpacity: 0.22,
      accentColor: 0xa5f3fc,
      accentOpacity: 1,
    };
  }
  return {
    baseColor: 0x475569,
    baseOpacity: 0.52,
    dimOpacity: 0.2,
    accentColor: 0x0ea5e9,
    accentOpacity: 0.98,
  };
}
