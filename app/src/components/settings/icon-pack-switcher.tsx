"use client";

import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  getLiquidIconPackAssetSrc,
  LIQUID_ICON_PACKS,
  type LiquidIconPackId,
} from "@/lib/liquid-icons/navigation-assets";
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
        {PREVIEW_ASSETS.map((assetId) => (
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
        ))}
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
        <div className="grid gap-3 sm:grid-cols-2">
          {LIQUID_ICON_PACKS.map((pack) => {
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
      </CardContent>
    </Card>
  );
}
