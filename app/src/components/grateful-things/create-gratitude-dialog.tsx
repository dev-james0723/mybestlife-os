"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { CloudUpload, ImagePlus, Loader2, PenLine, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import type { CreateGratefulThingInput } from "@/lib/repositories/grateful-things";
import {
  GRATITUDE_CATEGORY_VALUES,
  type GratefulThingsUiCopy,
  type GratitudeCategoryValue,
} from "@/lib/i18n/grateful-things-ui";

function isGratitudeCategoryValue(v: string): v is GratitudeCategoryValue {
  return (GRATITUDE_CATEGORY_VALUES as readonly string[]).includes(v);
}

const PHOTO_MAX_BYTES = 1_500_000;

/** Wait after typing before calling classify (avoids spamming Gemini). */
const CLASSIFY_DEBOUNCE_MS = 900;
/** Avoid tiny fragments; short lines still classify once user has a phrase. */
const CLASSIFY_MIN_CHARS = 20;

function plainTextToSafeEditorHtml(text: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const blocks = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (blocks.length === 0) return "<p></p>";
  return blocks.map((p) => `<p>${escape(p)}</p>`).join("");
}

function approxBase64BytesInDataUrl(dataUrl: string): number {
  const idx = dataUrl.indexOf("base64,");
  if (idx === -1) return 0;
  const b64 = dataUrl.slice(idx + "base64,".length);
  return Math.floor((b64.length * 3) / 4);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: GratefulThingsUiCopy;
  onSave: (input: CreateGratefulThingInput) => Promise<void>;
  isSaving: boolean;
};

