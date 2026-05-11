"use client";

import { Button } from "@/components/ui/button";
import { ThemeCard } from "@/components/settings/theme-card";
import { UI_THEMES } from "@/lib/theme-config";
import type { UiTheme } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";

type Step2Props = {
  selected: UiTheme;
  onSelect: (t: UiTheme) => void;
  onNext: () => void;
  onBack: () => void;
  locale: AppLocale;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export function Step2Theme({ selected, onSelect, onNext, onBack, locale, ui }: Step2Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{ui.onboardingThemeTitle}</h2>
        <p className="text-sm text-neutral-400">
          {ui.onboardingThemeSubtitle}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {UI_THEMES.map((id) => (
          <ThemeCard
            key={id}
            themeId={id}
            selected={selected === id}
            onSelect={onSelect}
            locale={locale}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-neutral-400">
          {ui.back}
        </Button>
        <Button onClick={onNext}>{ui.continue}</Button>
      </div>
    </div>
  );
}
