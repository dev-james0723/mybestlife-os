"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { fetchIdeaAiEnrich } from "@/lib/ideas/fetchIdeaAiEnrich";
import { fetchIdeaAutoEnrich } from "@/lib/ideas/fetchIdeaAutoEnrich";
import { fetchIdeaCardVisual } from "@/lib/ideas/fetchIdeaCardVisual";
import { fetchIdeaDraftMetadata } from "@/lib/ideas/fetchIdeaDraftMetadata";
import {
  fetchIdeaDraftVisual,
  type IdeaDraftVisualResult,
} from "@/lib/ideas/fetchIdeaDraftVisual";
import { fallbackIdeaTitleFromPlain } from "@/lib/ideas/clamp-idea-title";
import { stripHtml } from "@/lib/utils/html";
import { useCreateIdea } from "@/hooks/use-ideas";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useKnowledgeItemsPickList } from "@/hooks/use-knowledge-items-pick";
import { useIdeasStore } from "@/stores/ideas-store";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy, ideaDestinationLabel } from "@/lib/i18n/ideas-ui";
import { IDEA_CATEGORIES, IDEA_DESTINATION_OPTIONS } from "@/lib/ideas/constants";
import type { Idea } from "@/types/database";

export function AddIdeaModal() {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const open = useIdeasStore((s) => s.isAddModalOpen);
  const closeAddModal = useIdeasStore((s) => s.closeAddModal);
  const upsertIdea = useIdeasStore((s) => s.upsertIdea);
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const { data: knowledgeRows } = useKnowledgeItemsPickList();
  const createIdea = useCreateIdea();

  const editorRef = useRef<RichTextEditorHandle>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Idea["status"]>("captured");
  const [sourceType, setSourceType] = useState<Idea["source_type"]>("text");
  const [captureKind, setCaptureKind] = useState<Idea["capture_kind"]>("idea");
  const [category, setCategory] = useState<string>("random");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [linkedKnowledgeIds, setLinkedKnowledgeIds] = useState<string[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [draftVisual, setDraftVisual] = useState<IdeaDraftVisualResult | null>(null);
  const [draftVisualError, setDraftVisualError] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const userEditedAiRef = useRef(false);
  const userEditedMetadataRef = useRef(false);
  const enrichAbortRef = useRef<AbortController | null>(null);
  const metadataAbortRef = useRef<AbortController | null>(null);
  const visualAbortRef = useRef<AbortController | null>(null);
  const visualContentKeyRef = useRef("");

  const reset = useCallback(() => {
    enrichAbortRef.current?.abort();
    metadataAbortRef.current?.abort();
    visualAbortRef.current?.abort();
    enrichAbortRef.current = null;
    metadataAbortRef.current = null;
    visualAbortRef.current = null;
    setTitle("");
    setSummary("");
    setStatus("captured");
    setSourceType("text");
    setCaptureKind("idea");
    setCategory("random");
    setVoiceTranscript("");
    setDestinations([]);
    setLinkedProjectIds([]);
    setLinkedTaskIds([]);
    setLinkedKnowledgeIds([]);
    setAiLoading(false);
    setMetadataLoading(false);
    setVisualLoading(false);
    setDraftVisual(null);
    setDraftVisualError(null);
    userEditedAiRef.current = false;
    userEditedMetadataRef.current = false;
    visualContentKeyRef.current = "";
    setEditorRevision(0);
    setEditorKey((k) => k + 1);
    editorRef.current?.reset();
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      closeAddModal();
      reset();
    }
  };

  const bumpEditor = useCallback(() => setEditorRevision((n) => n + 1), []);

  useEffect(() => {
    if (!open) return;
    enrichAbortRef.current?.abort();
    const controller = new AbortController();
    enrichAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      const html = editorRef.current?.getHtml() ?? "";
      const plain = stripHtml(html).trim();

      if (plain.length < 8) {
        if (!userEditedAiRef.current) {
          setTitle("");
          setSummary("");
        }
        setAiLoading(false);
        return;
      }
      setAiLoading(true);
      try {
        const { title: t, summary: s } = await fetchIdeaAiEnrich({
          contentHtml: html,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!userEditedAiRef.current) {
          setTitle(t);
          setSummary(s);
        }
      } catch (e) {
        if ((e as DOMException | undefined)?.name === "AbortError") return;
        if (!userEditedAiRef.current) {
          setTitle(fallbackIdeaTitleFromPlain(plain));
          setSummary("");
        }
      } finally {
        if (!controller.signal.aborted) setAiLoading(false);
      }
    }, 1300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, editorRevision, ui.couldNotAiEnrich]);

  useEffect(() => {
    if (!open || userEditedMetadataRef.current) return;
    metadataAbortRef.current?.abort();
    const controller = new AbortController();
    metadataAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      const html = editorRef.current?.getHtml() ?? "";
      const plain = stripHtml(html).trim();
      if (plain.length < 8) {
        setMetadataLoading(false);
        return;
      }
      setMetadataLoading(true);
      try {
        const metadata = await fetchIdeaDraftMetadata({
          contentHtml: html,
          existingKind: captureKind,
          existingSourceType: sourceType,
          signal: controller.signal,
        });
        if (controller.signal.aborted || userEditedMetadataRef.current) return;
        if (metadata.category) setCategory(metadata.category);
        if (metadata.captureKind) setCaptureKind(metadata.captureKind);
        if (metadata.sourceType) setSourceType(metadata.sourceType);
        setDestinations(metadata.destinations);
        setLinkedProjectIds(metadata.linkedProjectIds);
        setLinkedTaskIds(metadata.linkedTaskIds);
        setLinkedKnowledgeIds(metadata.linkedKnowledgeIds);
      } catch (e) {
        if ((e as DOMException | undefined)?.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setMetadataLoading(false);
      }
    }, 1500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, editorRevision, captureKind, sourceType]);

  useEffect(() => {
    if (!open) return;
    visualAbortRef.current?.abort();
    const controller = new AbortController();
    visualAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      const html = editorRef.current?.getHtml() ?? "";
      const plain = stripHtml(html).trim();
      const key = `${plain.slice(0, 800)}::${title.trim()}::${summary.trim()}`;
      if (plain.length < 8) {
        setDraftVisual(null);
        setDraftVisualError(null);
        setVisualLoading(false);
        visualContentKeyRef.current = "";
        return;
      }
      if (visualContentKeyRef.current === key && draftVisual) return;
      visualContentKeyRef.current = key;
      setVisualLoading(true);
      setDraftVisualError(null);
      try {
        const visual = await fetchIdeaDraftVisual({
          contentHtml: html,
          title,
          summary,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setDraftVisual(visual);
      } catch (e) {
        if ((e as DOMException | undefined)?.name === "AbortError") return;
        setDraftVisualError(ui.visualPreviewFailed);
      } finally {
        if (!controller.signal.aborted) setVisualLoading(false);
      }
    }, 1800);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, editorRevision, title, summary, draftVisual, ui.visualPreviewFailed]);

  const markMetadataEdited = () => {
    userEditedMetadataRef.current = true;
    metadataAbortRef.current?.abort();
    setMetadataLoading(false);
  };

  const toggleDestination = (v: string) => {
    markMetadataEdited();
    setDestinations((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  };

  const toggleProject = (id: string) => {
    markMetadataEdited();
    setLinkedProjectIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };
  const toggleTask = (id: string) => {
    markMetadataEdited();
    setLinkedTaskIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };
  const toggleKnowledge = (id: string) => {
    markMetadataEdited();
    setLinkedKnowledgeIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };

  const handleSave = async () => {
    const html = editorRef.current?.getHtml() ?? "";
    const text = editorRef.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return;
    const plain = stripHtml(html).trim();
    const resolvedTitle = title.trim() || fallbackIdeaTitleFromPlain(plain) || null;
    const resolvedSummary = summary.trim() || null;
    try {
      const created = await createIdea.mutateAsync({
        content: html.trim() || text,
        title: resolvedTitle,
        ai_suggestions: resolvedSummary ? { summary: resolvedSummary } : null,
        status,
        source_type: sourceType,
        capture_kind: captureKind,
        category,
        voice_transcript: sourceType === "voice" ? voiceTranscript.trim() || null : null,
        manual_tags: [],
        destinations,
        linked_project_ids: linkedProjectIds,
        linked_task_ids: linkedTaskIds,
        linked_knowledge_item_ids: linkedKnowledgeIds,
      });
      upsertIdea(created);
      void fetchIdeaAutoEnrich({ ideaId: created.id, includeVisual: true })
        .then(upsertIdea)
        .catch((err) => {
          console.warn("[ideas/add] auto-enrich failed:", err instanceof Error ? err.message : String(err));
          void fetchIdeaCardVisual({ ideaId: created.id })
            .then(upsertIdea)
            .catch((e2) => {
              console.warn(
                "[ideas/add] card-visual fallback failed:",
                e2 instanceof Error ? e2.message : String(e2),
              );
            });
        });
      closeAddModal();
      reset();
    } catch {
      /* createIdea mutation already surfaces toast via onError */
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="5xl"
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden gap-0 p-0 sm:h-auto sm:max-h-[min(92dvh,900px)] sm:w-full sm:max-w-5xl sm:p-0"
        showCloseButton
      >
        <div className="shrink-0 border-b border-border/60 px-4 py-3 pr-14 sm:px-5 sm:py-4">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-base">{ui.addModalTitle}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:gap-6">
            <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{ui.visualPreviewSection}</Label>
                {visualLoading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {ui.visualPreviewGenerating}
                  </span>
                ) : draftVisual ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {ui.geminiHint}
                  </span>
                ) : null}
              </div>
              <div className="relative flex aspect-[4/3] max-h-[260px] min-h-[150px] w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                {draftVisual?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- draft data URL preview from Gemini/SVG fallback
                  <img
                    src={draftVisual.imageUrl}
                    alt=""
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-sky-200/80 via-rose-100/50 to-blue-300/70 text-sky-900/70 dark:from-slate-800 dark:via-violet-950/40 dark:to-slate-900 dark:text-slate-300/80">
                    {visualLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin opacity-80" aria-hidden />
                    ) : (
                      <Sparkles className="h-5 w-5 opacity-70" aria-hidden />
                    )}
                    <span className="px-4 text-center text-[11px] font-medium leading-tight opacity-80">
                      {visualLoading ? ui.visualPreviewGenerating : ui.visualPending}
                    </span>
                  </div>
                )}
              </div>
              {draftVisualError ? (
                <p className="text-xs text-muted-foreground">{draftVisualError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{ui.contentLabel}</Label>
              <RichTextEditor
                key={editorKey}
                ref={editorRef}
                initialHtml=""
                placeholder={ui.contentPlaceholder}
                minHeightClass="min-h-[180px] sm:min-h-[220px]"
                className="min-w-0 max-w-full"
                onChange={bumpEditor}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="add-idea-title">{ui.titleLabel}</Label>
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                ) : null}
                {!aiLoading && (title || summary) ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {ui.geminiHint}
                  </span>
                ) : null}
              </div>
              <Input
                id="add-idea-title"
                value={title}
                onChange={(e) => {
                  userEditedAiRef.current = true;
                  setTitle(e.target.value);
                }}
                placeholder={ui.titlePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-idea-summary">{ui.aiSummaryLabel}</Label>
              <Textarea
                id="add-idea-summary"
                value={summary}
                readOnly
                placeholder={ui.aiSummaryPlaceholder}
                rows={3}
                className="resize-y text-sm leading-relaxed bg-muted/20"
              />
            </div>
          </div>

          <div className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
            {metadataLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/45 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {ui.metadataPrefilling}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{ui.categoryLabel}</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    if (!v) return;
                    markMetadataEdited();
                    setCategory(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IDEA_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ui.categoryLabels[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ui.statusLabel}</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v as Idea["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["captured", "reviewed", "archived"] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {ui.statusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ui.sourceLabel}</Label>
                <Select
                  value={sourceType}
                  onValueChange={(v) => {
                    if (!v) return;
                    markMetadataEdited();
                    setSourceType(v as Idea["source_type"]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{ui.sourceLabels.text}</SelectItem>
                    <SelectItem value="voice">{ui.sourceLabels.voice}</SelectItem>
                    <SelectItem value="share">{ui.sourceLabels.share}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ui.captureKindLabel}</Label>
                <Select
                  value={captureKind}
                  onValueChange={(v) => {
                    if (!v) return;
                    markMetadataEdited();
                    setCaptureKind(v as Idea["capture_kind"]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["idea", "task", "note", "goal"] as const).map((k) => (
                      <SelectItem key={k} value={k}>
                        {ui.captureKindLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sourceType === "voice" ? (
              <div className="space-y-2">
                <Label>{ui.voiceTranscriptLabel}</Label>
                <Textarea value={voiceTranscript} onChange={(e) => setVoiceTranscript(e.target.value)} rows={3} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>{ui.destinationsLabel}</Label>
              <div className="space-y-2">
                {IDEA_DESTINATION_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={destinations.includes(o.value)}
                      onCheckedChange={() => toggleDestination(o.value)}
                    />
                    <span>{ideaDestinationLabel(ui, o.labelKey)}</span>
                  </label>
                ))}
              </div>
            </div>

            {projects && projects.length > 0 ? (
              <div className="space-y-2">
                <Label>{ui.linkedProjectsLabel}</Label>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-border/50 p-2">
                  {projects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={linkedProjectIds.includes(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                <Label>{ui.linkedTasksLabel}</Label>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-border/50 p-2">
                  {tasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={linkedTaskIds.includes(t.id)} onCheckedChange={() => toggleTask(t.id)} />
                      <span className="truncate">{t.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {knowledgeRows && knowledgeRows.length > 0 ? (
              <div className="space-y-2">
                <Label>{ui.linkedKnowledgeLabel}</Label>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border/50 p-2">
                  {knowledgeRows.map((k) => (
                    <label key={k.id} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={linkedKnowledgeIds.includes(k.id)} onCheckedChange={() => toggleKnowledge(k.id)} />
                      <span className="truncate">{k.title || ui.unknownKnowledge}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-muted/10 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
            {ui.cancel}
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSave} disabled={createIdea.isPending}>
            {createIdea.isPending ? ui.saving : ui.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
