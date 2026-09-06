import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedScrollLayout } from "@/components/protected-scroll-layout";
import { SyncThemeFromProfile } from "@/components/sync-theme-from-profile";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { ProtectedLazyFeatures } from "@/components/protected-lazy-features";
import { FocusRealityBoundary } from "@/components/daily-planner/focus/focus-reality-boundary";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider data-app-design="projects">
      <FocusRealityBoundary>
        <SyncThemeFromProfile />
        <OnboardingGate />
        <AppSidebar />
        <SidebarInset>
          <ProtectedScrollLayout>{children}</ProtectedScrollLayout>
        </SidebarInset>
        <ProtectedLazyFeatures />
      </FocusRealityBoundary>
    </SidebarProvider>
  );
}
