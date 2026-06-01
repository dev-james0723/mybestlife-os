import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedScrollLayout } from "@/components/protected-scroll-layout";
import { SyncThemeFromProfile } from "@/components/sync-theme-from-profile";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { IdeaCaptureSheet } from "@/components/idea-capture/IdeaCaptureSheet";
import { OSBuddyDock } from "@/components/os-buddy/OSBuddyDock";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SyncThemeFromProfile />
      <OnboardingGate />
      <AppSidebar />
      <SidebarInset>
        <ProtectedScrollLayout>{children}</ProtectedScrollLayout>
      </SidebarInset>
      <IdeaCaptureSheet />
      <OSBuddyDock />
    </SidebarProvider>
  );
}
