import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedScrollLayout } from "@/components/protected-scroll-layout";
import { SyncThemeFromProfile } from "@/components/sync-theme-from-profile";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { IdeaCaptureSheetLazy } from "@/components/idea-capture/IdeaCaptureSheetLazy";
import { OSBuddyDockLazy } from "@/components/os-buddy/OSBuddyDockLazy";
import { OSBuddyShortcutController } from "@/components/os-buddy/OSBuddyShortcutController";
import { FocusRealityBoundary } from "@/components/daily-planner/focus/focus-reality-boundary";
import { LiquidGlassRoot } from "@/components/liquid-glass/liquid-glass-root";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <FocusRealityBoundary>
        <LiquidGlassRoot />
        <SyncThemeFromProfile />
        <OnboardingGate />
        <AppSidebar />
        <SidebarInset>
          <ProtectedScrollLayout>{children}</ProtectedScrollLayout>
        </SidebarInset>
        <IdeaCaptureSheetLazy />
        <OSBuddyShortcutController />
        <OSBuddyDockLazy />
      </FocusRealityBoundary>
    </SidebarProvider>
  );
}
