import type { UiTheme, ColorMode } from "@/types/database";

export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  radiusCard: string;
  fontDisplay: string;
  fontBody: string;
};

export type ThemeMeta = {
  id: UiTheme;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  /** Public path under `app/public` — used as the settings/onboarding theme preview. */
  thumbnailSrc: string;
};

export const THEME_META: Record<UiTheme, ThemeMeta> = {
  default: {
    id: "default",
    name: "Default",
    nameZh: "預設",
    description: "Clean & minimal",
    descriptionZh: "簡潔俐落",
    thumbnailSrc: "/theme-thumbnails/default.jpg",
  },
  astronaut: {
    id: "astronaut",
    name: "Astronaut",
    nameZh: "太空人",
    description: "Deep space exploration",
    descriptionZh: "深空探索",
    thumbnailSrc: "/theme-thumbnails/astronaut.jpg",
  },
  academia: {
    id: "academia",
    name: "Academia",
    nameZh: "學院派",
    description: "Scholarly warmth",
    descriptionZh: "學術質感",
    thumbnailSrc: "/theme-thumbnails/academia.jpg",
  },
  forest: {
    id: "forest",
    name: "Forest",
    nameZh: "森林",
    description: "Organic growth",
    descriptionZh: "有機生長",
    thumbnailSrc: "/theme-thumbnails/forest.jpg",
  },
};

const defaultLight: ThemeTokens = {
  background: "oklch(0.985 0.002 264)",
  foreground: "oklch(0.145 0 0)",
  card: "oklch(1 0 0)",
  cardForeground: "oklch(0.145 0 0)",
  popover: "oklch(1 0 0)",
  popoverForeground: "oklch(0.145 0 0)",
  primary: "oklch(0.488 0.2 264)",
  primaryForeground: "oklch(0.99 0 0)",
  secondary: "oklch(0.97 0 0)",
  secondaryForeground: "oklch(0.205 0 0)",
  muted: "oklch(0.97 0 0)",
  mutedForeground: "oklch(0.556 0 0)",
  accent: "oklch(0.97 0 0)",
  accentForeground: "oklch(0.205 0 0)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.922 0 0)",
  input: "oklch(0.922 0 0)",
  ring: "oklch(0.708 0 0)",
  sidebar: "oklch(0.985 0 0)",
  sidebarForeground: "oklch(0.145 0 0)",
  sidebarPrimary: "oklch(0.205 0 0)",
  sidebarPrimaryForeground: "oklch(0.985 0 0)",
  sidebarAccent: "oklch(0.97 0 0)",
  sidebarAccentForeground: "oklch(0.205 0 0)",
  sidebarBorder: "oklch(0.922 0 0)",
  sidebarRing: "oklch(0.708 0 0)",
  radiusCard: "0.625rem",
  fontDisplay: "var(--font-geist-sans)",
  fontBody: "var(--font-geist-sans)",
};

const defaultDark: ThemeTokens = {
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  cardForeground: "oklch(0.985 0 0)",
  popover: "oklch(0.205 0 0)",
  popoverForeground: "oklch(0.985 0 0)",
  primary: "oklch(0.62 0.17 264)",
  primaryForeground: "oklch(0.985 0 0)",
  secondary: "oklch(0.269 0 0)",
  secondaryForeground: "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  mutedForeground: "oklch(0.708 0 0)",
  accent: "oklch(0.269 0 0)",
  accentForeground: "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.556 0 0)",
  sidebar: "oklch(0.205 0 0)",
  sidebarForeground: "oklch(0.985 0 0)",
  sidebarPrimary: "oklch(0.488 0.243 264.376)",
  sidebarPrimaryForeground: "oklch(0.985 0 0)",
  sidebarAccent: "oklch(0.269 0 0)",
  sidebarAccentForeground: "oklch(0.985 0 0)",
  sidebarBorder: "oklch(1 0 0 / 10%)",
  sidebarRing: "oklch(0.556 0 0)",
  radiusCard: "0.625rem",
  fontDisplay: "var(--font-geist-sans)",
  fontBody: "var(--font-geist-sans)",
};

