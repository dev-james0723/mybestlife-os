"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Check, Download, Loader2, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appleHealthBridge, type SyncState, type SyncStatus } from "@/lib/health/appleHealthBridge";
import { useCreateHealthMetricsBulk } from "@/hooks/use-health-v2";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import { useAppStore } from "@/stores/app-store";

interface Props {
  onDismiss?: () => void;
  className?: string;
}

/**
 * Top-of-page banner that surfaces Apple Health connectivity.
 *
 * - ios_native (future Capacitor build) -> real sync button
 * - web/other -> Strategy B (Apple Shortcut download) and Strategy C
 *   (CSV import) links so users on iOS/macOS aren't stuck
 *
 * Today the bridge is a stub; this component renders the `platform_unsupported`
 * variant on web and shows the manual fallbacks.
 */
export function AppleHealthSyncBanner({ onDismiss, className }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getHealthUiCopy(language).sync, [language]);
  const createMany = useCreateHealthMetricsBulk();
  const [status, setStatus] = useState<SyncStatus>(() => appleHealthBridge.getStatus());

  useEffect(() => {
    setStatus(appleHealthBridge.getStatus());
  }, []);

  async function handleSync() {
    setStatus({ ...status, state: "connected_syncing" });
    const result = await appleHealthBridge.syncLast7Days();
    if (result.ok) {
      await createMany.mutateAsync(result.inserted);
      setStatus({
        state: "connected_synced",
        lastSyncedAt: new Date().toISOString(),
        newSamplesCount: result.inserted.length,
      });
    } else {
      setStatus({
        state: "error",
        lastSyncedAt: status.lastSyncedAt,
        newSamplesCount: 0,
        errorMessage: result.message,
        reason: result.reason,
      });
    }
  }

  const state: SyncState = status.state;
  const { icon: Icon, iconClass, heading, body } = iconFor(state, status, ui);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/60 p-4 shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      role="region"
      aria-label={ui.bannerAriaLabel}
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{heading}</p>
          <p className="text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {state === "platform_unsupported" && (
          <>
            <a
              href={ui.shortcutUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="mr-2 h-4 w-4" />
              {ui.downloadShortcut}
            </a>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              {ui.dismiss}
            </Button>
          </>
        )}
        {(state === "not_connected" || state === "error") && (
          <Button size="sm" onClick={handleSync} disabled={createMany.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {state === "error" ? ui.retry : ui.connect}
          </Button>
        )}
        {state === "connected_synced" && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={createMany.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {ui.syncNow}
          </Button>
        )}
        {state === "connected_syncing" && (
          <Button size="sm" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {ui.syncing}
          </Button>
        )}
      </div>
    </div>
  );
}

function iconFor(
  state: SyncState,
  status: SyncStatus,
  ui: ReturnType<typeof getHealthUiCopy>["sync"],
): {
  icon: typeof Activity;
  iconClass: string;
  heading: string;
  body: string;
} {
  switch (state) {
    case "connected_syncing":
      return {
        icon: Loader2,
        iconClass: "bg-blue-500/10 text-blue-600",
        heading: ui.headingConnected,
        body: ui.syncingBody,
      };
    case "connected_synced":
      return {
        icon: Check,
        iconClass: "bg-green-500/10 text-green-600",
        heading: ui.headingConnected,
        body: ui.syncedBody(status.lastSyncedAt, status.newSamplesCount),
      };
    case "error":
      return {
        icon: AlertTriangle,
        iconClass: "bg-red-500/10 text-red-600",
        heading: ui.headingError,
        body: status.errorMessage ?? ui.errorBody,
      };
    case "platform_unsupported":
      return {
        icon: Activity,
        iconClass: "bg-foreground/5 text-foreground",
        heading: ui.headingUnsupported,
        body: ui.unsupportedBody,
      };
    case "not_connected":
    default:
      return {
        icon: Activity,
        iconClass: "bg-primary/10 text-primary",
        heading: ui.headingNotConnected,
        body: ui.notConnectedBody,
      };
  }
}
