"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { typeColors, type ThumbnailStyle } from "@/types/knowledge";
import {
  regenerateThumbnail,
  refreshYoutubeThumbnail,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  retryProcessing,
  generateYouTubeKnowledgeTranscript,
} from "@/lib/knowledge/mutations";
import { KnowledgeYoutubeChatDialog } from "./KnowledgeYoutubeChatDialog";
import { KnowledgeDocumentChatDialog } from "./KnowledgeDocumentChatDialog";
import { KnowledgePdfViewer } from "./KnowledgePdfViewer";
import { KnowledgeWordEditor } from "./KnowledgeWordEditor";
import { ThumbnailStylePicker } from "./ThumbnailStylePicker";
import { SocialEmbed } from "./source/SocialEmbed";
import { MarkdownPreview } from "./source/MarkdownPreview";
import { CodeBlock } from "./source/CodeBlock";
import { SourceTypeBadge } from "./source/SourceTypeBadge";
import { KnowledgeThumbnailLightbox } from "./KnowledgeThumbnailLightbox";
import { FullscreenPreviewPortal } from "./source/FullscreenPreviewPortal";
import { isYouTubePageUrl } from "@/lib/knowledge/youtube";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  ExternalLink,
  Calendar,
  Sparkles,
  ImageIcon,
  Trash2,
  Link2,
  Plus,
  AlertCircle,
  RefreshCw,
  Quote,
  HelpCircle,
  CheckSquare,
  Loader2,
  Code2,
  Eye,
  Maximize2,
  X,
  Captions,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { OptimizedThumbnailImage } from "@/components/shared/OptimizedThumbnailImage";
