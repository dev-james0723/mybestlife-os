/**
 * GDELT 2.0 DOC API provider — STUB / v2 extension point.
 *
 * GDELT is free, keyless, geo-tagged and global — an excellent World/Local
 * corroboration source. The adapter interface is wired here so it can be
 * dropped into the provider registry without touching the rest of the system,
 * but it is intentionally NOT enabled in the MVP pass to keep the live surface
 * small and reliable.
 *
 * TODO(v2): implement `fetch` against
 *   https://api.gdeltproject.org/api/v2/doc/doc?query=...&format=json
 * mapping `articles[]` → RawSignalItem (title, url, domain→sourceName,
 * seendate→publishedAt). Respect the §15 corroboration/geo-filter design.
 */

import type { RawSignalItem, SignalProvider } from "./types";

export const gdeltProvider: SignalProvider = {
  id: "gdelt",
  label: "GDELT (global)",
  sections: ["world", "local"],
  live: false,
  async fetch(): Promise<RawSignalItem[]> {
    // Not enabled in MVP — returns nothing so it never produces unverified data.
    return [];
  },
};