export function CreateGratitudeDialog({ open, onOpenChange, copy, onSave, isSaving }: Props) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** When true, skip auto category updates while typing (user chose the dropdown). */
  const categoryManualOverrideRef = useRef(false);
  const classifyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const classifyAbortRef = useRef<AbortController | null>(null);
  const [entryDate, setEntryDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  /** Mirrors editor ref for render-safe Save enabled state (refs must not be read during render). */
  const [editorSnapshot, setEditorSnapshot] = useState({ html: "", textTrimmed: "" });
  const [aiPhotoPending, setAiPhotoPending] = useState(false);
  const [aiEnhancePending, setAiEnhancePending] = useState(false);

  const syncEditorFromRef = useCallback(() => {
    const html = editorRef.current?.getHtml() ?? "";
    const textTrimmed = editorRef.current?.getText().trim() ?? "";
    setEditorSnapshot({ html, textTrimmed });
  }, []);

  const cancelPendingClassify = useCallback(() => {
    if (classifyDebounceRef.current) {
      clearTimeout(classifyDebounceRef.current);
      classifyDebounceRef.current = null;
    }
    classifyAbortRef.current?.abort();
    classifyAbortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    categoryManualOverrideRef.current = false;
    cancelPendingClassify();
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setCategory("");
    setPhotoDataUrl(null);
    setIsFavorite(false);
    editorRef.current?.reset();
    setEditorSnapshot({ html: "", textTrimmed: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cancelPendingClassify]);

  useEffect(() => () => cancelPendingClassify(), [cancelPendingClassify]);

  const runClassifyFromEditor = useCallback(async () => {
    if (categoryManualOverrideRef.current) return;
    const plain = editorRef.current?.getText().trim() ?? "";
    if (plain.length < CLASSIFY_MIN_CHARS) return;
    classifyAbortRef.current?.abort();
    const ac = new AbortController();
    classifyAbortRef.current = ac;
    try {
      const res = await fetch("/api/grateful-things/ai/classify-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plain }),
        signal: ac.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; category?: string };
      if (!res.ok) return;
      const next = typeof data.category === "string" ? data.category.trim() : "";
      if (!isGratitudeCategoryValue(next)) return;
      if (categoryManualOverrideRef.current) return;
      setCategory(next);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  const scheduleClassify = useCallback(() => {
    if (classifyDebounceRef.current) clearTimeout(classifyDebounceRef.current);
    classifyDebounceRef.current = setTimeout(() => {
      classifyDebounceRef.current = null;
      void runClassifyFromEditor();
    }, CLASSIFY_DEBOUNCE_MS);
  }, [runClassifyFromEditor]);

  const handleEditorChange = useCallback(() => {
    syncEditorFromRef();
    scheduleClassify();
  }, [syncEditorFromRef, scheduleClassify]);

  const handleCategorySelect = useCallback(
    (v: string | null) => {
      categoryManualOverrideRef.current = true;
      cancelPendingClassify();
      setCategory(v ?? "");
    },
    [cancelPendingClassify]
  );

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePhotoFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error(copy.toastPhotoTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGeneratePhotoAi = async () => {
    const text = editorRef.current?.getText().trim() ?? "";
    if (!text) {
      toast.error(copy.toastAiNeedContent);
      return;
    }
    setAiPhotoPending(true);
    try {
      const res = await fetch("/api/grateful-things/ai/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        imageUrl?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : copy.toastAiFailed);
        return;
      }
      if (typeof data.imageUrl !== "string" || !data.imageUrl.startsWith("data:")) {
        toast.error(copy.toastAiFailed);
        return;
      }
      if (approxBase64BytesInDataUrl(data.imageUrl) > PHOTO_MAX_BYTES) {
        toast.error(copy.toastPhotoTooLarge);
        return;
      }
      setPhotoDataUrl(data.imageUrl);
      toast.success(copy.toastAiPhotoSuccess, { description: copy.toastAiPhotoTitle });
    } catch {
      toast.error(copy.toastAiFailed);
    } finally {
      setAiPhotoPending(false);
    }
  };

  const handleEnhanceAi = async () => {
    const text = editorRef.current?.getText().trim() ?? "";
    if (!text) {
      toast.error(copy.toastAiNeedContent);
      return;
    }
    setAiEnhancePending(true);
    try {
      const res = await fetch("/api/grateful-things/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          ...(category.trim() ? { currentCategory: category.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        enhancedText?: string;
        category?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : copy.toastAiFailed);
        return;
      }
      if (typeof data.enhancedText !== "string" || !data.enhancedText.trim()) {
        toast.error(copy.toastAiFailed);
        return;
      }
      editorRef.current?.setHtml(plainTextToSafeEditorHtml(data.enhancedText.trim()));
      syncEditorFromRef();
      if (typeof data.category === "string" && isGratitudeCategoryValue(data.category.trim())) {
        setCategory(data.category.trim());
      }
      categoryManualOverrideRef.current = false;
      toast.success(copy.toastAiEnhanceSuccess, { description: copy.toastAiEnhanceTitle });
    } catch {
      toast.error(copy.toastAiFailed);
    } finally {
      setAiEnhancePending(false);
    }
  };

  const handleSave = async () => {
    const html = editorRef.current?.getHtml() ?? "";
    const text = editorRef.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return;
    try {
      await onSave({
        content: html.trim() || text,
        entry_date: entryDate,
        category: category || null,
        photo_url: photoDataUrl,
        is_favorite: isFavorite,
      });
      handleDialogOpenChange(false);
    } catch {
      /* toast from mutation */
    }
  };

  const canSave =
    editorSnapshot.textTrimmed.length > 0 || /<img\b/i.test(editorSnapshot.html);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[min(90vh,760px)] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-lg sm:max-w-xl"
        )}
      >
        <DialogHeader className="relative border-b border-border bg-popover px-6 pb-4 pt-6 text-center">
          <DialogTitle className="font-sans text-lg font-semibold tracking-tight text-foreground">
            {copy.createDialogTitle}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            onClick={() => handleDialogOpenChange(false)}
            aria-label={copy.createCloseAria}
          >
            <span className="text-lg leading-none">×</span>
          </Button>
        </DialogHeader>

        <div className="space-y-5 bg-popover px-6 py-5">
          <RichTextEditor
            ref={editorRef}
            onChange={handleEditorChange}
            placeholder={copy.editorPlaceholder}
            minHeightClass="min-h-[200px]"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={aiPhotoPending}
              onClick={handleGeneratePhotoAi}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition",
                "bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
              )}
            >
              {aiPhotoPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4 shrink-0" />
              )}
              {copy.generatePhotoAi}
            </button>
            <button
              type="button"
              disabled={aiEnhancePending}
              onClick={handleEnhanceAi}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition",
                "bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
              )}
            >
              {aiEnhancePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PenLine className="size-4 shrink-0" />
              )}
              {copy.enhanceAi}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{copy.labelDateShort}</Label>
              <DatePickerInput
                value={entryDate}
                onChange={(v) => setEntryDate(v)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{copy.labelCategoryShort}</Label>
              <Select value={category || undefined} onValueChange={handleCategorySelect}>
                <SelectTrigger
                  className={cn(
                    "h-10 w-full rounded-lg text-sm",
                    "focus-visible:border-violet-400 focus-visible:ring-violet-400/30 dark:focus-visible:border-violet-500 dark:focus-visible:ring-violet-500/30"
                  )}
                >
                  <SelectValue placeholder={copy.selectCategoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {GRATITUDE_CATEGORY_VALUES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {copy.categoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{copy.photoSectionLabel}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 py-10 transition",
                "hover:border-violet-400/50 hover:bg-muted/60 dark:hover:border-violet-500/40"
              )}
            >
              {photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoDataUrl}
                  alt=""
                  className="max-h-40 max-w-full rounded-lg object-contain"
                />
              ) : (
                <>
                  <CloudUpload className="size-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{copy.uploadPhotoHint}</span>
                </>
              )}
            </button>
            {photoDataUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setPhotoDataUrl(null)}
                >
                  <Trash2 className="size-4 shrink-0 text-destructive" aria-hidden />
                  {copy.removePhoto}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-lg"
                  disabled={aiPhotoPending}
                  onClick={() => void handleGeneratePhotoAi()}
                >
                  {aiPhotoPending ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-4 shrink-0" aria-hidden />
                  )}
                  {copy.regeneratePhoto}
                </Button>
              </div>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox checked={isFavorite} onCheckedChange={(v) => setIsFavorite(v === true)} />
            {copy.createMarkFavorite}
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={() => handleDialogOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={!canSave || isSaving}
            onClick={handleSave}
            className={cn(
              "rounded-lg border-0 text-white",
              "bg-[#f4a7c1] hover:bg-[#e895b0] dark:bg-pink-600 dark:hover:bg-pink-500"
            )}
          >
            {isSaving ? copy.saving : copy.saveEntry}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
