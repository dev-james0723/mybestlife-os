"use client";

/**
 * Utility glass pill
 * ----------------------------------------------------------------
 * Groups the shell-level controls into one horizontal pill:
 *
 *     Mobile:  [ ☀ ]
 *     Desktop: [ ≡ ] | [ 🔔 ][ ☀ ]
 *
 *   ≡  → SidebarTrigger (desktop) / (mobile: sidebar via FAB only)
 *   🔔 → disabled Bell placeholder (notification system TBD)
 *   ☀  → toggleColorMode
 *
 * Main navigation lives in the sidebar / command palette (⌘K).
 * Language is changed via Settings or URL locale.
 */

import { Bell, Menu, Moon, Sun } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/lib/theme-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import { cn } from "@/lib/utils";

type PillBtnProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
};

function PillButton({
  label,
  onClick,
  disabled,
  active,
  children,
  className,
}: PillBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      data-active={active ? "true" : undefined}
      className={cn("topbar-pill-btn", className)}
    >
      {children}
    </button>
  );
}

export function UtilityPill({ className }: { className?: string }) {
  const language = useAppStore((s) => s.language);
  const ui = getCommonUiCopy(language);
  const { colorMode, toggleColorMode } = useTheme();
  const { toggleSidebar, openMobile } = useSidebar();
  const isMobile = useIsMobile();

  // Mobile keeps only high-signal utilities. Sidebar toggle on mobile is
  // served by the dedicated FAB in ProtectedScrollLayout, and the Bell
  // placeholder takes up room without earning it.
  if (isMobile) {
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        role="group"
        aria-label="App utilities"
      >
        <button
          type="button"
          data-slot="mobile-menu-trigger"
          className="topbar-clock-trigger topbar-mobile-icon-trigger"
          aria-label={ui.openMenu}
          aria-controls="mobile-sidebar-drawer"
          aria-expanded={openMobile}
          aria-haspopup="dialog"
          onClick={() => toggleSidebar()}
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="topbar-clock-trigger topbar-mobile-icon-trigger"
          aria-label={
            colorMode === "light" ? ui.switchToDarkMode : ui.switchToLightMode
          }
          onClick={toggleColorMode}
        >
          {colorMode === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn("topbar-pill", className)}
      role="group"
      aria-label="App utilities"
    >
      <PillButton label={ui.openMenu} onClick={() => toggleSidebar()}>
        <Menu className="h-4 w-4" />
      </PillButton>

      <span className="topbar-pill-divider" aria-hidden />

      {/* Bell — disabled placeholder until a notification system exists. */}
      <PillButton label="Notifications (coming soon)" disabled>
        <Bell className="h-4 w-4" />
      </PillButton>

      <PillButton
        label={
          colorMode === "light" ? ui.switchToDarkMode : ui.switchToLightMode
        }
        onClick={toggleColorMode}
      >
        {colorMode === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </PillButton>
    </div>
  );
}
