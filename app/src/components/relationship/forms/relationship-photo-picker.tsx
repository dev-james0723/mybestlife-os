"use client";

/**
 * Photo picker for the Relationship form.
 *
 * UX:
 *  - Empty state: dashed dropzone with upload icon. Click or drag-and-drop.
 *  - With value: round preview (matches the card avatar shape) with a
 *    "Remove" overlay on hover/focus. Uploading a new file replaces the
 *    current one and best-effort-deletes the old storage object.
 *  - Errors are surfaced inline (i18n'd, specific reason).
 *
 * The component never writes to the relationships table — it only
 * uploads to storage and emits the resulting public URL upward via
 * `onChange`. The parent persists the URL on form submit.
 */

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Loader2, X, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RELATIONSHIP_PHOTO_ALLOWED_MIMES,
  deleteRelationshipPhoto,
  isRelationshipStorageUrl,
  uploadRelationshipPhoto,
  validateRelationshipPhotoFile,
} from "@/lib/relationships/photo-storage";

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Optional — passed to upload helper to scope the storage path. */
  relationshipId?: string | null;
  /** Localized helper / error copy. */
  hintText: string;
  uploadingText: string;
  removeAriaLabel: string;
  /** Localized error labels — keys map to validateRelationshipPhotoFile reasons. */
  errors: {
    wrong_type: string;
    too_large: string;
    empty: string;
    auth: string;
    unknown: string;
  };
};

export function RelationshipPhotoPicker({
  value,
  onChange,
  relationshipId,
  hintText,
  uploadingText,
  removeAriaLabel,
  errors,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validation = validateRelationshipPhotoFile(file);
      if (!validation.ok) {
        setError(errors[validation.reason]);
        return;
      }

      setBusy(true);
      try {
        // Best-effort: clean up the previous storage object if it's ours.
        if (value && isRelationshipStorageUrl(value)) {
          void deleteRelationshipPhoto(value);
        }
        const result = await uploadRelationshipPhoto({
          file,
          relationshipId,
        });
        onChange(result.publicUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("not authenticated")) setError(errors.auth);
        else setError(errors.unknown);
      } finally {
        setBusy(false);
      }
    },
    [value, onChange, relationshipId, errors],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset so re-picking the same file still triggers onChange.
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleRemove = () => {
    if (value && isRelationshipStorageUrl(value)) {
      void deleteRelationshipPhoto(value);
    }
    onChange(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={RELATIONSHIP_PHOTO_ALLOWED_MIMES.join(",")}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {value ? (
        <div className="flex items-center gap-3">
          <motion.div
            initial={reduce ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
          >
            {/* Plain <img> rather than next/image so external URLs work without remotePatterns config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
            />
          </motion.div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    {uploadingText}
                  </>
                ) : (
                  <>
                    <ImagePlus className="mr-2 h-3.5 w-3.5" />
                    {hintText}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={busy}
                aria-label={removeAriaLabel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border-2 border-dashed bg-card/40 px-4 py-4 text-left transition-colors",
            "hover:border-primary/50 hover:bg-card/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border",
          )}
          disabled={busy}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </span>
          <span className="text-sm text-muted-foreground">
            {busy ? uploadingText : hintText}
          </span>
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