const astronautLight: ThemeTokens = {
  background: "oklch(0.97 0.008 260)",
  foreground: "oklch(0.18 0.02 270)",
  card: "oklch(0.99 0.004 260)",
  cardForeground: "oklch(0.18 0.02 270)",
  popover: "oklch(0.99 0.004 260)",
  popoverForeground: "oklch(0.18 0.02 270)",
  primary: "oklch(0.55 0.18 270)",
  primaryForeground: "oklch(0.99 0 0)",
  secondary: "oklch(0.94 0.015 260)",
  secondaryForeground: "oklch(0.25 0.02 270)",
  muted: "oklch(0.94 0.01 260)",
  mutedForeground: "oklch(0.50 0.02 270)",
  accent: "oklch(0.92 0.02 260)",
  accentForeground: "oklch(0.20 0.02 270)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.90 0.015 260)",
  input: "oklch(0.90 0.015 260)",
  ring: "oklch(0.55 0.18 270)",
  sidebar: "oklch(0.96 0.01 260)",
  sidebarForeground: "oklch(0.18 0.02 270)",
  sidebarPrimary: "oklch(0.55 0.18 270)",
  sidebarPrimaryForeground: "oklch(0.99 0 0)",
  sidebarAccent: "oklch(0.92 0.02 260)",
  sidebarAccentForeground: "oklch(0.20 0.02 270)",
  sidebarBorder: "oklch(0.90 0.015 260)",
  sidebarRing: "oklch(0.55 0.18 270)",
  radiusCard: "0.75rem",
  fontDisplay: "var(--font-orbitron)",
  fontBody: "var(--font-space-grotesk)",
};

const astronautDark: ThemeTokens = {
  background: "oklch(0.13 0.025 270)",
  foreground: "oklch(0.92 0.01 260)",
  card: "oklch(0.18 0.03 270)",
  cardForeground: "oklch(0.92 0.01 260)",
  popover: "oklch(0.18 0.03 270)",
  popoverForeground: "oklch(0.92 0.01 260)",
  primary: "oklch(0.70 0.16 270)",
  primaryForeground: "oklch(0.99 0 0)",
  secondary: "oklch(0.24 0.03 270)",
  secondaryForeground: "oklch(0.90 0.01 260)",
  muted: "oklch(0.24 0.025 270)",
  mutedForeground: "oklch(0.65 0.02 260)",
  accent: "oklch(0.26 0.035 270)",
  accentForeground: "oklch(0.92 0.01 260)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(0.30 0.03 270)",
  input: "oklch(0.30 0.035 270)",
  ring: "oklch(0.70 0.16 270)",
  sidebar: "oklch(0.15 0.03 270)",
  sidebarForeground: "oklch(0.90 0.01 260)",
  sidebarPrimary: "oklch(0.70 0.16 270)",
  sidebarPrimaryForeground: "oklch(0.99 0 0)",
  sidebarAccent: "oklch(0.22 0.035 270)",
  sidebarAccentForeground: "oklch(0.90 0.01 260)",
  sidebarBorder: "oklch(0.28 0.03 270)",
  sidebarRing: "oklch(0.70 0.16 270)",
  radiusCard: "0.75rem",
  fontDisplay: "var(--font-orbitron)",
  fontBody: "var(--font-space-grotesk)",
};

const academiaLight: ThemeTokens = {
  background: "oklch(0.97 0.008 60)",
  foreground: "oklch(0.20 0.02 45)",
  card: "oklch(0.99 0.005 55)",
  cardForeground: "oklch(0.20 0.02 45)",
  popover: "oklch(0.99 0.005 55)",
  popoverForeground: "oklch(0.20 0.02 45)",
  primary: "oklch(0.42 0.10 25)",
  primaryForeground: "oklch(0.99 0.005 55)",
  secondary: "oklch(0.94 0.012 55)",
  secondaryForeground: "oklch(0.25 0.02 45)",
  muted: "oklch(0.94 0.01 55)",
  mutedForeground: "oklch(0.50 0.02 45)",
  accent: "oklch(0.92 0.015 55)",
  accentForeground: "oklch(0.22 0.02 45)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.90 0.012 55)",
  input: "oklch(0.90 0.012 55)",
  ring: "oklch(0.42 0.10 25)",
  sidebar: "oklch(0.96 0.01 55)",
  sidebarForeground: "oklch(0.20 0.02 45)",
  sidebarPrimary: "oklch(0.42 0.10 25)",
  sidebarPrimaryForeground: "oklch(0.99 0 0)",
  sidebarAccent: "oklch(0.92 0.015 55)",
  sidebarAccentForeground: "oklch(0.22 0.02 45)",
  sidebarBorder: "oklch(0.90 0.012 55)",
  sidebarRing: "oklch(0.42 0.10 25)",
  radiusCard: "0.5rem",
  fontDisplay: "var(--font-playfair)",
  fontBody: "var(--font-lora)",
};

