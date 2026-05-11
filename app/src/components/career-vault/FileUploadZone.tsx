"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAREER_VAULT_ACCEPTED_MIME,
  CAREER_VAULT_ACCEPTED_MIME_TYPES,
  CAREER_VAULT_MAX_FILE_BYTES,
  inferMimeFromFilename,
} from "@/lib/career-vault/constants";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface FileUploadZoneProps {
  copy: CareerVaultCopy;
  onFileAccepted: (file: File) => void;
  onFileRejected: (reason: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function FileUploadZone({
  copy,
  onFileAccepted,
  onFileRejected,
  disabled,
  compact,
}: FileUploadZoneProps) {
  const handleDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const first = rejections[0];
        const code = first?.errors[0]?.code;
        if (code === "file-too-large") {
          onFileRejected(
            copy.errors.fileTooLarge(
              Math.round(CAREER_VAULT_MAX_FILE_BYTES / (1024 * 1024)),
            ),
          );
        } else if (code === "file-invalid-type") {
          onFileRejected(copy.errors.invalidType);
        } else {
          onFileRejected(first?.errors[0]?.message ?? copy.errors.uploadFailed);
        }
        return;
      }
      const file = accepted[0];
      if (!file) return;
      const declaredMime = file.type || inferMimeFromFilename(file.name) || "";
      if (!CAREER_VAULT_ACCEPTED_MIME_TYPES.includes(declaredMime)) {
        onFileRejected(copy.errors.invalidType);
        return;
      }
      onFileAccepted(file);
    },
    [copy.errors, onFileAccepted, onFileRejected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    maxFiles: 1,
    maxSize: CAREER_VAULT_MAX_FILE_BYTES,
    accept: CAREER_VAULT_ACCEPTED_MIME,
    disabled,
  });

  const maxMb = Math.round(CAREER_VAULT_MAX_FILE_BYTES / (1024 * 1024));

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-center transition-colors",
        "cursor-pointer hover:border-foreground/40 hover:bg-muted/60",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "p-4" : "p-8",
        isDragActive && "border-foreground bg-muted/80",
        disabled && "cursor-not-allowed opacity-60",
      )}
      role="button"
      tabIndex={0}
      aria-label={copy.upload.dragDrop}
      aria-disabled={disabled}
    >
      <input {...getInputProps()} />
      <UploadCloud
        className={cn(
          "text-muted-foreground",
          compact ? "h-6 w-6" : "h-10 w-10",
        )}
      />
      <p className={cn("font-medium", compact ? "text-sm" : "text-base")}>
        {isDragActive ? copy.upload.dragDropActive : copy.upload.dragDrop}
      </p>
      <p className="text-xs text-muted-foreground">
        {copy.upload.or}{" "}
        <span className="font-medium text-foreground underline">
          {copy.upload.browse}
        </span>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {copy.upload.accepted} · {copy.upload.maxSize(maxMb)}
      </p>
    </div>
  );
}
