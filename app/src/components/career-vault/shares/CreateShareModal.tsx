"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type {
  CareerVaultShare,
  CareerVaultShareType,
} from "@/types/career-vault";
import { careerVaultSharesRepository } from "@/lib/repositories/career-vault-shares";
import { useCreateShare } from "@/hooks/use-career-vault-shares";

type ExpirationOption = "never" | "24h" | "7d" | "30d" | "custom";
type MaxViewsOption = "unlimited" | "1" | "5" | "10" | "custom";

interface CreateShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CareerVaultCopy;
  shareType: CareerVaultShareType;
  fileId?: string;
  bundleId?: string;
  /** Optional label shown at the top of the modal. */
  subjectLabel?: string;
}

function addMinutes(min: number): string {
  return new Date(Date.now() + min * 60 * 1000).toISOString();
}

export function CreateShareModal({
  open,
  onOpenChange,
  copy,
  shareType,
  fileId,
  bundleId,
  subjectLabel,
}: CreateShareModalProps) {
  const createCopy = copy.shares.create;
  const createMutation = useCreateShare();

  const [recipient, setRecipient] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState<ExpirationOption>("7d");
  const [customExpiration, setCustomExpiration] = useState("");
  const [maxViewsMode, setMaxViewsMode] = useState<MaxViewsOption>("unlimited");
  const [customMaxViews, setCustomMaxViews] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [watermark, setWatermark] = useState(false);

  const [createdShare, setCreatedShare] = useState<CareerVaultShare | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      setRecipient("");
      setPasswordEnabled(false);
      setPassword("");
      setExpiration("7d");
      setCustomExpiration("");
      setMaxViewsMode("unlimited");
      setCustomMaxViews("");
      setAllowDownload(true);
      setWatermark(false);
      setCreatedShare(null);
      setCopied(false);
    }, 200);
    return () => window.clearTimeout(t);
  }, [open]);

  const shareUrl = useMemo(
    () =>
      createdShare
        ? careerVaultSharesRepository.buildPublicShareUrl(createdShare.share_token)
        : "",
    [createdShare],
  );

  const resolveExpiresAt = (): string | null => {
    switch (expiration) {
      case "never":
        return null;
      case "24h":
        return addMinutes(24 * 60);
      case "7d":
        return addMinutes(7 * 24 * 60);
      case "30d":
        return addMinutes(30 * 24 * 60);
      case "custom":
        if (!customExpiration) return null;
        return new Date(customExpiration).toISOString();
    }
  };

  const resolveMaxViews = (): number | null => {
    switch (maxViewsMode) {
      case "unlimited":
        return null;
      case "1":
        return 1;
      case "5":
        return 5;
      case "10":
        return 10;
      case "custom": {
        const n = parseInt(customMaxViews, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      }
    }
  };

  const handleCreate = async () => {
    if (passwordEnabled && password.length < 6) {
      toast.error(createCopy.passwordHint);
      return;
    }
    const result = await createMutation.mutateAsync({
      shareType,
      fileId: shareType === "single_file" ? fileId ?? null : null,
      bundleId: shareType === "bundle" ? bundleId ?? null : null,
      password: passwordEnabled ? password : null,
      expiresAt: resolveExpiresAt(),
      maxViews: resolveMaxViews(),
      recipientLabel: recipient || null,
      allowDownload,
      watermarkEnabled: watermark,
    });
    setCreatedShare(result);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(copy.shares.toasts.linkCopied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {createdShare ? createCopy.createdTitle : createCopy.title}
          </DialogTitle>
        </DialogHeader>

        {createdShare ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{createCopy.createdHint}</p>

            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
              <Link2 className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" /> {createCopy.linkCopied}
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" /> {createCopy.copyLink}
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col items-center gap-2 rounded-md border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {createCopy.qrTitle}
              </p>
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={shareUrl} size={160} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                {createCopy.done}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{createCopy.description}</p>
            {subjectLabel ? (
              <p className="truncate rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {subjectLabel}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="share-recipient">
                {createCopy.recipientLabel}
              </Label>
              <Input
                id="share-recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={createCopy.recipientPlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {createCopy.recipientHint}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share-password-toggle"
                  checked={passwordEnabled}
                  onCheckedChange={(v) => setPasswordEnabled(v === true)}
                />
                <Label htmlFor="share-password-toggle" className="cursor-pointer">
                  {createCopy.passwordToggle}
                </Label>
              </div>
              {passwordEnabled ? (
                <>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={createCopy.passwordPlaceholder}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    {createCopy.passwordHint}
                  </p>
                </>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{createCopy.expirationLabel}</Label>
                <Select
                  value={expiration}
                  onValueChange={(v) => v && setExpiration(v as ExpirationOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{createCopy.expirationNever}</SelectItem>
                    <SelectItem value="24h">{createCopy.expiration24h}</SelectItem>
                    <SelectItem value="7d">{createCopy.expiration7d}</SelectItem>
                    <SelectItem value="30d">{createCopy.expiration30d}</SelectItem>
                    <SelectItem value="custom">
                      {createCopy.expirationCustom}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {expiration === "custom" ? (
                  <Input
                    type="datetime-local"
                    value={customExpiration}
                    onChange={(e) => setCustomExpiration(e.target.value)}
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>{createCopy.maxViewsLabel}</Label>
                <Select
                  value={maxViewsMode}
                  onValueChange={(v) => v && setMaxViewsMode(v as MaxViewsOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">{createCopy.maxViewsUnlimited}</SelectItem>
                    <SelectItem value="1">{createCopy.maxViews1}</SelectItem>
                    <SelectItem value="5">{createCopy.maxViews5}</SelectItem>
                    <SelectItem value="10">{createCopy.maxViews10}</SelectItem>
                    <SelectItem value="custom">{createCopy.maxViewsCustom}</SelectItem>
                  </SelectContent>
                </Select>
                {maxViewsMode === "custom" ? (
                  <Input
                    type="number"
                    min={1}
                    value={customMaxViews}
                    onChange={(e) => setCustomMaxViews(e.target.value)}
                    placeholder={createCopy.customViewsLabel}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share-download"
                  checked={allowDownload}
                  onCheckedChange={(v) => setAllowDownload(v === true)}
                />
                <Label htmlFor="share-download" className="cursor-pointer">
                  {createCopy.allowDownloadLabel}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share-watermark"
                  checked={watermark}
                  onCheckedChange={(v) => setWatermark(v === true)}
                />
                <Label htmlFor="share-watermark" className="cursor-pointer">
                  {createCopy.watermarkLabel}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {createCopy.watermarkHint}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                {createCopy.cancel}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? createCopy.submitting
                  : createCopy.submit}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