const academiaDark: ThemeTokens = {
  background: "oklch(0.16 0.015 45)",
  foreground: "oklch(0.92 0.008 55)",
  card: "oklch(0.22 0.018 45)",
  cardForeground: "oklch(0.92 0.008 55)",
  popover: "oklch(0.22 0.018 45)",
  popoverForeground: "oklch(0.92 0.008 55)",
  primary: "oklch(0.65 0.12 25)",
  primaryForeground: "oklch(0.99 0 0)",
  secondary: "oklch(0.26 0.018 45)",
  secondaryForeground: "oklch(0.90 0.008 55)",
  muted: "oklch(0.26 0.015 45)",
  mutedForeground: "oklch(0.65 0.015 55)",
  accent: "oklch(0.28 0.02 45)",
  accentForeground: "oklch(0.92 0.008 55)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(0.32 0.018 45)",
  input: "oklch(0.32 0.02 45)",
  ring: "oklch(0.65 0.12 25)",
  sidebar: "oklch(0.18 0.018 45)",
  sidebarForeground: "oklch(0.90 0.008 55)",
  sidebarPrimary: "oklch(0.65 0.12 25)",
  sidebarPrimaryForeground: "oklch(0.99 0 0)",
  sidebarAccent: "oklch(0.24 0.02 45)",
  sidebarAccentForeground: "oklch(0.90 0.008 55)",
  sidebarBorder: "oklch(0.30 0.018 45)",
  sidebarRing: "oklch(0.65 0.12 25)",
  radiusCard: "0.5rem",
  fontDisplay: "var(--font-playfair)",
  fontBody: "var(--font-lora)",
};

const forestLight: ThemeTokens = {
  background: "oklch(0.97 0.01 145)",
  foreground: "oklch(0.20 0.03 145)",
  card: "oklch(0.99 0.005 90)",
  cardForeground: "oklch(0.20 0.03 145)",
  popover: "oklch(0.99 0.005 90)",
  popoverForeground: "oklch(0.20 0.03 145)",
  primary: "oklch(0.50 0.14 150)",
  primaryForeground: "oklch(0.99 0 0)",
  secondary: "oklch(0.94 0.015 130)",
  secondaryForeground: "oklch(0.22 0.03 145)",
  muted: "oklch(0.94 0.012 130)",
  mutedForeground: "oklch(0.48 0.025 145)",
  accent: "oklch(0.92 0.018 130)",
  accentForeground: "oklch(0.20 0.03 145)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.90 0.015 130)",
  input: "oklch(0.90 0.015 130)",
  ring: "oklch(0.50 0.14 150)",
  sidebar: "oklch(0.96 0.012 140)",
  sidebarForeground: "oklch(0.20 0.03 145)",
  sidebarPrimary: "oklch(0.50 0.14 150)",
  sidebarPrimaryForeground: "oklch(0.99 0 0)",
  sidebarAccent: "oklch(0.92 0.018 130)",
  sidebarAccentForeground: "oklch(0.22 0.03 145)",
  sidebarBorder: "oklch(0.90 0.015 130)",
  sidebarRing: "oklch(0.50 0.14 150)",
  radiusCard: "0.75rem",
  fontDisplay: "var(--font-fraunces)",
  fontBody: "var(--font-dm-sans)",
};

