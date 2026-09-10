"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredClientMount } from "@/hooks/use-deferred-client-mount";

const LazyIdeaCaptureSheet = dynamic(
  () =>
    import("@/components/idea-capture/IdeaCaptureSheet").then(
      (mod) => mod.IdeaCaptureSheet,
    ),
  { ssr: false },
);

const LazyOSBuddyShortcutController = dynamic(
  () =>
    import("@/components/os-buddy/OSBuddyShortcutController").then(
      (mod) => mod.OSBuddyShortcutController,
    ),
  { ssr: false },
);

const LazyOSBuddyDock = dynamic(
  () => import("@/components/os-buddy/OSBuddyDock").then((mod) => mod.OSBuddyDock),
  { ssr: false },
);

export function ProtectedLazyFeatures() {
  const ready = useDeferredClientMount({ timeoutMs: 2_500, fallbackDelayMs: 1_500 });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Keep floating capture/pet controls off the globe's gestures and mobile
  // flight controls; they remount normally when leaving the Travel tab.
  const immersiveTravel = pathname?.endsWith("/bucket-list") && searchParams.get("tab") === "travel";

  if (!ready || immersiveTravel) return null;

  return (
    <>
      <LazyIdeaCaptureSheet />
      <LazyOSBuddyShortcutController />
      <LazyOSBuddyDock />
    </>
  );
}
