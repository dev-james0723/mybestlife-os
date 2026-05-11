"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  resolveShare,
  type ResolveShareResult,
} from "@/lib/career-vault/share-client";
import type { ResolvedShare } from "@/types/career-vault";
import { formatRelativeShort } from "@/lib/career-vault/utils";
import { PasswordPrompt } from "./PasswordPrompt";
import { ShareFileViewer } from "./ShareFileViewer";

interface SharePageViewProps {
  token: string;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "password"; invalid: boolean }
  | { kind: "error"; error: ResolveShareResult extends { ok: false } ? ResolveShareResult["error"] : string }
  | { kind: "ready"; data: ResolvedShare };

export function SharePageView({ token }: SharePageViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const publicCopy = copy.shares.public;

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [pendingPassword, setPendingPassword] = useState(false);

  const loadShare = useCallback(
    async (password?: string) => {
      if (!password) setState({ kind: "loading" });
      const res = await resolveShare({ token, password });
      if (res.ok) {
        setState({ kind: "ready", data: res.data });
        return;
      }
      if (res.error === "password_required") {
        setState({ kind: "password", invalid: false });
        return;
      }
      if (res.error === "password_invalid") {
        setState({ kind: "password", invalid: true });
        return;
      }
      setState({ kind: "error", error: res.error });
    },
    [token],
  );

  useEffect(() => {
    void loadShare();
  }, [loadShare]);

  if (state.kind === "loading") return <LoadingPage />;

  if (state.kind === "password") {
    return (
      <PasswordPrompt
        copy={copy}
        invalid={state.invalid}
        loading={pendingPassword}
        onSubmit={async (pw) => {
          setPendingPassword(true);
          try {
            await loadShare(pw);
          } finally {
            setPendingPassword(false);
          }
        }}
      />
    );
  }

  if (state.kind === "error") {
    const msgKey = state.error;
    const msg =
      msgKey === "not_found"
        ? publicCopy.errors.notFound
        : msgKey === "revoked"
          ? publicCopy.errors.revoked
          : msgKey === "expired"
            ? publicCopy.errors.expired
            : msgKey === "exhausted"
              ? publicCopy.errors.exhausted
              : publicCopy.errors.generic;

    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm">{msg}</p>
        <div className="mt-6">
          <Button render={<Link href="/" />}>
            {publicCopy.ctaButton}
          </Button>
        </div>
      </div>
    );
  }

  const { data } = state;
  const ownerLabel = data.ownerName
    ? publicCopy.sharedBy(data.ownerName)
    : publicCopy.anonymous;

  const watermark =
    data.watermarkEnabled
      ? `${data.recipientLabel ?? "share"} · ${new Date().toLocaleDateString()}`
      : undefined;

  const expiryHint = data.expiresAt
    ? publicCopy.expiresHint(formatRelativeShort(data.expiresAt))
    : null;

  const viewsHint =
    typeof data.maxViews === "number"
      ? publicCopy.viewsHint(data.viewCount, data.maxViews)
      : publicCopy.unlimitedViews(data.viewCount);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="rounded-xl border bg-card p-4">
        <p className="text-sm">{ownerLabel}</p>
        {data.recipientLabel ? (
          <p className="text-xs text-muted-foreground">
            {data.recipientLabel}
          </p>
        ) : null}
      </header>

      {data.shareType === "bundle" && data.bundle ? (
        <section className="rounded-xl border bg-card p-4">
          <h1 className="text-lg font-semibold">{data.bundle.name}</h1>
          {data.bundle.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.bundle.description}
            </p>
          ) : null}
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {publicCopy.bundleFilesHeading}
          </p>
        </section>
      ) : null}

      <div className="space-y-4">
        {data.files.map((f) => (
          <ShareFileViewer
            key={f.id}
            file={f}
            copy={copy}
            allowDownload={data.allowDownload}
            watermarkText={watermark}
            createdAt={data.createdAt}
          />
        ))}
      </div>

      <footer className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        {expiryHint ? (
          <p className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {expiryHint}
          </p>
        ) : null}
        <p className="mt-1">{viewsHint}</p>
        {data.watermarkEnabled ? (
          <p className="mt-1">{publicCopy.watermarkNote}</p>
        ) : null}
      </footer>

      <div className="rounded-xl border bg-card p-4 text-center text-xs">
        <p className="text-muted-foreground">{publicCopy.ctaText}</p>
        <Button size="sm" className="mt-2" render={<Link href="/" />}>
          <span>{publicCopy.ctaButton}</span>
          <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
