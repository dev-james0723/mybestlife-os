"use client";

/**
 * Reusable sub-editors for the Role Model form.
 *
 * Each editor is a small "controlled" component: it receives the current value
 * and an `onChange` callback. The parent form owns the state — these widgets
 * just render the UI and emit edits.
 *
 * Why one file?
 * - All editors are tightly coupled to the same domain types (RoleModelQuote,
 *   RoleModelKeyLesson, RoleModelLink) and share visual conventions (the
 *   "+ Add …" pattern, dashed empty card, removal button).
 * - Splitting into 5+ tiny files would hurt readability without buying any
 *   reuse outside the role-model form.
 *
 * Design principles
 * - Tokenized colors only (no raw hex).
 * - Empty states explain *what to add*, not just that nothing is there.
 * - Removal is clearly destructive but never accidental (icon button + label).
 * - Tags use space-efficient chips with X-to-remove and Enter-to-add input.
 */

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  OSControl,
  OSIconControl,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import { RoleModelPhoto } from "@/components/relationship/role-model-photo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ROLE_MODEL_PHOTO_ALLOWED_MIMES,
  isRoleModelStorageUrl,
} from "@/lib/role-models/photo-storage";
import {
  relationshipFieldClassName,
  relationshipSelectTriggerClassName,
  relationshipTextAreaClassName,
} from "@/components/relationship/relationship-os";
import {
  useRoleModelPhotoUpload,
  type RoleModelPhotoUploadErrorCode,
} from "@/hooks/use-role-model-photo-upload";
import type {
  RoleModelKeyLesson,
  RoleModelLink,
  RoleModelLinkKind,
  RoleModelQuote,
} from "@/types/role-model";
import { ROLE_MODEL_LINK_KINDS } from "@/types/role-model";

// ============================================================================
// Photo editor
// ============================================================================

const ACCEPT_ATTR = ROLE_MODEL_PHOTO_ALLOWED_MIMES.join(",");

type PhotoErrorMessages = Record<RoleModelPhotoUploadErrorCode, string>;

type PhotoEditorProps = {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Used as the avatar fallback initial(s). */
  fallbackText?: string;
  /** Pass through to the upload hook so files can be co-located with the role model. */
  roleModelId?: string | null;
  /** Optional pulse trigger when the photo arrives via AI auto-fill. */
  pulseSignal?: number | string | null;
  /**
   * Notified after a successful storage upload. Lets the form clean up the
   * previously hosted photo (if any) so storage doesn't accumulate orphans.
   * The callback receives the URL that was *replaced*.
   */
  onUploaded?: (info: { previousUrl: string | null; nextUrl: string }) => void;

  // i18n
  labelPhoto: string;
  placeholder: string;
  removeLabel: string;
  uploadTabLabel: string;
  urlTabLabel: string;
  dropzoneIdle: string;
  dropzoneActive: string;
  dropzoneHint: string;
  dropzoneBrowse: string;
  uploadingLabel: string;
  fileInputAria: string;
  errorMessages: PhotoErrorMessages;
};

