"use client";

import dynamic from "next/dynamic";

// OSBuddyDock is a large (~3.4k line) always-mounted floating assistant that
// is not needed for first paint. Defer it to a client-only chunk so it stays
// out of every protected route's initial bundle.
const OSBuddyDock = dynamic(
  () => import("./OSBuddyDock").then((m) => m.OSBuddyDock),
  { ssr: false },
);

export function OSBuddyDockLazy() {
  return <OSBuddyDock />;
}
