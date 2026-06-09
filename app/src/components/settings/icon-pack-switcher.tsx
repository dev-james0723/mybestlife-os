"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import {
  getLiquidIconPackAssetSrc,
  isImageLiquidIconPackId,
  LIQUID_ICON_PACK_GROUPS,
  LIQUID_ICON_PACKS,
  type LiquidIconPackId,
} from "@/lib/liquid-icons/navigation-assets";
import { isAnimatedIconPackId } from "@/lib/liquid-icons/animated-icon-pack-metadata";
import {
  getAnimatedIconPackAssetComponent,
  type AnimatedIconComponent,
  type AnimatedIconHandle,
} from "@/lib/liquid-icons/animated-icon-pack-components";
import { getStyledIconPackAssetComponent } from "@/lib/liquid-icons/styled-icon-pack-components";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";

const PREVIEW_ASSETS = [
  "category-command-center",
  "category-self",
  "category-people",
  "category-career",
  "category-goals-execution",
  "category-resources",
  "category-knowledge",
  "category-learning",
];

function AnimatedPreviewIcon({
  Icon,
  assetId,
  mode,
  packId,
}: {
  Icon: AnimatedIconComponent;
  assetId: string;
  mode: "light" | "dark";
  packId: LiquidIconPackId;
}) {
  const ref = useRef<AnimatedIconHandle>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const previewIcon = ref.current;
    let restartTimer: number | undefined;
    let hasStarted = false;
    const safelyStop = (icon: AnimatedIconHandle | null | undefined) => {
      try {
        const maybePromise = icon?.stopAnimation() as unknown;
        if (
          maybePromise &&
          typeof maybePromise === "object" &&
          "catch" in maybePromise &&
          typeof maybePromise.catch === "function"
        ) {
          void maybePromise.catch(() => {});
        }
      } catch {
        // Some upstream motion controls are briefly unavailable during mount.
      }
    };
    const safelyStart = () => {
      try {
        const maybePromise = ref.current?.startAnimation() as unknown;
        if (
          maybePromise &&
          typeof maybePromise === "object" &&
          "catch" in maybePromise &&
          typeof maybePromise.catch === "function"
        ) {
          void maybePromise.catch(() => {});
        }
        hasStarted = true;
      } catch {
        // Keep Settings resilient if an upstream icon rejects early control.
      }
    };
    const restartAnimation = () => {
      if (hasStarted) safelyStop(ref.current);
      restartTimer = window.setTimeout(() => {
        safelyStart();
      }, hasStarted ? 120 : 320);
    };

    restartAnimation();
    const interval = window.setInterval(restartAnimation, 2200);

    return () => {
      window.clearInterval(interval);
      if (restartTimer) window.clearTimeout(restartTimer);
      safelyStop(previewIcon);
    };
  }, [Icon, prefersReducedMotion]);

  return (
    <Icon
      key={`${packId}-${mode}-${assetId}`}
      ref={prefersReducedMotion ? undefined : ref}
      aria-hidden
      data-animated-preview-icon
      size={20}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-current [&_svg]:h-5 [&_svg]:w-5"
    />
  );
}

function PreviewStrip({
  packId,
  mode,
  label,
}: {
  packId: LiquidIconPackId;
  mode: "light" | "dark";
  label: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[auto_1fr] items-center gap-2 rounded-md border px-2 py-1.5",
        mode === "dark"
          ? "border-white/10 bg-[#131820] text-slate-200"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      <span className="text-[10px] font-medium uppercase leading-none text-current/55">
        {label}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-1.5">
        {PREVIEW_ASSETS.map((assetId) => {
          if (isAnimatedIconPackId(packId)) {
            const AnimatedIcon = getAnimatedIconPackAssetComponent(packId, assetId);

            if (AnimatedIcon) {
              return (
                <AnimatedPreviewIcon
                  key={`${packId}-${mode}-${assetId}`}
                  Icon={AnimatedIcon}
                  assetId={assetId}
                  mode={mode}
                  packId={packId}
                />
              );
            }

            return null;
          }

          if (!isImageLiquidIconPackId(packId)) {
            const StyledIcon = getStyledIconPackAssetComponent(packId, assetId);

            if (StyledIcon) {
              return (
                <StyledIcon
                  key={`${packId}-${mode}-${assetId}`}
                  aria-hidden
                  focusable="false"
                  className="h-5 w-5 shrink-0 text-current"
                />
              );
            }

            return null;
          }

          return (
            <Image
              key={`${packId}-${mode}-${assetId}`}
              src={getLiquidIconPackAssetSrc(packId, mode, assetId)}
              alt=""
              width={20}
              height={20}
              unoptimized
              aria-hidden
              draggable={false}
              className="h-5 w-5 shrink-0 object-contain"
            />
          );
        })}
      </span>
    </div>
  );
}

export function IconPackSwitcher() {
  const { iconPack, setIconPack } = useTheme();
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getThemeUiCopy(language), [language]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle>{ui.navigationIconPackTitle}</CardTitle>
            <CardDescription>{ui.navigationIconPackDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {LIQUID_ICON_PACK_GROUPS.map((group) => {
            const packs = LIQUID_ICON_PACKS.filter((pack) => pack.groupId === group.id);
            return (
              <section key={group.id} className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{group.name}</h3>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {packs.map((pack) => {
                    const selected = iconPack === pack.id;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setIconPack(pack.id)}
                        className={cn(
                          "group relative min-w-0 rounded-lg border p-3 text-left transition-all hover:border-primary/45 hover:bg-muted/35",
                          selected
                            ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/15"
                            : "border-border",
                        )}
                        aria-pressed={selected}
                      >
                        <div className="space-y-3">
                          <div className="min-w-0 pr-6">
                            <p className="truncate text-sm font-semibold">{pack.name}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {pack.description}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <PreviewStrip
                              packId={pack.id}
                              mode="light"
                              label={ui.navigationIconPackDayPreview}
                            />
                            <PreviewStrip
                              packId={pack.id}
                              mode="dark"
                              label={ui.navigationIconPackDarkPreview}
                            />
                          </div>
                        </div>
                        {selected ? (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