export function PhotoEditor({
  value,
  onChange,
  fallbackText,
  roleModelId,
  pulseSignal,
  onUploaded,
  labelPhoto,
  placeholder,
  removeLabel,
  uploadTabLabel,
  urlTabLabel,
  dropzoneIdle,
  dropzoneActive,
  dropzoneHint,
  dropzoneBrowse,
  uploadingLabel,
  fileInputAria,
  errorMessages,
}: PhotoEditorProps) {
  const initials = (fallbackText ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const upload = useRoleModelPhotoUpload();

  // Pulse animation key — bumps whenever AI fills in a new photo URL or after
  // a successful upload, retriggering the framer-motion `key`-driven entrance.
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    // Intentional animation retrigger when the external pulse signal changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pulseSignal != null) setPulseKey((k) => k + 1);
  }, [pulseSignal]);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const previousUrl = value;
    const result = await upload.run(file, { roleModelId });
    if (result) {
      onChange(result.publicUrl);
      onUploaded?.({ previousUrl, nextUrl: result.publicUrl });
      setPulseKey((k) => k + 1);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <Label>{labelPhoto}</Label>
      <div className="flex items-start gap-3">
        <motion.div
          key={pulseKey}
          initial={pulseKey === 0 ? false : { scale: 0.92, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        >
          <Avatar className="h-16 w-16 ring-1 ring-border">
            <RoleModelPhoto src={value} pixelSize={64} />
            <AvatarFallback className="bg-muted">
              {initials || (
                <UserRound className="h-6 w-6 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        <div className="flex-1 min-w-0">
          <Tabs defaultValue="upload">
            <TabsList className="mb-3 min-h-[52px] rounded-xl border border-slate-200/70 bg-white/68 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/[0.055]">
              <TabsTrigger
                value="upload"
                className="min-h-11 rounded-lg px-3 text-xs"
              >
                {uploadTabLabel}
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="min-h-11 rounded-lg px-3 text-xs"
              >
                {urlTabLabel}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-2">
              <div
                role="button"
                tabIndex={0}
                aria-label={fileInputAria}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center cursor-pointer transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isDragging
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground",
                )}
              >
                {upload.isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-xs font-medium text-foreground">
                      {uploadingLabel}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <p className="text-xs font-medium text-foreground">
                      {isDragging ? dropzoneActive : dropzoneIdle}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dropzoneHint}
                    </p>
                    <span className="mt-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline">
                      {dropzoneBrowse}
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  // Allow re-uploading the same file (browsers skip onChange
                  // for an identical selection unless we clear the value).
                  e.currentTarget.value = "";
                }}
              />

              <AnimatePresence>
                {upload.status === "error" && upload.error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {errorMessages[upload.error]}
                  </motion.p>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="url" className="space-y-2">
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rm-photo-url"
                  value={value && !isRoleModelStorageUrl(value) ? value : ""}
                  onChange={(e) => onChange(e.target.value || null)}
                  placeholder={placeholder}
                  className={cn(relationshipFieldClassName, "pl-9")}
                  type="url"
                  inputMode="url"
                />
              </div>
              {value && isRoleModelStorageUrl(value) && (
                <p className="text-[11px] text-muted-foreground">
                  {/*
                    The stored photo lives in our bucket — to replace it,
                    upload another file or remove the current one. We don't
                    show the long Supabase URL since it's not user-friendly.
                  */}
                </p>
              )}
            </TabsContent>
          </Tabs>

          {value && (
            <OSControl
              type="button"
              variant="ghost"
              className="mt-2 text-muted-foreground hover:text-destructive"
              onClick={() => {
                onChange(null);
                upload.reset();
              }}
            >
              <X className="h-3 w-3 mr-1" />
              {removeLabel}
            </OSControl>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tags editor (chip input)
// ============================================================================

type TagsEditorProps = {
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
  placeholder: string;
  helpText?: string;
  removeLabel: string;
};

export function TagsEditor({
  value,
  onChange,
  label,
  placeholder,
  helpText,
  removeLabel,
}: TagsEditorProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      // Lazy delete — pop the last tag on Backspace from empty input.
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="rm-tags-input">{label}</Label>
      <div
        className={cn(
          relationshipSelectTriggerClassName,
          "flex h-auto min-h-12 flex-wrap items-center gap-2 px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        {value.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            <span className="text-xs">{t}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-muted-foreground/20"
              aria-label={`${removeLabel} ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          id="rm-tags-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-h-11 flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

// ============================================================================
// Quotes editor (list of {text, source})
// ============================================================================

type QuotesEditorProps = {
  value: RoleModelQuote[];
  onChange: (next: RoleModelQuote[]) => void;
  label: string;
  emptyText: string;
  textLabel: string;
  sourceLabel: string;
  addLabel: string;
  removeLabel: string;
};

export function QuotesEditor({
  value,
  onChange,
  label,
  emptyText,
  textLabel,
  sourceLabel,
  addLabel,
  removeLabel,
}: QuotesEditorProps) {
  const update = (idx: number, patch: Partial<RoleModelQuote>) => {
    onChange(value.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <OSControl
          type="button"
          variant="ghost"
          onClick={() => onChange([...value, { text: "", source: null }])}
        >
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </OSControl>
      </div>

      {value.length === 0 ? (
        <EmptyEditorCard text={emptyText} />
      ) : (
        <div className="space-y-3">
          {value.map((q, idx) => (
            <OSSolidPanel
              key={idx}
              className="p-3 space-y-2"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {textLabel}
                </Label>
                <Textarea
                  value={q.text}
                  onChange={(e) => update(idx, { text: e.target.value })}
                  rows={2}
                  className={cn(relationshipTextAreaClassName, "resize-none")}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {sourceLabel}
                  </Label>
                  <Input
                    className={relationshipFieldClassName}
                    value={q.source ?? ""}
                    onChange={(e) =>
                      update(idx, { source: e.target.value || null })
                    }
                  />
                </div>
                <OSIconControl
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  aria-label={removeLabel}
                >
                  <Trash2 className="h-4 w-4" />
                </OSIconControl>
              </div>
            </OSSolidPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Key Lessons editor (list of {title, detail})
// ============================================================================

type KeyLessonsEditorProps = {
  value: RoleModelKeyLesson[];
  onChange: (next: RoleModelKeyLesson[]) => void;
  label: string;
  emptyText: string;
  titleLabel: string;
  detailLabel: string;
  addLabel: string;
  removeLabel: string;
};

export function KeyLessonsEditor({
  value,
  onChange,
  label,
  emptyText,
  titleLabel,
  detailLabel,
  addLabel,
  removeLabel,
}: KeyLessonsEditorProps) {
  const update = (idx: number, patch: Partial<RoleModelKeyLesson>) => {
    onChange(value.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <OSControl
          type="button"
          variant="ghost"
          onClick={() => onChange([...value, { title: "", detail: null }])}
        >
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </OSControl>
      </div>

      {value.length === 0 ? (
        <EmptyEditorCard text={emptyText} />
      ) : (
        <div className="space-y-3">
          {value.map((l, idx) => (
            <OSSolidPanel
              key={idx}
              className="p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {titleLabel}
                  </Label>
                  <Input
                    className={relationshipFieldClassName}
                    value={l.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                  />
                </div>
                <OSIconControl
                  type="button"
                  variant="ghost"
                  className="mt-5 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  aria-label={removeLabel}
                >
                  <Trash2 className="h-4 w-4" />
                </OSIconControl>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {detailLabel}
                </Label>
                <Textarea
                  value={l.detail ?? ""}
                  onChange={(e) =>
                    update(idx, { detail: e.target.value || null })
                  }
                  rows={2}
                  className={cn(relationshipTextAreaClassName, "resize-none")}
                />
              </div>
            </OSSolidPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Links editor (list of {label, url, kind})
// ============================================================================

type LinkKindOption = { value: RoleModelLinkKind; label: string };

type LinksEditorProps = {
  value: RoleModelLink[];
  onChange: (next: RoleModelLink[]) => void;
  kindOptions: LinkKindOption[];
  label: string;
  emptyText: string;
  linkLabelLabel: string;
  urlLabel: string;
  kindLabel: string;
  addLabel: string;
  removeLabel: string;
};

export function LinksEditor({
  value,
  onChange,
  kindOptions,
  label,
  emptyText,
  linkLabelLabel,
  urlLabel,
  kindLabel,
  addLabel,
  removeLabel,
}: LinksEditorProps) {
  const update = (idx: number, patch: Partial<RoleModelLink>) => {
    onChange(value.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <OSControl
          type="button"
          variant="ghost"
          onClick={() =>
            onChange([
              ...value,
              { label: "", url: "", kind: "other" satisfies RoleModelLinkKind },
            ])
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </OSControl>
      </div>

      {value.length === 0 ? (
        <EmptyEditorCard text={emptyText} />
      ) : (
        <div className="space-y-3">
          {value.map((l, idx) => (
            <OSSolidPanel
              key={idx}
              className="p-3 space-y-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {linkLabelLabel}
                  </Label>
                  <Input
                    className={relationshipFieldClassName}
                    value={l.label}
                    onChange={(e) => update(idx, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {kindLabel}
                  </Label>
                  <Select
                    value={l.kind ?? "other"}
                    onValueChange={(next) =>
                      update(idx, { kind: next as RoleModelLinkKind })
                    }
                  >
                    <SelectTrigger className={relationshipSelectTriggerClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kindOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {urlLabel}
                  </Label>
                  <Input
                    className={relationshipFieldClassName}
                    value={l.url}
                    onChange={(e) => update(idx, { url: e.target.value })}
                    placeholder="https://…"
                    type="url"
                    inputMode="url"
                  />
                </div>
                <OSIconControl
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  aria-label={removeLabel}
                >
                  <Trash2 className="h-4 w-4" />
                </OSIconControl>
              </div>
            </OSSolidPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Shared empty card
// ============================================================================

function EmptyEditorCard({ text }: { text: string }) {
  return (
    <OSSolidPanel className="border-dashed px-4 py-6 text-center">
      <p className="text-xs text-muted-foreground text-balance">{text}</p>
    </OSSolidPanel>
  );
}

// Re-export for ergonomic imports in the form file.
export { ROLE_MODEL_LINK_KINDS };
