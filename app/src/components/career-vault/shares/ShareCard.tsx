"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Check,
  ClipboardList,
  Copy,
  Download,
  Droplets,
  Eye,
  KeyRound,
  Link2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultShare } from "@/types/career-vault";
import {
  useDeleteShare,
  useRevokeShare,
} from "@/hooks/use-career-vault-shares";
import { careerVaultSharesRepository } from "@/lib/repositories/career-vault-shares";
import { useCareerVaultFile } from "@/hooks/use-career-vault";
import { useCareerVaultBundle } from "@/hooks/use-career-vault-bundles";

interface ShareCardProps {
  share: CareerVaultShare;
  copy: CareerVaultCopy;
  onOpenLogs: (shareId: string) => void;
}

type ExpirationState =
  | { kind: "active"; label: string }
  | { kind: "expired" }
  | { kind: "never" };

function expirationState(
  share: CareerVaultShare,
  copy: CareerVaultCopy,
): ExpirationState {
  if (!share.expires_at) return { kind: "never" };
  const ms = new Date(share.expires_at).getTime() - Date.now();
  if (ms <= 0) return { kind: "expired" };
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  if (hours < 48) {
    return { kind: "active", label: copy.shares.card.expiresHours(hours) };
  }
  const days = Math.ceil(hours / 24);
  return { kind: "active", label: copy.shares.card.expiresIn(days) };
}

export function ShareCard({ share, copy, onOpenLogs }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const revoke = useRevokeShare();
  const del = useDeleteShare();

  const fileQuery = useCareerVaultFile(
    share.share_type === "single_file" ? share.file_id : null,
  );
  const bundleQuery = useCareerVaultBundle(
    share.share_type === "bundle" ? share.bundle_id : null,
  );

  const url = careerVaultSharesRepository.buildPublicShareUrl(share.share_token);
  const expires = useMemo(() => expirationState(share, copy), [share, copy]);
  const exhausted =
    typeof share.max_views === "number" &&
    share.view_count >= share.max_views;

  const subjectLabel = useMemo(() => {
    if (share.share_type === "single_file" && fileQuery.data) {
      return copy.shares.card.forFile(fileQuery.data.filename);
    }
    if (share.share_type === "bundle" && bundleQuery.data) {
      return copy.shares.card.forBundle(bundleQuery.data.name);
    }
    return null;
  }, [share.share_type, fileQuery.data, bundleQuery.data, copy]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(copy.shares.toasts.linkCopied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const statusBadges: React.ReactNode[] = [];
  if (!share.is_active) {
    statusBadges.push(
      <Badge key="revoked" variant="outline" className="gap-1">
        <Ban className="h-3 w-3" />
        {copy.shares.card.revokedBadge}
      </Badge>,
    );
  }
  if (share.password_hash) {
    statusBadges.push(
      <Badge key="pw" variant="secondary" className="gap-1">
        <KeyRound className="h-3 w-3" />
        {copy.shares.card.passwordBadge}
      </Badge>,
    );
  }
  if (share.watermark_enabled) {
    statusBadges.push(
      <Badge key="wm" variant="secondary" className="gap-1">
        <Droplets className="h-3 w-3" />
        {copy.shares.card.watermark}
      </Badge>,
    );
  }
  if (expires.kind === "expired") {
    statusBadges.push(
      <Badge key="exp" variant="destructive">
        {copy.shares.card.expired}
      </Badge>,
    );
  }
  if (exhausted) {
    statusBadges.push(
      <Badge key="ex" variant="destructive">
        {copy.shares.card.exhausted}
      </Badge>,
    );
  }

  const viewsLabel =
    typeof share.max_views === "number"
      ? copy.shares.card.maxViewsLabel(share.view_count, share.max_views)
      : copy.shares.card.viewsCount(share.view_count);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {subjectLabel ?? share.share_token}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {share.recipient_label
              ? copy.shares.card.recipientLabel(share.recipient_label)
              : copy.shares.card.noRecipient}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">{statusBadges}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {viewsLabel}
        </span>
        {expires.kind === "active" ? <span>{expires.label}</span> : null}
        <span className="inline-flex items-center gap-1">
          <Download className="h-3.5 w-3.5" />
          {share.allow_download
            ? copy.shares.card.downloadAllowed
            : copy.shares.card.downloadBlocked}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-md border bg-muted/40 p-1.5 text-xs">
        <Link2 className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{url}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copyLink}>
          {copied ? (
            <>
              <Check className="mr-1 h-4 w-4" />
              {copy.shares.card.linkCopied}
            </>
          ) : (
            <>
              <Copy className="mr-1 h-4 w-4" />
              {copy.shares.card.copyLink}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenLogs(share.id)}
        >
          <ClipboardList className="mr-1 h-4 w-4" />
          {copy.shares.card.viewLogs}
        </Button>
        {share.is_active ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmRevoke(true)}
            disabled={revoke.isPending}
          >
            <Ban className="mr-1 h-4 w-4" />
            {copy.shares.card.revoke}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
          disabled={del.isPending}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {copy.shares.card.delete}
        </Button>
      </div>

      <AlertDialog
        open={confirmRevoke}
        onOpenChange={(v) => (v ? null : setConfirmRevoke(false))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.shares.card.revoke}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.shares.card.revoke}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={revoke.isPending}
              onClick={async () => {
                try {
                  await revoke.mutateAsync(share.id);
                } finally {
                  setConfirmRevoke(false);
                }
              }}
            >
              {copy.shares.card.revoke}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(v) => (v ? null : setConfirmDelete(false))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.shares.card.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.shares.card.delete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={async () => {
                try {
                  await del.mutateAsync(share.id);
                } finally {
                  setConfirmDelete(false);
                }
              }}
            >
              {copy.shares.card.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
