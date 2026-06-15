"use client";

import dynamic from "next/dynamic";
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

  if (!ready) return null;

  return (
    <>
      <LazyIdeaCaptureSheet />
      <LazyOSBuddyShortcutController />
      <LazyOSBuddyDock />
    </>
  );
}
