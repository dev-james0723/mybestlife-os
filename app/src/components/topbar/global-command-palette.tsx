"use client";

/**
 * Global Command Palette
 * ----------------------------------------------------------------
 * App-shell level palette bound to ⌘K / Ctrl+K. Renders on top of the
 * existing page-specific palettes (AI Knowledge, Projects) — they keep
 * their own ⌘K listeners for in-page search; this one operates at the
 * shell level for navigation + app commands.
 *
 * Initial command set:
 *   - Navigate to any page from `navigationCategories`
 *   - Go to Garden
 *   - Toggle color mode (light/dark)
 *   - Cycle language (delegates to existing language-switcher when
 *     practical — keeps this palette a thin shell)
 *
 * Feature modules can call `useCommandPaletteStore.getState().registerCommands`
 * to push their own commands (reserved extension point).
 */

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Moon,
  Sun,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { navigationCategories } from "@/lib/constants/navigation";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getThemedCategoryLabel, getThemedItemLabel } from "@/lib/theme-labels";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";

type FlatNavItem = {
  key: string;
  label: string;
  url: string;
  category: string;
  icon: LucideIcon;
};

export function GlobalCommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const extraCommands = useCommandPaletteStore((s) => s.extraCommands);

  const router = useRouter();
  const localeSlug = useLocaleSlug();
  const language = useAppStore((s) => s.language);
  const { uiTheme, colorMode, toggleColorMode } = useTheme();
  const ui = useMemo(() => getCommonUiCopy(language), [language]);

  // Bind ⌘K / Ctrl+K globally. Any page-specific palette that also binds
  // ⌘K will still win inside its subtree because it uses capture phase;
  // here we listen without capture, so we only fire when nothing else
  // intercepted it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        // If an editable element is focused inside a page-specific palette
        // that already opened, cmdk's Dialog handles its own key; here we
        // just toggle our own.
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navItems: FlatNavItem[] = useMemo(() => {
    const items: FlatNavItem[] = [];
    for (const cat of navigationCategories) {
      const catLabel = getThemedCategoryLabel(cat.categoryId, uiTheme, language);
      for (const item of cat.items ?? []) {
        const itemLabel = getThemedItemLabel(item.itemId, uiTheme, language);
        items.push({
          key: `item-${cat.categoryId}-${item.itemId}`,
          label: itemLabel,
          url: item.url,
          category: catLabel,
          icon: item.icon,
        });
      }
    }
    items.push({
      key: "garden",
      label: getThemedItemLabel("garden", uiTheme, language),
      url: "/garden",
      category: "Garden",
      icon: Sprout,
    });
    return items;
  }, [language, uiTheme]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(withLocalePrefix(localeSlug, path));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="topbar-palette bg-transparent shadow-none ring-0 outline-none overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <Command
          label="Command palette"
          className="flex max-h-[70vh] w-full flex-col"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Command.Input
              autoFocus
              placeholder={ui.searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-current/60"
            />
            <span className="topbar-kbd">ESC</span>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm opacity-70">
              No results.
            </Command.Empty>

            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:opacity-60"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.key}
                    value={`${item.label} ${item.category}`}
                    onSelect={() => handleNavigate(item.url)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-white/10"
                  >
                    <Icon className="h-4 w-4 opacity-80" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-xs opacity-50">{item.category}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group
              heading="Appearance"
              className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:opacity-60"
            >
              <Command.Item
                value={`toggle color mode ${colorMode}`}
                onSelect={() => {
                  toggleColorMode();
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-white/10"
              >
                {colorMode === "light" ? (
                  <Moon className="h-4 w-4 opacity-80" />
                ) : (
                  <Sun className="h-4 w-4 opacity-80" />
                )}
                <span className="flex-1">
                  {colorMode === "light" ? ui.switchToDarkMode : ui.switchToLightMode}
                </span>
              </Command.Item>
            </Command.Group>

            {extraCommands.length > 0 ? (
              <Command.Group
                heading="Actions"
                className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:opacity-60"
              >
                {extraCommands.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${(cmd.keywords ?? []).join(" ")}`}
                    onSelect={() => {
                      cmd.onSelect();
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-white/10"
                  >
                    {cmd.icon ?? null}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.group ? (
                      <span className="text-xs opacity-50">{cmd.group}</span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
