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
import { fallbackIdeaTitleFromPlain } from "@/lib/ideas/clamp-idea-title";
import { ideaOverviewFromContent } from "@/lib/ideas/idea-overview";
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
  const [editorRevision, setEditorRevision] = useState(0);
  const userEditedAiRef = useRef(false);
  const enrichAbortRef = useRef<AbortController | null>(null);
  /** Latest AI enrichment fields not shown as editable inputs (saved on submit). */
  const aiFieldsRef = useRef<{
    overview: string;
    coreInsight: string;
    suggestedNextStep: string;
    aiTags: string[];
    visualSubject: string;
    source: "gemini" | "fallback";
  } | null>(null);

  const reset = useCallback(() => {
    enrichAbortRef.current?.abort();
    enrichAbortRef.current = null;
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
    userEditedAiRef.current = false;
    aiFieldsRef.current = null;
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
      const localOverview = ideaOverviewFromContent(html, 600);
      // Instant placeholder until the AI summary arrives.
      if (!userEditedAiRef.current) setSummary(localOverview);

      if (plain.length < 12) {
        if (!userEditedAiRef.current) setTitle("");
        aiFieldsRef.current = null;
        setAiLoading(false);
        return;
      }
      setAiLoading(true);
      try {
        const result = await fetchIdeaAiEnrich({
          contentHtml: html,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        aiFieldsRef.current = {
          overview: result.overview || localOverview,
          coreInsight: result.coreInsight,
          suggestedNextStep: result.suggestedNextStep,
          aiTags: result.aiTags,
          visualSubject: result.visualSubject,
          source: result.source,
        };
        if (!userEditedAiRef.current) {
          if (result.title) setTitle(result.title);
          // Show the real AI overview (summary), not the raw content.
          setSummary(result.overview || localOverview);
        }
      } catch (e) {
        if ((e as DOMException | undefined)?.name === "AbortError") return;
        aiFieldsRef.current = {
          overview: localOverview,
          coreInsight: "",
          suggestedNextStep: "",
          aiTags: [],
          visualSubject: "",
          source: "fallback",
        };
        if (!userEditedAiRef.current) {
          setTitle(fallbackIdeaTitleFromPlain(plain));
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

  const toggleDestination = (v: string) => {
    setDestinations((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  };

  const toggleProject = (id: string) => {
    setLinkedProjectIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };
  const toggleTask = (id: string) => {
    setLinkedTaskIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };
  const toggleKnowledge = (id: string) => {
    setLinkedKnowledgeIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };

  const handleSave = async () => {
    const html = editorRef.current?.getHtml() ?? "";
    const text = editorRef.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return;
    const plain = stripHtml(html).trim();
    const ai = aiFieldsRef.current;
    const overview = ai?.overview || ideaOverviewFromContent(html, 600);
    const resolvedTitle = title.trim() || fallbackIdeaTitleFromPlain(plain) || null;
    const aiSuggestions =
      overview || ai?.coreInsight || ai?.suggestedNextStep
        ? {
            summary: overview || undefined,
            coreInsight: ai?.coreInsight || undefined,
            suggestedNextStep: ai?.suggestedNextStep || undefined,
            cardVisual: ai?.visualSubject
              ? { prompt: ai.visualSubject, status: "queued" as const }
              : undefined,
            generatedAt: new Date().toISOString(),
          }
        : null;
    try {
      const created = await createIdea.mutateAsync({
        content: html.trim() || text,
        title: resolvedTitle,
        ai_suggestions: aiSuggestions,
        ai_tags: ai?.aiTags ?? [],
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
        className="flex max-h-[min(92dvh,900px)] flex-col gap-0 p-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh]"
        showCloseButton
      >
        <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-base">{ui.addModalTitle}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{ui.contentLabel}</Label>
              <RichTextEditor
                key={editorKey}
                ref={editorRef}
                initialHtml=""
                placeholder={ui.contentPlaceholder}
                minHeightClass="min-h-[220px]"
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

          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{ui.categoryLabel}</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
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
                <Select value={sourceType} onValueChange={(v) => v && setSourceType(v as Idea["source_type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{ui.sourceLabels.text}</SelectItem>
                    <SelectItem value="voice">{ui.sourceLabels.voice}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ui.captureKindLabel}</Label>
                <Select value={captureKind} onValueChange={(v) => v && setCaptureKind(v as Idea["capture_kind"])}>
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

        <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 bg-muted/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {ui.cancel}
          </Button>
          <Button onClick={handleSave} disabled={createIdea.isPending}>
            {createIdea.isPending ? ui.saving : ui.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
