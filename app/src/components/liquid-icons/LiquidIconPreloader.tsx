"use client";

import { useEffect } from "react";
import {
  getLiquidIconPackAssetSrc,
  isImageLiquidIconPackId,
  liquidIconTargets,
} from "@/lib/liquid-icons/navigation-assets";
import { useTheme } from "@/lib/theme-context";

export function LiquidIconPreloader() {
  const { uiTheme, colorMode, iconPack } = useTheme();

  useEffect(() => {
    if (uiTheme !== "default") return;
    if (!isImageLiquidIconPackId(iconPack)) return;

    const iconSources = liquidIconTargets.map((target) =>
      getLiquidIconPackAssetSrc(iconPack, colorMode, target.assetId),
    );

    const preloadLinks = iconSources.map((src) => {
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

    const preloadedImages = iconSources.map((src) => {
      const image = new Image(96, 96);
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;
      return image;
    });

    return () => {
      preloadLinks.forEach((link) => {
        link.remove();
      });
      preloadedImages.forEach((image) => {
        image.src = "";
      });
    };
  }, [colorMode, iconPack, uiTheme]);

  return null;
}
