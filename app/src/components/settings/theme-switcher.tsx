"use client";

import { useMemo } from "react";
import { useTheme } from "@/lib/theme-context";
import { UI_THEMES } from "@/lib/theme-config";
import { ThemeCard } from "@/components/settings/theme-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";

export function ThemeSwitcher() {
  const { uiTheme, setUiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getThemeUiCopy(language), [language]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
          <div>
            <CardTitle>{ui.visualThemeTitle}</CardTitle>
            <CardDescription>{ui.visualThemeDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {UI_THEMES.map((id) => (
            <ThemeCard
              key={id}
              themeId={id}
              selected={uiTheme === id}
              onSelect={setUiTheme}
              locale={language}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
