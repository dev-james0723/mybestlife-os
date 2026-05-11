"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { THEME_META } from "@/lib/theme-config";
import type { UiTheme } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getThemePresetRow } from "@/lib/i18n/theme-preset-i18n";

type ThemeCardProps = {
  themeId: UiTheme;
  selected: boolean;
  onSelect: (id: UiTheme) => void;
  locale?: AppLocale;
};

export function ThemeCard({ themeId, selected, onSelect, locale = "en" }: ThemeCardProps) {
  const meta = THEME_META[themeId];
  const preset = getThemePresetRow(locale)[themeId];

  return (
    <button
      type="button"
      onClick={() => onSelect(themeId)}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:shadow-md",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="relative h-20 w-full overflow-hidden rounded-lg border border-border bg-muted shadow-inner">
        <Image
          src={meta.thumbnailSrc}
          alt={preset.name}
          width={640}
          height={400}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 45vw, 160px"
        />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{preset.name}</p>
        <p className="text-xs text-muted-foreground">{preset.description}</p>
      </div>
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
          ✓
        </div>
      )}
    </button>
  );
}
