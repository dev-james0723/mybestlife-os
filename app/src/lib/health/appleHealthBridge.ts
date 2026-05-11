/**
 * Apple Health bridge.
 *
 * This is the contract between the web app and the native HealthKit layer.
 * Today it is a typed stub that always reports `platform_unsupported` on
 * web. A follow-up PR will install `@capacitor/core`, `@capacitor/ios`, and
 * `@perfood/capacitor-healthkit`, then replace this module with a real
 * Capacitor-backed implementation. The existing interface is designed so
 * that swap is drop-in: no callers need to change.
 *
 * Until then, users on iOS/macOS get the same data via Strategies B (Apple
 * Shortcuts POSTing to /api/health/ingest) and C (manual entry + CSV
 * import). See AppleHealthSyncBanner for the UI that surfaces both.
 */

import type { HealthMetricInsert } from "@/lib/repositories/health-v2";

export type PlatformKind = "ios_native" | "web" | "android" | "macos_native";

export type SyncState =
  | "not_connected"
  | "connected_syncing"
  | "connected_synced"
  | "error"
  | "platform_unsupported";

export type SyncStatus = {
  state: SyncState;
  lastSyncedAt: string | null;
  newSamplesCount: number;
  errorMessage?: string;
  reason?: "capacitor_not_installed" | "permission_denied" | "network";
};

export type SyncResult =
  | { ok: true; inserted: HealthMetricInsert[] }
  | { ok: false; reason: SyncStatus["reason"]; message?: string };

export interface AppleHealthBridge {
  detectPlatform(): PlatformKind;
  isSupported(): boolean;
  requestPermissions(): Promise<{ granted: boolean; message?: string }>;
  syncLast7Days(): Promise<SyncResult>;
  getStatus(): SyncStatus;
}

// ---- Web / stub implementation --------------------------------------------

class StubBridge implements AppleHealthBridge {
  detectPlatform(): PlatformKind {
    if (typeof window === "undefined") return "web";
    const ua = navigator.userAgent.toLowerCase();
    // Capacitor sets `Capacitor.getPlatform()`; we probe the global without
    // importing @capacitor/core (it's not a dependency yet).
    const cap = (window as { Capacitor?: { getPlatform?: () => string } })
      .Capacitor;
    if (cap?.getPlatform?.() === "ios") return "ios_native";
    if (/macintosh|mac os x/.test(ua) && "standalone" in navigator) {
      // Progressive Web App installed on macOS does not grant HealthKit.
      return "web";
    }
    if (/android/.test(ua)) return "android";
    return "web";
  }

  isSupported(): boolean {
    return this.detectPlatform() === "ios_native";
  }

  async requestPermissions(): Promise<{ granted: boolean; message?: string }> {
    return {
      granted: false,
      message: "HealthKit access requires the iOS app build.",
    };
  }

  async syncLast7Days(): Promise<SyncResult> {
    return {
      ok: false,
      reason: "capacitor_not_installed",
      message: "Apple Health sync is not yet available in this build.",
    };
  }

  getStatus(): SyncStatus {
    return {
      state: "platform_unsupported",
      lastSyncedAt: null,
      newSamplesCount: 0,
      reason: "capacitor_not_installed",
    };
  }
}

export const appleHealthBridge: AppleHealthBridge = new StubBridge();
