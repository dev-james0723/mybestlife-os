"use client";

import dynamic from "next/dynamic";

// IdeaCaptureSheet is a large (~1.4k line) sheet that stays hidden until the
// user triggers capture, so it has no first-paint role. Defer it to a
// client-only chunk to keep it out of the initial bundle.
const IdeaCaptureSheet = dynamic(
  () => import("./IdeaCaptureSheet").then((m) => m.IdeaCaptureSheet),
  { ssr: false },
);

export function IdeaCaptureSheetLazy() {
  return <IdeaCaptureSheet />;
}
