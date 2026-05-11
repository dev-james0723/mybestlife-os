"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyThemeTokens } from "@/lib/theme-config";
import type { UiTheme, ColorMode, FontSizePref, WidgetDensity } from "@/types/database";

const LS_KEY = "mylifeos-theme";

type PersistedTheme = {
  uiTheme: UiTheme;
  colorMode: ColorMode;
  fontSize: FontSizePref;
  widgetDensity: WidgetDensity;
  focusMode: boolean;
};

/** Same value for SSR and the client’s first paint — avoids hydration mismatches with localStorage. */
const PERSISTED_THEME_DEFAULT: PersistedTheme = {
  uiTheme: "default",
  colorMode: "light",
  fontSize: "medium",
  widgetDensity: "comfortable",
  focusMode: false,
};

function readLocalStorage(): PersistedTheme {
  if (typeof window === "undefined") return PERSISTED_THEME_DEFAULT;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as PersistedTheme;
  } catch {
    /* ignore */
  }
  return PERSISTED_THEME_DEFAULT;
}

function writeLocalStorage(state: PersistedTheme) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

type ThemeContextValue = {
  uiTheme: UiTheme;
  colorMode: ColorMode;
  fontSize: FontSizePref;
  widgetDensity: WidgetDensity;
  focusMode: boolean;
  setUiTheme: (t: UiTheme) => void;
  setColorMode: (m: ColorMode) => void;
  toggleColorMode: () => void;
  setFontSize: (s: FontSizePref) => void;
  setWidgetDensity: (d: WidgetDensity) => void;
  setFocusMode: (f: boolean) => void;
  hydrateFromProfile: (p: {
    ui_theme: UiTheme;
    color_mode: ColorMode;
    font_size_pref: FontSizePref;
    widget_density: WidgetDensity;
    focus_mode: boolean;
  }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function applyDomClasses(fontSize: FontSizePref, widgetDensity: WidgetDensity, focusMode: boolean) {
  const root = document.documentElement;
  root.classList.remove("font-size-small", "font-size-medium", "font-size-large");
  root.classList.add(`font-size-${fontSize}`);
  root.classList.remove("density-compact", "density-comfortable", "density-spacious");
  root.classList.add(`density-${widgetDensity}`);
  root.classList.toggle("focus-mode", focusMode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Never read localStorage in useState initializer: server uses default, client would read LS → mismatch.
  const [state, setState] = useState<PersistedTheme>(PERSISTED_THEME_DEFAULT);

  const applyAll = useCallback((s: PersistedTheme) => {
    applyThemeTokens(s.uiTheme, s.colorMode);
    applyDomClasses(s.fontSize, s.widgetDensity, s.focusMode);
    writeLocalStorage(s);
  }, []);

  useLayoutEffect(() => {
    setState(readLocalStorage());
  }, []);

  useEffect(() => {
    applyAll(state);
  }, [state, applyAll]);

  const setUiTheme = useCallback((t: UiTheme) => {
    setState((prev) => ({ ...prev, uiTheme: t }));
  }, []);

  const setColorMode = useCallback((m: ColorMode) => {
    setState((prev) => ({ ...prev, colorMode: m }));
  }, []);

  const toggleColorMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      colorMode: prev.colorMode === "light" ? "dark" : "light",
    }));
  }, []);

  const setFontSize = useCallback((s: FontSizePref) => {
    setState((prev) => ({ ...prev, fontSize: s }));
  }, []);

  const setWidgetDensity = useCallback((d: WidgetDensity) => {
    setState((prev) => ({ ...prev, widgetDensity: d }));
  }, []);

  const setFocusMode = useCallback((f: boolean) => {
    setState((prev) => ({ ...prev, focusMode: f }));
  }, []);

  const hydrateFromProfile = useCallback(
    (p: {
      ui_theme: UiTheme;
      color_mode: ColorMode;
      font_size_pref: FontSizePref;
      widget_density: WidgetDensity;
      focus_mode: boolean;
    }) => {
      setState({
        uiTheme: p.ui_theme,
        colorMode: p.color_mode,
        fontSize: p.font_size_pref,
        widgetDensity: p.widget_density,
        focusMode: p.focus_mode,
      });
    },
    []
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      uiTheme: state.uiTheme,
      colorMode: state.colorMode,
      fontSize: state.fontSize,
      widgetDensity: state.widgetDensity,
      focusMode: state.focusMode,
      setUiTheme,
      setColorMode,
      toggleColorMode,
      setFontSize,
      setWidgetDensity,
      setFocusMode,
      hydrateFromProfile,
    }),
    [state, setUiTheme, setColorMode, toggleColorMode, setFontSize, setWidgetDensity, setFocusMode, hydrateFromProfile]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
