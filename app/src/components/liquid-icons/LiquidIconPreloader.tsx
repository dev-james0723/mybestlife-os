"use client";

import { useEffect } from "react";
import {
  getLiquidIconPackAssetSrc,
  isImageLiquidIconPackId,
  liquidIconTargets,
} from "@/lib/liquid-icons/navigation-assets";
import { useTheme } from "@/lib/theme-context";

type WindowWithOptionalIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export function LiquidIconPreloader() {
  const { uiTheme, colorMode, iconPack } = useTheme();

  useEffect(() => {
    if (uiTheme !== "default") return;
    if (!isImageLiquidIconPackId(iconPack)) return;

    const iconSources = liquidIconTargets.map((target) =>
      getLiquidIconPackAssetSrc(iconPack, colorMode, target.assetId),
    );

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let preloadLinks: HTMLLinkElement[] = [];

    const appendPrefetchLinks = () => {
      if (cancelled) return;
      preloadLinks = iconSources.map((src) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = src;
        link.dataset.liquidIconPreload = "true";
        link.dataset.iconPack = iconPack;
        link.dataset.colorMode = colorMode;
        document.head.appendChild(link);
        return link;
      });
    };

    const idleWindow = window as WindowWithOptionalIdleCallback;
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(appendPrefetchLinks, { timeout: 4_000 });
    } else {
      timeoutId = window.setTimeout(appendPrefetchLinks, 2_500);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      preloadLinks.forEach((link) => {
        link.remove();
      });
    };
  }, [colorMode, iconPack, uiTheme]);

  return null;
}
