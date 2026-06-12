"use client";

import { useMemo } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/lib/theme-context";
import { getWallpaperUiCopy } from "@/lib/i18n/wallpaper-ui";
import { cn } from "@/lib/utils";
import {
  LG_SCENES,
  useLiquidGlassStore,
  type LiquidGlassScene,
} from "./liquid-glass-store";

/**
 * Liquid Glass wallpaper picker — the animated-background selector.
 *
 * Three entry points share the same swatches + store:
 *  - WallpaperQuickButton: topbar pill (popover list, mobile + desktop)
 *  - WallpaperSwitcher: full card on Settings → appearance
 * Only rendered under the default (Liquid Glass) theme.
 */

/** Static gradient previews approximating each animated scene. */
const SCENE_PREVIEW: Record<LiquidGlassScene, string> = {
  stardust:
    "radial-gradient(circle 7% at 26% 36%, oklch(0.90 0.10 85) 0%, transparent 100%)," +
    "radial-gradient(circle 5% at 58% 22%, oklch(0.85 0.07 250) 0%, transparent 100%)," +
    "radial-gradient(circle 4% at 76% 58%, oklch(0.88 0.09 20) 0%, transparent 100%)," +
    "radial-gradient(circle 3% at 42% 70%, oklch(0.92 0.08 85) 0%, transparent 100%)," +
    "radial-gradient(circle 2.5% at 66% 82%, oklch(0.88 0.06 250) 0%, transparent 100%)," +
    "radial-gradient(ellipse 80% 70% at 20% 85%, oklch(0.28 0.05 50 / 0.55) 0%, transparent 70%)," +
    "linear-gradient(180deg, oklch(0.17 0.03 270) 0%, oklch(0.22 0.05 300) 100%)",
  aurora:
    "radial-gradient(ellipse 90% 40% at 30% 32%, oklch(0.75 0.17 165 / 0.85) 0%, transparent 70%)," +
    "radial-gradient(ellipse 90% 36% at 68% 58%, oklch(0.62 0.19 300 / 0.8) 0%, transparent 70%)," +
    "linear-gradient(180deg, oklch(0.20 0.05 265) 0%, oklch(0.28 0.10 300) 100%)",
  ocean:
    "radial-gradient(ellipse 80% 55% at 30% 12%, oklch(0.85 0.12 200 / 0.9) 0%, transparent 65%)," +
    "radial-gradient(ellipse 60% 45% at 78% 50%, oklch(0.72 0.14 195 / 0.7) 0%, transparent 65%)," +
    "linear-gradient(180deg, oklch(0.55 0.11 210) 0%, oklch(0.25 0.09 250) 100%)",
  nebula:
    "radial-gradient(ellipse 70% 60% at 26% 32%, oklch(0.50 0.22 340 / 0.9) 0%, transparent 70%)," +
    "radial-gradient(ellipse 70% 55% at 76% 62%, oklch(0.50 0.18 250 / 0.85) 0%, transparent 70%)," +
    "linear-gradient(180deg, oklch(0.13 0.03 290) 0%, oklch(0.18 0.07 310) 100%)",
  bokeh:
    "radial-gradient(circle 18% at 24% 30%, oklch(0.78 0.18 25) 0%, transparent 100%)," +
    "radial-gradient(circle 13% at 64% 20%, oklch(0.84 0.16 85) 0%, transparent 100%)," +
    "radial-gradient(circle 15% at 80% 66%, oklch(0.78 0.14 190) 0%, transparent 100%)," +
    "radial-gradient(circle 11% at 40% 72%, oklch(0.74 0.17 330) 0%, transparent 100%)," +
    "linear-gradient(160deg, oklch(0.34 0.10 20) 0%, oklch(0.36 0.11 50) 45%, oklch(0.24 0.07 200) 100%)",
  butterflies:
    "radial-gradient(circle 14% at 30% 32%, oklch(0.80 0.16 350) 0%, transparent 100%)," +
    "radial-gradient(circle 11% at 70% 24%, oklch(0.82 0.15 60) 0%, transparent 100%)," +
    "radial-gradient(circle 13% at 62% 70%, oklch(0.78 0.13 170) 0%, transparent 100%)," +
    "linear-gradient(170deg, oklch(0.32 0.09 350) 0%, oklch(0.26 0.08 160) 100%)",
};

function useWallpaperCopy() {
  const language = useAppStore((s) => s.language);
  return useMemo(() => getWallpaperUiCopy(language), [language]);
}

/** Compact vertical list used inside the topbar popover. */
function WallpaperSceneList() {
  const ui = useWallpaperCopy();
  const scene = useLiquidGlassStore((s) => s.scene);
  const setScene = useLiquidGlassStore((s) => s.setScene);

  return (
    <div className="flex flex-col gap-1" role="listbox" aria-label={ui.pickerAria}>
      {LG_SCENES.map((id) => {
        const selected = id === scene;
        return (
          <button
            key={id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => setScene(id)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
              selected ? "bg-muted font-medium" : "hover:bg-muted/60"
            )}
          >
            <span
              aria-hidden
              className="h-8 w-12 shrink-0 rounded-md ring-1 ring-foreground/15"
              style={{ background: SCENE_PREVIEW[id] }}
            />
            <span className="flex-1 truncate">{ui.sceneNames[id]}</span>
            {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Topbar quick switcher — glass pill with a popover scene list. */
export function WallpaperQuickButton({ className }: { className?: string }) {
  const ui = useWallpaperCopy();
  const { uiTheme } = useTheme();
  if (uiTheme !== "default") return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={ui.pickerAria}
            className={cn(
              "topbar-clock-trigger topbar-mobile-icon-trigger flex-shrink-0",
              className
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
          </button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-60 p-2">
        <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
          {ui.title}
        </p>
        <WallpaperSceneList />
      </PopoverContent>
    </Popover>
  );
}

/** Settings → appearance card with large previews. */
export function WallpaperSwitcher() {
  const ui = useWallpaperCopy();
  const { uiTheme } = useTheme();
  const scene = useLiquidGlassStore((s) => s.scene);
  const setScene = useLiquidGlassStore((s) => s.setScene);

  if (uiTheme !== "default") return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle>{ui.title}</CardTitle>
            <CardDescription>{ui.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          role="listbox"
          aria-label={ui.pickerAria}
        >
          {LG_SCENES.map((id) => {
            const selected = id === scene;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setScene(id)}
                className={cn(
                  "group flex flex-col gap-2 rounded-xl p-1.5 text-left outline-none transition-shadow",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-foreground/10 hover:ring-foreground/25"
                )}
              >
                <span
                  aria-hidden
                  className="relative block aspect-[16/10] w-full overflow-hidden rounded-lg"
                  style={{ background: SCENE_PREVIEW[id] }}
                >
                  {selected ? (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "truncate px-0.5 pb-0.5 text-xs",
                    selected ? "font-semibold" : "text-muted-foreground"
                  )}
                >
                  {ui.sceneNames[id]}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