import {
  parseKnowledgeRawContent,
  type CodeViewMode,
} from "@/lib/knowledge/code-content";
import { useAppStore } from "@/stores/app-store";
import { formatKnowledgeDate, getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { getKnowledgeUploadBadgePresentation } from "@/lib/knowledge/file-kind-presentation";
import { canOpenKnowledgeLightbox } from "@/lib/knowledge/lightbox-resolve";
import { getSourceTypeInfo } from "@/lib/knowledge/labels";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";
import { isKnowledgeDocxItem, isKnowledgePdfItem } from "@/lib/knowledge/file-path-utils";

function sanitizeHtmlForPreview(source: string): string {
  const clean = source.replace(/\u00A0/g, " ");
  if (/<!doctype html>/i.test(clean) || /<html[\s>]/i.test(clean)) return clean;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${clean}</body></html>`;
}

/** Pull past this distance (px) on the top handle to dismiss the sheet. */
const SHEET_DRAG_DISMISS_PX = 110;

export function KnowledgeDetailSheet() {
  const language = useAppStore((s) => s.language);
  const knowledgeUi = getKnowledgeUiCopy(language);
  const ui = knowledgeUi.detail;
  const selectedItemId = useKnowledgeStore((s) => s.selectedItemId);
  const items = useKnowledgeStore((s) => s.items);
  const selectItem = useKnowledgeStore((s) => s.selectItem);
  const removeItem = useKnowledgeStore((s) => s.removeItem);

  const item = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [thumbnailRegenerateOpen, setThumbnailRegenerateOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [codeViewMode, setCodeViewMode] = useState<CodeViewMode>("source");
  const [htmlFullPageOpen, setHtmlFullPageOpen] = useState(false);
  const [videoChatOpen, setVideoChatOpen] = useState(false);
  const [documentChatOpen, setDocumentChatOpen] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [sheetDragActive, setSheetDragActive] = useState(false);
  const sheetDragRef = useRef({ pointerId: -1, startY: 0 });
  const [thumbLightboxOpen, setThumbLightboxOpen] = useState(false);

  const uploadBadge = useMemo(() => {
    if (!item || item.sourceType !== "file_upload") return null;
    return getKnowledgeUploadBadgePresentation(item, knowledgeUi.uploadKindLabels);
  }, [item, knowledgeUi.uploadKindLabels]);

  const parsedRawContent = useMemo(
    () => parseKnowledgeRawContent(item?.rawContent),
    [item?.rawContent],
  );

  useEffect(() => {
    if (item) setTitleDraft(item.title);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    if (parsedRawContent.kind === "encoded-code") {
      setCodeViewMode(parsedRawContent.preferredView);
      return;
    }
    setCodeViewMode("source");
  }, [item, parsedRawContent]);

  useEffect(() => {
    setHtmlFullPageOpen(false);
    setThumbnailRegenerateOpen(false);
    setThumbLightboxOpen(false);
  }, [item?.id]);

  useEffect(() => {
    setSheetDragY(0);
    setSheetDragActive(false);
  }, [item?.id]);

  useEffect(() => {
    if (!htmlFullPageOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setHtmlFullPageOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [htmlFullPageOpen]);

  const handleTitleBlur = useCallback(async () => {
    setEditingTitle(false);
    if (!item || titleDraft.trim() === item.title) return;
    try {
      await updateKnowledgeItem(item.id, { title: titleDraft.trim() });
    } catch {
      toast.error(ui.updateTitleFailed);
    }
  }, [item, titleDraft, ui.updateTitleFailed]);

  const handleAddTag = useCallback(async () => {
    if (!item || !newTag.trim()) return;
    const updated = [...item.manualTags, newTag.trim()];
    try {
      await updateKnowledgeItem(item.id, { manual_tags: updated });
      setNewTag("");
    } catch {
      toast.error(ui.addTagFailed);
    }
  }, [item, newTag, ui.addTagFailed]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!item) return;
      const updatedAi = item.aiTags.filter((t) => t !== tag);
      const updatedManual = item.manualTags.filter((t) => t !== tag);
      try {
        await updateKnowledgeItem(item.id, {
          ai_tags: updatedAi,
          manual_tags: updatedManual,
        });
      } catch {
        toast.error(ui.removeTagFailed);
      }
    },
    [item, ui.removeTagFailed],
  );

  const handleRegenerate = useCallback(
    async (style: ThumbnailStyle) => {
      if (!item) return;
      setThumbnailRegenerateOpen(false);
      setRegenerating(true);
      try {
        await regenerateThumbnail(item.id, style);
        toast.success(ui.thumbnailRegenerated);
      } catch {
        toast.error(ui.regenerateFailed);
      } finally {
        setRegenerating(false);
      }
    },
    [item, ui.regenerateFailed, ui.thumbnailRegenerated],
  );

  const handleRefreshYoutubeThumb = useCallback(async () => {
    if (!item) return;
    setRegenerating(true);
    try {
      await refreshYoutubeThumbnail(item.id);
      toast.success(ui.youtubeThumbnailUpdated);
    } catch {
      toast.error(ui.refreshThumbnailFailed);
    } finally {
      setRegenerating(false);
    }
  }, [item, ui.refreshThumbnailFailed, ui.youtubeThumbnailUpdated]);

  const handleGenerateTranscript = useCallback(async () => {
    if (!item || transcriptLoading) return;
    setTranscriptLoading(true);
    try {
      await generateYouTubeKnowledgeTranscript(item.id);
      toast.success(ui.transcriptSavedToast);
    } catch (e) {
      const msg = e instanceof Error ? e.message : ui.transcriptFailed;
      toast.error(msg);
    } finally {
      setTranscriptLoading(false);
    }
  }, [item, transcriptLoading, ui.transcriptFailed, ui.transcriptSavedToast]);

  const handleRetry = useCallback(async () => {
    if (!item || retrying) return;
    setRetrying(true);
    try {
      await retryProcessing(item.id);
      toast.success(ui.retryingAiProcessing);
    } catch {
      toast.error(ui.retryFailed);
    } finally {
      setRetrying(false);
    }
  }, [item, retrying, ui.retryFailed, ui.retryingAiProcessing]);

  const handleDelete = useCallback(async () => {
    if (!item || deleting) return;
    const id = item.id;
    setDeleting(true);
    try {
      await deleteKnowledgeItem(id);
      removeItem(id);
      setShowDelete(false);
      selectItem(null);
      toast.success(ui.itemDeleted);
    } catch (e) {
      console.error("[knowledge] delete item failed:", e);
      toast.error(ui.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }, [item, deleting, removeItem, selectItem, ui.deleteFailed, ui.itemDeleted]);

  const endSheetHandleDrag = useCallback(
    (target: HTMLElement | null, pointerId: number) => {
      if (sheetDragRef.current.pointerId !== pointerId) return;
      sheetDragRef.current.pointerId = -1;
      setSheetDragActive(false);
      if (target?.hasPointerCapture?.(pointerId)) {
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
      }
    },
    [],
  );

  const onSheetHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    sheetDragRef.current = { pointerId: e.pointerId, startY: e.clientY };
    setSheetDragActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onSheetHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (sheetDragRef.current.pointerId !== e.pointerId) return;
    const dy = e.clientY - sheetDragRef.current.startY;
    setSheetDragY(Math.max(0, dy));
  }, []);

  const onSheetHandlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (sheetDragRef.current.pointerId !== e.pointerId) return;
      const y = Math.max(0, e.clientY - sheetDragRef.current.startY);
      endSheetHandleDrag(e.currentTarget, e.pointerId);
      if (y >= SHEET_DRAG_DISMISS_PX) {
        selectItem(null);
        return;
      }
      setSheetDragY(0);
    },
    [endSheetHandleDrag, selectItem],
  );

  const onSheetHandlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (sheetDragRef.current.pointerId !== e.pointerId) return;
      endSheetHandleDrag(e.currentTarget, e.pointerId);
      setSheetDragY(0);
    },
    [endSheetHandleDrag],
  );

  if (!item) return null;

  const colors = typeColors[item.contentType];
  const allTags = [...item.aiTags, ...item.manualTags];
  const sourceIsYoutube = item.sourceUrl
    ? isYouTubePageUrl(item.sourceUrl)
    : false;
  const sourceIsSocialEmbed =
    item.category === "social_media" && Boolean(item.embedHtml);

  const suppressExtractedContent =
    Boolean(item.rawContent) &&
    item.category !== "social_media" &&
    (isKnowledgePdfItem(item) || isKnowledgeDocxItem(item));

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && selectItem(null)}>
        <SheetContent
          side="bottom-card"
          showCloseButton={false}
          className={cn(
            // Card chrome lives on the inner layer so translateY moves the whole sheet, not only scroll content.
            "!rounded-none !border-0 !bg-transparent !shadow-none !ring-0",
            "scheme-light dark:scheme-dark",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-2xl",
              "bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10",
              "max-h-full min-h-0 will-change-transform",
            )}
            style={{
              transform: `translateY(${sheetDragY}px)`,
              transition: sheetDragActive ? "none" : "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
          {/* Drag handle + close button */}
          <div className="relative flex shrink-0 justify-center">
            <div
              role="button"
              tabIndex={0}
              aria-label={ui.dragHandleClose}
              className="flex w-full cursor-grab touch-none flex-col items-center justify-start gap-2 py-3 pb-2 active:cursor-grabbing"
              onPointerDown={onSheetHandlePointerDown}
              onPointerMove={onSheetHandlePointerMove}
              onPointerUp={onSheetHandlePointerUp}
              onPointerCancel={onSheetHandlePointerCancel}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectItem(null);
                }
              }}
            >
              <div className="h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 pointer-events-none" />
            </div>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  className="absolute top-2 right-3"
                  size="icon-sm"
                />
              }
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{ui.close}</span>
            </SheetClose>
          </div>

          {/* Scrollable body */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pr-14 min-w-0 flex-wrap">
              {item.sourceType ? (
                uploadBadge ? (
                  <SourceTypeBadge
                    info={{
                      ...getSourceTypeInfo("file_upload"),
                      label: uploadBadge.label,
                      accent: {
                        ...getSourceTypeInfo("file_upload").accent,
                        iconName: uploadBadge.iconName,
                      },
                    }}
                    size="sm"
                  />
                ) : (
                  <SourceTypeBadge
                    sourceType={item.sourceType}
                    labelOverride={item.label}
                    size="sm"
                  />
                )
              ) : (
                <Badge
                  className={cn(
                    "text-[10px] shrink-0 capitalize",
                    colors.bg,
                    colors.text,
                    colors.border,
                    colors.darkBg,
                    colors.darkText,
                  )}
                >
                  {colors.icon} {knowledgeUi.typeLabels[item.contentType]}
                </Badge>
              )}
              {item.depthIndicator && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {knowledgeUi.depthLabels[item.depthIndicator] ?? item.depthIndicator}
                </Badge>
              )}
              {item.sourceMetadata?.channel && (
                <span className="text-xs text-muted-foreground truncate">
                  {item.sourceMetadata.channel}
                </span>
              )}
              {item.sourceMetadata?.subreddit && (
                <span className="text-xs text-muted-foreground truncate">
                  {item.sourceMetadata.subreddit}
                </span>
              )}
              {item.sourceMetadata?.handle && !item.sourceMetadata?.subreddit && (
                <span className="text-xs text-muted-foreground truncate">
                  {item.sourceMetadata.handle}
                </span>
              )}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {item.sourceDomain || ui.sourceFallback}
                </a>
              )}
            </div>

            {item.extractionStatus && item.extractionStatus !== "success" && (
              <div className="mx-4 mt-2 rounded-md border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                {item.extractionStatus === "partial"
                  ? ui.extractionPartialHint
                  : ui.extractionFailedHint}
              </div>
            )}

            <div className="min-w-0 space-y-5 break-words px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,14px))] pt-2">
              {/* Title */}
              {editingTitle ? (
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
                  autoFocus
                  className="text-lg font-semibold"
                />
              ) : (
                <SheetTitle
                  className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {item.title}
                </SheetTitle>
              )}

            {/* Error state */}
            {item.status === "error" && item.errorDetails && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {ui.processingFailedAt(item.errorDetails.step)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.errorDetails.error}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={retrying}
                  onClick={handleRetry}
                >
                  {retrying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {retrying ? ui.retrying : ui.retryProcessing}
                </Button>
              </div>
            )}

            {/* Processing state */}
            {item.status === "processing" && (
              <div className="rounded-lg bg-primary/5 p-4 flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {item.processingStep || ui.processingInProgress}
                </p>
              </div>
            )}

            {/* Thumbnail / embedded social preview + regenerate */}
            <div className="space-y-2">
              {sourceIsSocialEmbed ? (
                <SocialEmbed
                  item={item}
                  unavailableLabel=""
                  className="bg-muted"
                />
              ) : item.thumbnailUrl ? (
                <div className="relative rounded-lg overflow-hidden h-[160px] bg-muted">
                  {canOpenKnowledgeLightbox(item) ? (
                    <button
                      type="button"
                      className="absolute inset-0 z-[2] cursor-zoom-in bg-transparent"
                      aria-label={knowledgeUi.lightbox.openPreview}
                      onClick={() => setThumbLightboxOpen(true)}
                    />
                  ) : null}
                  <OptimizedThumbnailImage
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="relative z-0 h-full w-full object-cover"
                    sizes="(max-width: 768px) 100vw, 560px"
                    variant="detail"
                  />
                </div>
              ) : item.thumbnailStyle === "na" ? (
                <div className="relative h-[160px] rounded-lg bg-muted px-5">
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="line-clamp-4 text-lg font-semibold leading-snug text-foreground">
                      {item.title}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "h-[160px] rounded-lg flex items-center justify-center text-4xl",
                    colors.bg,
                    colors.darkBg,
                  )}
                >
                  {colors.icon}
                </div>
              )}
              {sourceIsYoutube ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={regenerating}
                  onClick={handleRefreshYoutubeThumb}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {regenerating ? ui.updatingThumbnail : ui.refreshYoutubeThumbnail}
                </Button>
              ) : item.category === "social_media" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={retrying || item.status === "processing"}
                  onClick={() => void handleRetry()}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
                  {retrying ? ui.retrying : ui.retryProcessing}
                </Button>
              ) : (
                <Popover
                  open={thumbnailRegenerateOpen}
                  onOpenChange={setThumbnailRegenerateOpen}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={regenerating}
                        type="button"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {regenerating
                          ? ui.regeneratingThumbnail
                          : ui.regenerateThumbnail}
                      </Button>
                    }
                  />
                  <PopoverContent
                    align="start"
                    side="bottom"
                    className="w-auto max-w-[min(calc(100vw-1rem),26rem)] p-3"
                  >
                    <ThumbnailStylePicker
                      layout="scroll"
                      value={item.thumbnailStyle ?? "minimal"}
                      onChange={(style) => {
                        void handleRegenerate(style);
                      }}
                      i18n={{
                        sectionTitle: knowledgeUi.thumbnailStyleSectionTitle,
                        naCardTitle: knowledgeUi.thumbnailStyleNaCardTitle,
                        naCardSubtitle: knowledgeUi.thumbnailStyleNaCardSubtitle,
                        styleLabels: knowledgeUi.thumbnailStyleLabels,
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {item.filePath && isKnowledgePdfItem(item) ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium">{ui.pdfViewerHeading}</h4>
                  <KnowledgePdfViewer
                    src={knowledgeFilesProxyUrlFromStoragePath(item.filePath)}
                    title={item.title}
                  />
                </div>
              </>
            ) : null}

            {item.filePath && isKnowledgeDocxItem(item) ? (
              <>
                <Separator />
                <KnowledgeWordEditor item={item} copy={ui} />
              </>
            ) : null}

            {(sourceIsYoutube || item.askEnabled !== false) && (
              <div className="flex flex-wrap gap-2">
                {sourceIsYoutube && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={transcriptLoading || item.status === "processing"}
                    onClick={() => void handleGenerateTranscript()}
                  >
                    {transcriptLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Captions className="h-3.5 w-3.5" />
                    )}
                    {transcriptLoading ? ui.generatingTranscript : ui.generateTranscript}
                  </Button>
                )}
                {sourceIsYoutube ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setVideoChatOpen(true)}
                  >
                    <MessagesSquare className="h-3.5 w-3.5" />
                    {ui.askAboutVideo}
                  </Button>
                ) : (
                  item.askEnabled !== false &&
                  item.category !== "social_media" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setDocumentChatOpen(true)}
                    >
                      <MessagesSquare className="h-3.5 w-3.5" />
                      {ui.askDocument}
                    </Button>
                  )
                )}
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {sourceIsYoutube
                      ? ui.viewOnYouTube
                      : item.provider === "github"
                        ? ui.viewOnGitHub
                        : ui.viewOriginal}
                  </a>
                )}
              </div>
            )}

            {/* One-sentence summary */}
            {item.aiTldr && (
              <div className="rounded-lg bg-primary/5 px-4 py-3 space-y-1.5">
                <h4 className="text-xs font-medium text-muted-foreground">
                  {ui.oneSentenceSummary}
                </h4>
                <p className="text-sm font-medium leading-snug">{item.aiTldr}</p>
              </div>
            )}

            {/* AI Section */}
            {(item.aiSummary || item.aiKeyInsights.length > 0) && (
              <div className="rounded-lg bg-primary/5 p-4 space-y-4">
                {item.aiSummary && (
                  <div>
                    <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {ui.shortDescription}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.aiSummary}
                    </p>
                  </div>
                )}
                {item.aiContentOverview && (
                  <div>
                    <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {ui.contentOverview}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.aiContentOverview}
                    </p>
                  </div>
                )}
                {item.aiKeyInsights.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {ui.keyInsights}
                    </h4>
                    <ul className="space-y-1">
                      {item.aiKeyInsights.map((insight, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex gap-2"
                        >
                          <span className="text-primary shrink-0">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Key Quotes */}
            {item.aiKeyQuotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Quote className="h-3 w-3" />
                  {ui.keyQuotes}
                </h4>
                <div className="space-y-2">
                  {item.aiKeyQuotes.map((quote, i) => (
                    <blockquote
                      key={i}
                      className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground italic leading-relaxed"
                    >
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            {/* Questions This Answers */}
            {item.aiQuestionsAnswered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3" />
                  {ui.questionsThisAnswers}
                </h4>
                <ul className="space-y-1">
                  {item.aiQuestionsAnswered.map((q, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex gap-2"
                    >
                      <span className="text-primary shrink-0">?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {item.aiActionItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <CheckSquare className="h-3 w-3" />
                  {ui.actionItems}
                </h4>
                <ul className="space-y-1">
                  {item.aiActionItems.map((action, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex gap-2"
                    >
                      <span className="text-primary shrink-0">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sourceIsYoutube && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium flex items-center gap-1.5">
                    <Captions className="h-3 w-3" />
                    {ui.transcriptSection}
                  </h4>
                  {item.youtubeTranscript ? (
                    <div className="max-h-[40vh] overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">
                      {item.youtubeTranscript}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">{ui.transcriptEmpty}</p>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium">{ui.tags}</h4>
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs cursor-pointer group max-w-[160px] truncate"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </span>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder={ui.addTagPlaceholder}
                    className="h-6 w-24 text-xs px-2"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    aria-label={ui.addTag}
                    title={ui.addTag}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Connections */}
            {item.connections && item.connections.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium flex items-center gap-1.5">
                    <Link2 className="h-3 w-3" />
                    {ui.relatedItemsDiscovered}
                  </h4>
                  <div className="space-y-1.5">
                    {item.connections.map((conn) => {
                      const related = items.find(
                        (i) =>
                          i.id ===
                          (conn.sourceItemId === item.id
                            ? conn.targetItemId
                            : conn.sourceItemId),
                      );
                      if (!related) return null;
                      return (
                        <button
                          key={conn.id}
                          className="flex items-center gap-2 w-full rounded-md p-2 text-left hover:bg-accent transition-colors"
                          onClick={() => selectItem(related.id)}
                        >
                          <span className="text-sm">
                            {typeColors[related.contentType].icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                              {related.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {conn.reason}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Social fallback when embed HTML is unavailable */}
            {item.category === "social_media" && !item.embedHtml && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium">{ui.content}</h4>
                  <SocialEmbed
                    item={item}
                    fallbackText={item.rawContent ?? undefined}
                    unavailableLabel={ui.socialEmbedUnavailable}
                  />
                </div>
              </>
            )}

            {/* Content: code / markdown / HTML / rich text — hidden for PDF / DOCX where dedicated viewers replace extracted body */}
            {item.rawContent &&
              item.category !== "social_media" &&
              !suppressExtractedContent && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium">{ui.content}</h4>
                    {parsedRawContent.kind === "encoded-code" && (
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <Code2 className="h-3 w-3" />
                        {parsedRawContent.language}
                      </div>
                    )}
                  </div>
                  {parsedRawContent.kind === "encoded-code" ? (
                    <div className="space-y-2">
                      {parsedRawContent.supportsPreview && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex rounded-md border border-border p-1">
                            <Button
                              variant={codeViewMode === "source" ? "secondary" : "ghost"}
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => setCodeViewMode("source")}
                            >
                              <Code2 className="h-3.5 w-3.5" />
                              {ui.source}
                            </Button>
                            <Button
                              variant={codeViewMode === "preview" ? "secondary" : "ghost"}
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => setCodeViewMode("preview")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {ui.preview}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => setHtmlFullPageOpen(true)}
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            {ui.fullPage}
                          </Button>
                        </div>
                      )}
                      {parsedRawContent.supportsPreview && codeViewMode === "preview" ? (
                        parsedRawContent.language === "markdown" ? (
                          <div className="max-h-[50vh] overflow-auto rounded-md border bg-background p-4">
                            <MarkdownPreview source={parsedRawContent.source} />
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-md border bg-background">
                            <iframe
                              title={`${item.title} HTML preview`}
                              srcDoc={sanitizeHtmlForPreview(parsedRawContent.source)}
                              sandbox="allow-scripts"
                              className="h-[50vh] w-full border-0"
                            />
                          </div>
                        )
                      ) : (
                        <CodeBlock
                          source={parsedRawContent.source}
                          language={parsedRawContent.language}
                          label={parsedRawContent.language.toUpperCase()}
                        />
                      )}
                    </div>
                  ) : (
                    <RichTextReadOnly
                      value={parsedRawContent.raw}
                      className="rounded-md border bg-muted/30 p-3"
                    />
                  )}
                </div>
              </>
            )}

            {/* Dates */}
            <Separator />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {ui.added} {formatKnowledgeDate(language, item.dateAdded)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {ui.modified} {formatKnowledgeDate(language, item.dateModified)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive shrink-0"
                  onClick={() => setShowDelete(true)}
                  aria-label={ui.deleteItem}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            </div>
          </div>
          </div>
        </SheetContent>
      </Sheet>

      {item && parsedRawContent.kind === "encoded-code" && (
        <FullscreenPreviewPortal
          open={htmlFullPageOpen}
          title={item.title}
          ariaLabel={ui.fullPagePreviewAria}
          closeLabel={ui.exitPreview}
          onClose={() => setHtmlFullPageOpen(false)}
        >
          {parsedRawContent.supportsPreview && codeViewMode === "preview" ? (
            parsedRawContent.language === "markdown" ? (
              <div className="min-h-0 flex-1 overflow-auto bg-background p-4">
                <MarkdownPreview source={parsedRawContent.source} />
              </div>
            ) : (
              <iframe
                title={`${item.title} HTML preview (full page)`}
                srcDoc={sanitizeHtmlForPreview(parsedRawContent.source)}
                sandbox="allow-scripts"
                className="min-h-0 w-full flex-1 border-0"
              />
            )
          ) : (
            <pre className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4 text-xs leading-relaxed">
              <code className="font-mono whitespace-pre-wrap break-words">
                {parsedRawContent.source}
              </code>
            </pre>
          )}
        </FullscreenPreviewPortal>
      )}

      <KnowledgeYoutubeChatDialog
        item={item}
        open={videoChatOpen}
        onOpenChange={setVideoChatOpen}
        copy={ui}
      />

      <KnowledgeDocumentChatDialog
        item={item}
        open={documentChatOpen}
        onOpenChange={setDocumentChatOpen}
        copy={ui}
      />

      <KnowledgeThumbnailLightbox
        item={item}
        open={thumbLightboxOpen}
        onOpenChange={setThumbLightboxOpen}
        ui={knowledgeUi.lightbox}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {ui.deleteDescription(item.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{knowledgeUi.addModal.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? ui.deleting : ui.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
