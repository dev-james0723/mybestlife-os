"use client";

import { useMemo } from "react";
import { useTheme } from "@/lib/theme-context";
import {
  GRAPH_THEME,
  graphSurfaceModeFromColorMode,
  type GraphSurfaceMode,
  type GraphThemeRow,
} from "@/lib/knowledge/constellation/graphThemeTokens";

export function useGraphSurface(): {
  mode: GraphSurfaceMode;
  isLight: boolean;
  t: GraphThemeRow;
} {
  const { colorMode } = useTheme();
  return useMemo(() => {
    const mode = graphSurfaceModeFromColorMode(colorMode);
    return { mode, isLight: mode === "light", t: GRAPH_THEME[mode] };
  }, [colorMode]);
}
