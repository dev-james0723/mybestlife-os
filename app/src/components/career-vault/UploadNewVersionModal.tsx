"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize } from "@/lib/career-vault/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultFile } from "@/types/career-vault";
import { useCreateVersion } from "@/hooks/use-career-vault-versions";
import { useAIPreferences } from "@/hooks/use-ai-preferences";
import { FileUploadZone } from "./FileUploadZone";
import { FileTypeIcon } from "./FileTypeIcon";

interface UploadNewVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: CareerVaultFile;
  copy: CareerVaultCopy;
}

export function UploadNewVersionModal({
  open,
  onOpenChange,
  file,
  copy,
}: UploadNewVersionModalProps) {
  const prefs = useAIPreferences();
  const retention = prefs.data?.version_retention_limit ?? 10;

  const [newFile, setNewFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mutation = useCreateVersion(retention);

  const resetForm = () => {
    setNewFile(null);
    setChangeNote("");
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(resetForm, 200);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFileAccepted = (f: File) => {
    setNewFile(f);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (f.type.startsWith("image/")) {
      const u = URL.createObjectURL(f);
      previewUrlRef.current = u;
      setPreviewUrl(u);
    } else {
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!newFile) return;
    if (changeNote.length > 200) {
      toast.error(copy.versions.uploadNew.changeNoteHint);
      return;
    }
    try {
      await mutation.mutateAsync({
        fileId: file.id,
        newFile,
        changeNote: changeNote.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // toast handled inside hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.versions.uploadNew.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {copy.versions.uploadNew.description}
          </p>

          {!newFile ? (
            <FileUploadZone
              copy={copy}
              onFileAccepted={handleFileAccepted}
              onFileRejected={(m) => toast.error(m)}
              disabled={mutation.isPending}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileTypeIcon mime={newFile.type} className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{newFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(newFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copy.actions.cancel}
                onClick={() => {
                  if (!mutation.isPending) {
                    setNewFile(null);
                    if (previewUrlRef.current) {
                      URL.revokeObjectURL(previewUrlRef.current);
                      previewUrlRef.current = null;
                    }
                    setPreviewUrl(null);
                  }
                }}
                disabled={mutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cv-change-note">
              {copy.versions.uploadNew.changeNoteLabel}
            </Label>
            <Textarea
              id="cv-change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder={copy.versions.uploadNew.changeNotePlaceholder}
              maxLength={200}
              rows={3}
              disabled={mutation.isPending}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {changeNote.length} / 200
            </p>
          </div>

          <p className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
            {copy.versions.retentionWarning(retention)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {copy.versions.uploadNew.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newFile || mutation.isPending}
          >
            {mutation.isPending
              ? copy.versions.uploadNew.submitting
              : copy.versions.uploadNew.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
