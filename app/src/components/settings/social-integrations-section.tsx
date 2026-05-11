"use client";

/**
 * Settings → Social Integrations card.
 *
 * Renders one row per supported OAuth provider (Meta / Reddit / GitHub).
 * Each row shows connection status, account info, granted scopes, expiry,
 * and Connect / Reconnect / Disconnect controls. Tokens never reach this
 * component — `/api/social/status` returns sanitized `SocialConnectionPublic`
 * shapes only.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OAuthProvider,
  SocialConnectionStatus,
} from "@/types/knowledge-source";
import type { SocialConnectionPublic } from "@/types/social-connections";

type StatusResponse = {
  connections: Record<OAuthProvider, SocialConnectionPublic | null>;
};

const PROVIDERS: ReadonlyArray<{
  key: OAuthProvider;
  title: string;
  description: string;
}> = [
  {
    key: "meta",
    title: "Instagram, Facebook & Threads",
    description:
      "Connect via Meta to enrich Instagram, Facebook and Threads links with author and caption data. Snapshots fill in the visual.",
  },
  {
    key: "reddit",
    title: "Reddit",
    description: "Connect Reddit to read post bodies and metadata for richer cards.",
  },
  {
    key: "github",
    title: "GitHub",
    description:
      "Connect GitHub to lift API rate limits and enable READMEs from private repositories you have access to.",
  },
];

function statusLabel(s: SocialConnectionStatus): string {
  switch (s) {
    case "active":
      return "Connected";
    case "expired":
      return "Reconnect needed";
    case "disconnected":
      return "Disconnected";
    case "error":
      return "Error — reconnect";
  }
}

function statusVariant(
  s: SocialConnectionStatus | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (s === "active") return "default";
  if (s === "expired" || s === "error") return "destructive";
  return "outline";
}

function formatExpiry(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) return "expired";
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "expires today";
  if (days === 1) return "expires in 1 day";
  if (days < 30) return `expires in ${days} days`;
  return `expires ${d.toLocaleDateString()}`;
}

export function SocialIntegrationsSection() {
  const search = useSearchParams();
  const [data, setData] = useState<StatusResponse["connections"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const json = (await res.json()) as StatusResponse;
      setData(json.connections);
    } catch (err) {
      toast.error(
        `Couldn't load social integrations: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Surface OAuth callback status (?status=connected|error&provider=…&msg=…)
  useEffect(() => {
    const status = search.get("status");
    const provider = search.get("provider");
    const msg = search.get("msg");
    if (!status || !provider) return;
    if (status === "connected") {
      toast.success(`Connected ${provider}.`);
    } else {
      const decoded = msg ? decodeURIComponent(msg.replace(/\+/g, " ")) : "";
      const friendly =
        decoded === "not_signed_in"
          ? "Sign in to the app first, then try Connect again."
          : decoded === "missing_meta_app_id"
            ? "Missing META_APP_ID in server environment."
            : decoded === "missing_meta_app_secret"
              ? "Missing META_APP_SECRET in server environment."
              : decoded === "missing_app_base_url"
                ? "Missing APP_BASE_URL (set it, or use localhost with NODE_ENV=development)."
                : decoded === "state_mismatch"
                  ? "OAuth session expired or invalid — try Connect again."
                  : decoded;
      toast.error(
        `Couldn't connect ${provider}${friendly ? `: ${friendly}` : "."}`,
      );
    }
  }, [search]);

  const onConnect = (provider: OAuthProvider) => {
    setBusy(provider);
    window.location.href = `/api/social/connect/${provider}`;
  };

  const onDisconnect = useCallback(
    async (provider: OAuthProvider) => {
      setBusy(provider);
      try {
        const res = await fetch(`/api/social/disconnect/${provider}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        toast.success(`Disconnected ${provider}.`);
        await refresh();
      } catch (err) {
        toast.error(
          `Couldn't disconnect: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return (
    <Card id="social-integrations">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
          <div>
            <CardTitle>Social Integrations</CardTitle>
            <CardDescription>
              Connect social platforms to enrich Knowledge Base previews. Tokens are
              encrypted and never leave the server. OAuth opens in this browser tab (not
              a separate pop-up window).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : null}

        {data
          ? PROVIDERS.map((p) => {
              const conn = data[p.key];
              const isBusy = busy === p.key;
              const status: SocialConnectionStatus | null = conn?.status ?? null;
              const expires = formatExpiry(conn?.expiresAt);

              return (
                <div
                  key={p.key}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Plug className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.title}</span>
                        <Badge variant={statusVariant(status)} className="shrink-0">
                          {status ? statusLabel(status) : "Not connected"}
                        </Badge>
                        {expires ? (
                          <span
                            className={cn(
                              "text-xs",
                              expires === "expired"
                                ? "text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {expires}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                      {conn?.accountName || conn?.accountHandle ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {conn.accountHandle ?? ""}
                          {conn.accountHandle && conn.accountName ? " · " : ""}
                          {conn.accountName ?? ""}
                        </p>
                      ) : null}
                      {conn?.scopes && conn.scopes.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Scopes: {conn.scopes.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {conn ? (
                      <>
                        {status !== "active" ? (
                          <Button
                            size="sm"
                            onClick={() => onConnect(p.key)}
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 mr-1.5" /> Reconnect
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Connected
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDisconnect(p.key)}
                          disabled={isBusy}
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Disconnect"
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onConnect(p.key)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-1.5" /> Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          : null}
      </CardContent>
    </Card>
  );
}