const forestDark: ThemeTokens = {
  background: "oklch(0.14 0.025 150)",
  foreground: "oklch(0.92 0.01 130)",
  card: "oklch(0.19 0.03 150)",
  cardForeground: "oklch(0.92 0.01 130)",
  popover: "oklch(0.19 0.03 150)",
  popoverForeground: "oklch(0.92 0.01 130)",
  primary: "oklch(0.68 0.14 150)",
  primaryForeground: "oklch(0.99 0 0)",
  secondary: "oklch(0.24 0.03 150)",
  secondaryForeground: "oklch(0.90 0.01 130)",
  muted: "oklch(0.24 0.025 150)",
  mutedForeground: "oklch(0.65 0.02 140)",
  accent: "oklch(0.26 0.035 150)",
  accentForeground: "oklch(0.92 0.01 130)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(0.30 0.03 150)",
  input: "oklch(0.30 0.035 150)",
  ring: "oklch(0.68 0.14 150)",
  sidebar: "oklch(0.16 0.028 150)",
  sidebarForeground: "oklch(0.90 0.01 130)",
  sidebarPrimary: "oklch(0.68 0.14 150)",
  sidebarPrimaryForeground: "oklch(0.99 0 0)",
  sidebarAccent: "oklch(0.22 0.035 150)",
  sidebarAccentForeground: "oklch(0.90 0.01 130)",
  sidebarBorder: "oklch(0.28 0.03 150)",
  sidebarRing: "oklch(0.68 0.14 150)",
  radiusCard: "0.75rem",
  fontDisplay: "var(--font-fraunces)",
  fontBody: "var(--font-dm-sans)",
};

export const THEME_TOKENS: Record<UiTheme, Record<ColorMode, ThemeTokens>> = {
  default: { light: defaultLight, dark: defaultDark },
  astronaut: { light: astronautLight, dark: astronautDark },
  academia: { light: academiaLight, dark: academiaDark },
  forest: { light: forestLight, dark: forestDark },
};

export const UI_THEMES: UiTheme[] = ["default", "astronaut", "academia", "forest"];

export function applyThemeTokens(uiTheme: UiTheme, colorMode: ColorMode) {
  const tokens = THEME_TOKENS[uiTheme][colorMode];
  const root = document.documentElement;

  root.style.setProperty("--background", tokens.background);
  root.style.setProperty("--foreground", tokens.foreground);
  root.style.setProperty("--card", tokens.card);
  root.style.setProperty("--card-foreground", tokens.cardForeground);
  root.style.setProperty("--popover", tokens.popover);
  root.style.setProperty("--popover-foreground", tokens.popoverForeground);
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--primary-foreground", tokens.primaryForeground);
  root.style.setProperty("--secondary", tokens.secondary);
  root.style.setProperty("--secondary-foreground", tokens.secondaryForeground);
  root.style.setProperty("--muted", tokens.muted);
  root.style.setProperty("--muted-foreground", tokens.mutedForeground);
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-foreground", tokens.accentForeground);
  root.style.setProperty("--destructive", tokens.destructive);
  root.style.setProperty("--border", tokens.border);
  root.style.setProperty("--input", tokens.input);
  root.style.setProperty("--ring", tokens.ring);
  root.style.setProperty("--sidebar", tokens.sidebar);
  root.style.setProperty("--sidebar-foreground", tokens.sidebarForeground);
  root.style.setProperty("--sidebar-primary", tokens.sidebarPrimary);
  root.style.setProperty("--sidebar-primary-foreground", tokens.sidebarPrimaryForeground);
  root.style.setProperty("--sidebar-accent", tokens.sidebarAccent);
  root.style.setProperty("--sidebar-accent-foreground", tokens.sidebarAccentForeground);
  root.style.setProperty("--sidebar-border", tokens.sidebarBorder);
  root.style.setProperty("--sidebar-ring", tokens.sidebarRing);
  root.style.setProperty("--radius-card", tokens.radiusCard);
  root.style.setProperty("--font-display", tokens.fontDisplay);
  root.style.setProperty("--font-body", tokens.fontBody);

  root.setAttribute("data-ui-theme", uiTheme);
  root.setAttribute("data-color-mode", colorMode);

  if (colorMode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
