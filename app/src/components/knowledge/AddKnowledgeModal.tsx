"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import type { ThumbnailStyle } from "@/types/knowledge";
import type { SourceType } from "@/types/knowledge-source";
import {
  addKnowledgeFromUrl,
  addKnowledgeFromText,
  addKnowledgeFromVoice,
  suggestTitleForTextDraft,
  transcribeVoiceMemo,
  finalizeKnowledgeFileUpload,
} from "@/lib/knowledge/mutations";
import { createClient } from "@/lib/supabase/client";
import {
  clientValidateKnowledgeFileBeforeUpload,
  guessMimeFromExtension,
  isKnowledgePhotoFile,
  KNOWLEDGE_FILE_INPUT_ACCEPT,
} from "@/lib/knowledge/knowledge-file-upload";
import { compressImageForKnowledgeThumbnail } from "@/lib/knowledge/compress-knowledge-photo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbnailStylePicker } from "./ThumbnailStylePicker";
import { SourceTypeBadge } from "./source/SourceTypeBadge";
import { isYouTubePageUrl } from "@/lib/knowledge/youtube";
import { classifyKnowledgeInput, classifyUrl } from "@/lib/knowledge/classify";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/shared/rich-text-editor";
import { stripHtml } from "@/lib/utils/html";
import {
  detectCodeLanguage,
  looksLikeSourceCode,
  supportsPreview,
} from "@/lib/knowledge/code-content";
import { Link2, FileUp, Type, Mic, Square, Upload, Sparkles, Lightbulb, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";

/**
 * Map a classifier result → the SourceType we'll pass to the server.
 * The client classifier handles URL + text; here we only need the bits
 * the server actually stores.
 */
function resolveTextSourceType(text: string): {
  sourceType: SourceType;
  label: string;
  supportsPreview: boolean;
  defaultDisplayMode: "preview" | "source";
  askEnabled: boolean;
} {
  const classification = classifyKnowledgeInput(text);
  // `getSourceTypeInfo` call is retained for future use (icon-only rendering
  // of the detected source type) — currently the badge component owns that.
  return {
    sourceType: classification.sourceType,
    label: classification.label,
    supportsPreview: classification.supportsPreview,
    defaultDisplayMode: classification.defaultDisplayMode,
    askEnabled: classification.askEnabled,
  };
}

export function AddKnowledgeModal() {
  const language = useAppStore((s) => s.language);
  const knowledgeUi = getKnowledgeUiCopy(language);
  const ui = knowledgeUi.addModal;
  const closeAddModal = useKnowledgeStore((s) => s.closeAddModal);
  const [activeTab, setActiveTab] = useState("url");
  const [thumbnailStyle, setThumbnailStyle] = useState<ThumbnailStyle>("minimal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL tab
  const [url, setUrl] = useState("");
  const [withYouTubeTranscript, setWithYouTubeTranscript] = useState(false);

  // File tab
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const cancelPendingFileUploadRef = useRef(false);

  // Text tab
  const [textTitle, setTextTitle] = useState("");
  const textEditorRef = useRef<RichTextEditorHandle>(null);
  const [textDraft, setTextDraft] = useState({ html: "", text: "" });
  const [allowAutoTitleGeneration, setAllowAutoTitleGeneration] = useState(true);
  const [showGeneratingTitleHint, setShowGeneratingTitleHint] = useState(false);
  const [textDisplayMode, setTextDisplayMode] = useState<"preview" | "source" | null>(null);
  const titleRequestIdRef = useRef(0);
  const lastTitleSourceRef = useRef("");
  const hideTitleHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice tab
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRequestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // ── Live URL classification ──
  const urlClassification = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    return classifyUrl(trimmed);
  }, [url]);

  // ── Live text classification (debounced via draft state updates) ──
  const textClassification = useMemo(() => {
    const sampleText = textDraft.text || stripHtml(textDraft.html);
    if (!sampleText.trim() || sampleText.trim().length < 4) return null;
    return resolveTextSourceType(sampleText);
  }, [textDraft]);

  const selectedKnowledgeFileIsPhoto = useMemo(
    () => (file ? isKnowledgePhotoFile(file) : false),
    [file],
  );

  // Auto-init display mode when text classification changes.
  useEffect(() => {
    if (!textClassification) {
      setTextDisplayMode(null);
      return;
    }
    if (textClassification.supportsPreview) {
      setTextDisplayMode((prev) => prev ?? textClassification.defaultDisplayMode);
    } else {
      setTextDisplayMode("source");
    }
  }, [textClassification]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (hideTitleHintTimerRef.current) {
        clearTimeout(hideTitleHintTimerRef.current);
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (activeTab !== "text" || !allowAutoTitleGeneration) return;

    const draftSource = (textDraft.text || stripHtml(textDraft.html))
      .replace(/\s+/g, " ")
      .trim();
    if (draftSource.length < 16 || draftSource === lastTitleSourceRef.current) return;

    const debounceTimer = setTimeout(() => {
      const requestId = ++titleRequestIdRef.current;
      setShowGeneratingTitleHint(true);
      if (hideTitleHintTimerRef.current) {
        clearTimeout(hideTitleHintTimerRef.current);
      }

      void (async () => {
        const suggestedTitle = await suggestTitleForTextDraft(draftSource, textTitle);
        if (titleRequestIdRef.current !== requestId) return;
        if (!suggestedTitle) return;
        setTextTitle(suggestedTitle);
        lastTitleSourceRef.current = draftSource;
      })().finally(() => {
        if (titleRequestIdRef.current !== requestId) return;
        hideTitleHintTimerRef.current = setTimeout(() => {
          setShowGeneratingTitleHint(false);
        }, 700);
      });
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [activeTab, allowAutoTitleGeneration, textDraft, textTitle]);

  const upsertItem = useKnowledgeStore((s) => s.upsertItem);

  const handleSubmitUrl = async () => {
    if (!url.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await addKnowledgeFromUrl(url, {
        thumbnailStyle,
        withYouTubeTranscript:
          urlClassification?.provider === "youtube" ? withYouTubeTranscript : false,
        language,
      });
      // Optimistic insert so the user sees the new item immediately, even if
      // Supabase Realtime is unreachable. The polling loop in
      // KnowledgeLayout reconciles AI updates afterwards.
      upsertItem(created);
      toast.success(ui.addSuccess);
      closeAddModal();
    } catch {
      toast.error(ui.addUrlFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSelectedKnowledgeFile = useCallback(() => {
    cancelPendingFileUploadRef.current = false;
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleRemoveOrCancelFile = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSubmitting) {
        cancelPendingFileUploadRef.current = true;
        return;
      }
      clearSelectedKnowledgeFile();
    },
    [clearSelectedKnowledgeFile, isSubmitting],
  );

  const handleSubmitFile = async () => {
    if (!file) return;
    const preflight = clientValidateKnowledgeFileBeforeUpload(file);
    if (preflight === "VIDEO_TOO_LARGE") {
      toast.error(ui.fileVideoTooLarge);
      return;
    }
    if (preflight === "PHOTO_TOO_LARGE") {
      toast.error(ui.filePhotoTooLarge);
      return;
    }
    if (preflight === "FILE_TOO_LARGE") {
      toast.error(ui.fileTooLarge);
      return;
    }

    setIsSubmitting(true);
    cancelPendingFileUploadRef.current = false;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error(ui.uploadFailed);
      setIsSubmitting(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const contentType =
      file.type?.trim() || guessMimeFromExtension(ext) || "application/octet-stream";

    let thumbnailStoragePath: string | undefined;

    try {
      if (isKnowledgePhotoFile(file)) {
        try {
          const thumbBlob = await compressImageForKnowledgeThumbnail(file);
          const thumbId = crypto.randomUUID();
          thumbnailStoragePath = `${user.id}/${thumbId}_thumb.jpg`;
          const { error: thumbErr } = await supabase.storage
            .from("knowledge-files")
            .upload(thumbnailStoragePath, thumbBlob, {
              contentType: "image/jpeg",
              upsert: false,
            });
          if (thumbErr) {
            console.warn("[add-knowledge] thumbnail upload failed, falling back to original:", thumbErr);
            thumbnailStoragePath = undefined;
          }
        } catch (e) {
          console.warn("[add-knowledge] thumbnail compression skipped:", e);
          thumbnailStoragePath = undefined;
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("knowledge-files")
        .upload(storagePath, file, { contentType, upsert: false });

      if (uploadError) {
        if (thumbnailStoragePath) {
          await supabase.storage.from("knowledge-files").remove([thumbnailStoragePath]);
        }
        console.error("[add-knowledge] storage upload failed:", uploadError);
        toast.error(ui.uploadFailed);
        return;
      }

      if (cancelPendingFileUploadRef.current) {
        const removePaths = [storagePath];
        if (thumbnailStoragePath) removePaths.push(thumbnailStoragePath);
        await supabase.storage.from("knowledge-files").remove(removePaths);
        toast.message(ui.uploadCancelled);
        return;
      }

      const created = await finalizeKnowledgeFileUpload({
        storagePath,
        originalFileName: file.name,
        mimeType: file.type || null,
        thumbnailStyle,
        language,
        byteSizeHint: file.size,
        thumbnailStoragePath: thumbnailStoragePath ?? null,
      });
      upsertItem(created);
      toast.success(ui.addSuccess);
      closeAddModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[add-knowledge] file knowledge failed:", err);
      if (msg === "VIDEO_TOO_LARGE") toast.error(ui.fileVideoTooLarge);
      else if (msg === "PHOTO_TOO_LARGE") toast.error(ui.filePhotoTooLarge);
      else if (msg === "FILE_TOO_LARGE") toast.error(ui.fileTooLarge);
      else toast.error(ui.uploadFailed);
    } finally {
      setIsSubmitting(false);
      cancelPendingFileUploadRef.current = false;
    }
  };

  const syncTextDraft = useCallback(() => {
    const html = textEditorRef.current?.getHtml()?.trim() ?? "";
    const text = textEditorRef.current?.getText()?.trim() ?? "";
    const next = { html, text };
    setTextDraft(next);
    return next;
  }, []);

  const isTextDraftSubmittable = useCallback(() => {
    const hasMediaOnly = /<img\b/i.test(textDraft.html);
    return Boolean(textTitle.trim()) || Boolean(textDraft.text) || hasMediaOnly;
  }, [textDraft, textTitle]);

  const handleSubmitText = useCallback(async () => {
    const draft = syncTextDraft();
    const hasMediaOnly = /<img\b/i.test(draft.html);
    if (!textTitle.trim() && !draft.text && !hasMediaOnly) return;

    setIsSubmitting(true);
    try {
      const html = textEditorRef.current?.getHtml()?.trim() ?? draft.html;
      const visibleText = textEditorRef.current?.getText()?.trim() ?? draft.text;
      const codeSource = textEditorRef.current?.getCodeSource?.()?.trim() ?? visibleText;

      // Authoritative classification on submit uses the actual code source,
      // not just the visible text (so large code blocks classify correctly).
      const classifyInput = codeSource || visibleText;
      const cls = classifyKnowledgeInput(classifyInput);
      const storageText = cls.sourceType === "plain_text" ? (html || visibleText) : codeSource;
      const aiInput = visibleText || stripHtml(html);

      const created = await addKnowledgeFromText(textTitle, storageText, {
        thumbnailStyle,
        sourceType: cls.sourceType,
        displayModeDefault: textDisplayMode ?? cls.defaultDisplayMode,
        richHtml: html,
        aiInputText: aiInput,
        language,
      });
      upsertItem(created);
      toast.success(ui.addSuccess);
      closeAddModal();
    } catch (e) {
      console.error("[add-knowledge] note failed:", e);
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" &&
              e !== null &&
              "message" in e &&
              typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : ui.addNoteFallbackFailed;
      toast.error(msg.length > 220 ? `${msg.slice(0, 220)}…` : msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    closeAddModal,
    syncTextDraft,
    textDisplayMode,
    textTitle,
    thumbnailStyle,
    ui.addNoteFallbackFailed,
    ui.addSuccess,
    language,
    upsertItem,
  ]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setTranscript("");
      setAudioBlob(null);
      setIsTranscribing(false);
      transcriptRequestIdRef.current += 1;
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          setAudioPreviewUrl(URL.createObjectURL(blob));
          const requestId = ++transcriptRequestIdRef.current;
          setIsTranscribing(true);
          void (async () => {
            try {
              const formData = new FormData();
              formData.set("audio", blob, "recording.webm");
              const autoTranscript = await transcribeVoiceMemo(formData);
              if (transcriptRequestIdRef.current === requestId) {
                setTranscript(autoTranscript.trim());
              }
            } catch {
              toast.error(ui.autoTranscriptionFailed);
            } finally {
              if (transcriptRequestIdRef.current === requestId) {
                setIsTranscribing(false);
              }
            }
          })();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error(ui.microphoneAccessDenied);
    }
  }, [audioPreviewUrl, ui.autoTranscriptionFailed, ui.microphoneAccessDenied]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleSubmitVoice = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.set("audio", audioBlob, "recording.webm");
      }
      formData.set("transcript", transcript);
      formData.set("thumbnailStyle", thumbnailStyle);
      formData.set("language", language);
      const created = await addKnowledgeFromVoice(formData);
      upsertItem(created);
      toast.success(ui.addSuccess);
      closeAddModal();
    } catch {
      toast.error(ui.addVoiceMemoFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Dialog open onOpenChange={(open) => !open && closeAddModal()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{ui.title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
          <TabsList className="w-full min-w-0">
            <TabsTrigger value="url" className="flex-1 gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ui.tabUrl}</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1 gap-1.5">
              <FileUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ui.tabFile}</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1 gap-1.5">
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ui.tabText}</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex-1 gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ui.tabVoice}</span>
            </TabsTrigger>
          </TabsList>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{ui.urlLabel}</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={ui.urlPlaceholder}
                type="url"
              />
              {urlClassification ? (
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {ui.detectedBadgePrefix}
                  </span>
                  <SourceTypeBadge
                    sourceType={urlClassification.sourceType}
                    labelOverride={urlClassification.label}
                    size="sm"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">✦ {ui.autoDetectBlurb}</p>
              )}
            </div>

            {urlClassification?.provider === "youtube" ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={withYouTubeTranscript}
                    onChange={(e) => setWithYouTubeTranscript(e.target.checked)}
                  />
                  <span className="flex-1 space-y-1">
                    <span className="block font-medium">{ui.youtubeTranscriptLabel}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ui.youtubeTranscriptHint}
                    </span>
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  {ui.youtubeTranscriptOptional}
                </p>
              </div>
            ) : urlClassification?.category === "social_media" ? (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                  "border-emerald-700/90 bg-emerald-950 text-emerald-50",
                  "shadow-sm shadow-emerald-950/40",
                )}
              >
                <Lightbulb
                  className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5"
                  aria-hidden
                />
                <p className="text-sm font-medium leading-snug">{ui.socialAiEmbedNotice}</p>
              </div>
            ) : urlClassification?.sourceType === "github_repository" ? (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{ui.githubRepoHint}</p>
              </div>
            ) : null}

            {isYouTubePageUrl(url) ? (
              <p className="text-xs text-muted-foreground">{ui.youtubeThumbnailHint}</p>
            ) : urlClassification?.category === "social_media" ? null : (
              <ThumbnailStylePicker
                value={thumbnailStyle}
                onChange={setThumbnailStyle}
                i18n={{
                  sectionTitle: knowledgeUi.thumbnailStyleSectionTitle,
                  naCardTitle: knowledgeUi.thumbnailStyleNaCardTitle,
                  naCardSubtitle: knowledgeUi.thumbnailStyleNaCardSubtitle,
                  styleLabels: knowledgeUi.thumbnailStyleLabels,
                }}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeAddModal}>
                {ui.cancel}
              </Button>
              <Button onClick={handleSubmitUrl} disabled={!url.trim() || isSubmitting}>
                {isSubmitting ? ui.processing : ui.process}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* File Tab */}
          <TabsContent value="file" className="space-y-4 mt-4">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg min-h-[120px] flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer px-4 py-6",
                isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
              onDragEnter={handleDragEnter}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label={ui.uploadFileAria}
            >
              {(file || isSubmitting) && (
                <button
                  type="button"
                  onClick={handleRemoveOrCancelFile}
                  className={cn(
                    "absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full",
                    "bg-destructive text-destructive-foreground shadow-sm",
                    "hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={ui.removeFileFromDropzoneAria}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
              <Upload className="h-6 w-6 text-muted-foreground shrink-0" />
              {file ? (
                <span className="text-sm font-medium text-center break-all line-clamp-2 px-2">
                  {file.name}
                </span>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground text-center">
                    {ui.dropFileOrBrowse}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    {ui.supportedFileFormats}
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={KNOWLEDGE_FILE_INPUT_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {!selectedKnowledgeFileIsPhoto ? (
              <ThumbnailStylePicker
                value={thumbnailStyle}
                onChange={setThumbnailStyle}
                i18n={{
                  sectionTitle: knowledgeUi.thumbnailStyleSectionTitle,
                  naCardTitle: knowledgeUi.thumbnailStyleNaCardTitle,
                  naCardSubtitle: knowledgeUi.thumbnailStyleNaCardSubtitle,
                  styleLabels: knowledgeUi.thumbnailStyleLabels,
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">{ui.photoThumbnailUsesUploadHint}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeAddModal}>
                {ui.cancel}
              </Button>
              <Button onClick={handleSubmitFile} disabled={!file || isSubmitting}>
                {isSubmitting ? ui.uploading : ui.upload}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium text-foreground">{ui.quickTipTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ui.quickTipDescription}</p>
            </div>

            <div className="space-y-2">
              <Label>{ui.titleLabel}</Label>
              <Input
                value={textTitle}
                onChange={(e) => {
                  setTextTitle(e.target.value);
                  setAllowAutoTitleGeneration(false);
                  titleRequestIdRef.current += 1;
                  setShowGeneratingTitleHint(false);
                }}
                placeholder={ui.titlePlaceholder}
              />
              {showGeneratingTitleHint && (
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2 py-1 text-xs text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>{ui.generatingTitle}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{ui.contentLabel}</Label>
              <RichTextEditor
                ref={textEditorRef}
                initialHtml=""
                placeholder={ui.contentPlaceholder}
                minHeightClass="min-h-[180px]"
                onChange={syncTextDraft}
              />
              {textClassification && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide text-[11px]">
                    {ui.detectedBadgePrefix}
                  </span>
                  <SourceTypeBadge
                    sourceType={textClassification.sourceType}
                    labelOverride={textClassification.label}
                    size="xs"
                  />
                </div>
              )}
            </div>

            {textClassification?.supportsPreview && (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-sm font-medium">{ui.displayModeLabel}</p>
                <div className="inline-flex rounded-md border border-border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setTextDisplayMode("preview")}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-medium transition-colors",
                      textDisplayMode === "preview"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {ui.displayModePreview}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextDisplayMode("source")}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-medium transition-colors",
                      textDisplayMode === "source"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {ui.displayModeSource}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {textDisplayMode === "preview"
                    ? ui.displayModeHelpPreview
                    : ui.displayModeHelpSource}
                </p>
              </div>
            )}

            <ThumbnailStylePicker
              value={thumbnailStyle}
              onChange={setThumbnailStyle}
              i18n={{
                sectionTitle: knowledgeUi.thumbnailStyleSectionTitle,
                naCardTitle: knowledgeUi.thumbnailStyleNaCardTitle,
                naCardSubtitle: knowledgeUi.thumbnailStyleNaCardSubtitle,
                styleLabels: knowledgeUi.thumbnailStyleLabels,
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={closeAddModal}>
                {ui.cancel}
              </Button>
              <Button
                onClick={handleSubmitText}
                disabled={!isTextDraftSubmittable() || isSubmitting}
              >
                {isSubmitting ? ui.adding : ui.addNote}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Voice Tab */}
          <TabsContent value="voice" className="space-y-4 mt-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <button
                className={cn(
                  "h-20 w-20 rounded-full flex items-center justify-center transition-all",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-primary text-primary-foreground hover:scale-105",
                )}
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? ui.stopRecording : ui.startRecording}
                disabled={isSubmitting}
              >
                {isRecording ? <Square className="h-7 w-7" /> : <Mic className="h-8 w-8" />}
              </button>
              <span className="text-sm text-muted-foreground">
                {isRecording
                  ? ui.recording(formatTime(recordingTime))
                  : audioBlob
                    ? ui.recorded(formatTime(recordingTime))
                    : ui.tapToRecord}
              </span>
            </div>

            {audioPreviewUrl && (
              <div className="space-y-2">
                <Label>{ui.previewLabel}</Label>
                <audio controls src={audioPreviewUrl} className="w-full" />
              </div>
            )}

            {(audioBlob || transcript || isTranscribing) && (
              <div className="space-y-2">
                <Label>{ui.transcriptLabel}</Label>
                {isTranscribing && (
                  <p className="text-xs text-muted-foreground">{ui.transcriptPending}</p>
                )}
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={ui.transcriptPlaceholder}
                  className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>
            )}

            <ThumbnailStylePicker
              value={thumbnailStyle}
              onChange={setThumbnailStyle}
              i18n={{
                sectionTitle: knowledgeUi.thumbnailStyleSectionTitle,
                naCardTitle: knowledgeUi.thumbnailStyleNaCardTitle,
                naCardSubtitle: knowledgeUi.thumbnailStyleNaCardSubtitle,
                styleLabels: knowledgeUi.thumbnailStyleLabels,
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={closeAddModal}>
                {ui.cancel}
              </Button>
              <Button
                onClick={handleSubmitVoice}
                disabled={
                  isRecording || isTranscribing || (!audioBlob && !transcript.trim()) || isSubmitting
                }
              >
                {isSubmitting ? ui.adding : ui.addVoiceMemo}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Re-export preview-detection helpers so callers that need to sanity-check
// the text tab elsewhere can use the same classifier source of truth.
export { classifyKnowledgeInput, detectCodeLanguage, looksLikeSourceCode, supportsPreview };
