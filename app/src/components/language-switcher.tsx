"use client";

import { useRouter, usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LOCALE_FLAG_EMOJI,
  LOCALE_SELECT_LABELS,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  LOCALE_URL_SLUGS,
  appLocaleToUrlSlug,
  urlSlugToAppLocale,
} from "@/lib/i18n/locale-slug";
import { replacePathnameLocaleSlug } from "@/lib/i18n/locale-path";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { useAppStore } from "@/stores/app-store";
import { settingsRepository } from "@/lib/repositories/settings";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = useLocaleSlug();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const ui = getCommonUiCopy(urlSlugToAppLocale(slug));

  const switchTo = (locale: AppLocale) => {
    const nextSlug = appLocaleToUrlSlug(locale);
    setLanguage(locale);
    router.push(replacePathnameLocaleSlug(pathname, nextSlug));
    void settingsRepository.updateProfile({ language: locale }).catch(() => {
      /* offline or guest — URL locale still applies */
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            aria-label={ui.languageSwitcherAria}
          >
            <Languages className="h-4 w-4" />
            <span className="hidden text-xs font-medium sm:inline">
              {LOCALE_SELECT_LABELS[urlSlugToAppLocale(slug)]}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {LOCALE_URL_SLUGS.map((s) => {
          const loc = urlSlugToAppLocale(s);
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => switchTo(loc)}
              className={s === slug ? "bg-accent" : undefined}
            >
              <span className="mr-2" aria-hidden>
                {LOCALE_FLAG_EMOJI[loc]}
              </span>
              {LOCALE_SELECT_LABELS[loc]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
