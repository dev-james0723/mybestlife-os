"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdeasStore } from "@/stores/ideas-store";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy, ideaDestinationLabel } from "@/lib/i18n/ideas-ui";
import { useUpdateIdea, useDeleteIdea } from "@/hooks/use-ideas";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useKnowledgeItemsPickList } from "@/hooks/use-knowledge-items-pick";
import { formatDateTime } from "@/lib/utils/date";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import type { Idea } from "@/types/database";
import { IDEA_CATEGORIES, IDEA_DESTINATION_OPTIONS } from "@/lib/ideas/constants";
import { ideaAiSummary } from "@/lib/ideas/idea-helpers";
import { IdeaCategoryBadge } from "./IdeaCategoryBadge";
import { IdeaTagEditor } from "./IdeaTagEditor";
import { IdeaRelatedResources } from "./IdeaRelatedResources";
import { StatusBadge } from "@/components/shared/status-badge";

function IdeaDetailInner({
  idea,
  onClose,
}: {
  idea: Idea;
  onClose: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const upsertIdea = useIdeasStore((s) => s.upsertIdea);
  const removeIdea = useIdeasStore((s) => s.removeIdea);

  const updateIdea = useUpdateIdea();
  const deleteIdea = useDeleteIdea();
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const { data: knowledgeRows } = useKnowledgeItemsPickList();

  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => idea.title ?? "");
  const [summaryDraft, setSummaryDraft] = useState(() => ideaAiSummary(idea) ?? "");
  const [status, setStatus] = useState<Idea["status"]>(() => idea.status);
  const [sourceType, setSourceType] = useState<Idea["source_type"]>(() => idea.source_type);
  const [captureKind, setCaptureKind] = useState<Idea["capture_kind"]>(() => idea.capture_kind);
  const [category, setCategory] = useState(() => idea.category);
  const [voiceTranscript, setVoiceTranscript] = useState(() => idea.voice_transcript ?? "");
  const [manualTags, setManualTags] = useState(() => [...(idea.manual_tags ?? [])]);
  const [aiTags, setAiTags] = useState(() => [...(idea.ai_tags ?? [])]);
  const [destinations, setDestinations] = useState(() => [...(idea.destinations ?? [])]);
  const [linkedProjectIds, setLinkedProjectIds] = useState(() => [...(idea.linked_project_ids ?? [])]);
  const [linkedTaskIds, setLinkedTaskIds] = useState(() => [...(idea.linked_task_ids ?? [])]);
  const [linkedKnowledgeIds, setLinkedKnowledgeIds] = useState(() => [
    ...(idea.linked_knowledge_item_ids ?? []),
  ]);

  const editorRef = useRef<RichTextEditorHandle>(null);

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
    const updated = await updateIdea.mutateAsync({
      id: idea.id,
      data: {
        content: html.trim() || text,
        title: titleDraft.trim() || null,
        ai_suggestions: summaryDraft.trim() ? { summary: summaryDraft.trim() } : null,
        status,
        source_type: sourceType,
        capture_kind: captureKind,
        category,
        voice_transcript: sourceType === "voice" ? voiceTranscript.trim() || null : null,
        manual_tags: manualTags,
        ai_tags: aiTags,
        destinations,
        linked_project_ids: linkedProjectIds,
        linked_task_ids: linkedTaskIds,
        linked_knowledge_item_ids: linkedKnowledgeIds,
      },
    });
    upsertIdea(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteIdea.mutateAsync(idea.id);
    removeIdea(idea.id);
    onClose();
  };

  const removeAiTag = (tag: string) => {
    setAiTags((xs) => xs.filter((t) => t !== tag));
  };

  const badgeCategory = editing ? category : idea.category;
  const badgeStatus = editing ? status : idea.status;
  const badgeSource = editing ? sourceType : idea.source_type;

  return (
    <>
      <div
        className={cn(
          "mx-auto flex h-[min(92dvh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl",
          "bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10",
        )}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <IdeaCategoryBadge category={badgeCategory} language={language} />
              <StatusBadge variant="status" value={badgeStatus} />
              <StatusBadge variant="status" value={badgeSource} />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatDateTime(idea.created_at)} · {formatDateTime(idea.updated_at)}
              </span>
            </div>
            <SheetTitle className="text-left text-lg font-semibold tracking-tight">
              {editing ? (
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder={ui.titlePlaceholder}
                />
              ) : (
                idea.title?.trim() || ui.addModalTitle
              )}
            </SheetTitle>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!editing ? (
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={ui.detailEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {!editing ? (
              <Button variant="ghost" size="icon-sm" onClick={() => setShowDelete(true)} aria-label={ui.detailDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={ui.detailClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {editing ? (
            <div className="grid gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{ui.aiSummaryLabel}</Label>
                  <Textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>{ui.contentSection}</Label>
                  <RichTextEditor
                    ref={editorRef}
                    initialHtml={idea.content}
                    placeholder={ui.contentPlaceholder}
                    minHeightClass="min-h-[260px]"
                  />
                </div>
              </div>
              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="grid gap-3">
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
                <Separator />
                <IdeaTagEditor
                  language={language}
                  manualTags={manualTags}
                  aiTags={aiTags}
                  onChangeManual={setManualTags}
                  onRemoveAiTag={removeAiTag}
                />
                <Separator />
                <div className="space-y-2">
                  <Label>{ui.destinationsLabel}</Label>
                  <div className="space-y-2">
                    {IDEA_DESTINATION_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2 text-xs">
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
                    <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-md border p-2">
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
                    <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-md border p-2">
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
                    <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border p-2">
                      {knowledgeRows.map((k) => (
                        <label key={k.id} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={linkedKnowledgeIds.includes(k.id)}
                            onCheckedChange={() => toggleKnowledge(k.id)}
                          />
                          <span className="truncate">{k.title || ui.unknownKnowledge}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
              <div className="space-y-4">
                {ideaAiSummary(idea) ? (
                  <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-sm text-muted-foreground">
                    <p className="text-xs font-medium text-foreground">{ui.aiSuggestionsSection}</p>
                    <p className="mt-1 leading-relaxed">{ideaAiSummary(idea)}</p>
                  </div>
                ) : null}
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{ui.contentSection}</p>
                  <RichTextReadOnly value={idea.content} empty="—" />
                </div>
                {idea.source_type === "voice" && idea.voice_transcript ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{ui.transcriptSection}</p>
                    <p className="whitespace-pre-wrap text-sm">{idea.voice_transcript}</p>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{ui.manualTags}</p>
                  <div className="flex flex-wrap gap-1">
                    {(idea.manual_tags ?? []).map((t) => (
                      <span key={t} className="rounded-md border bg-muted/20 px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                    {(idea.manual_tags ?? []).length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{ui.aiTags}</p>
                  <div className="flex flex-wrap gap-1">
                    {(idea.ai_tags ?? []).map((t) => (
                      <span key={t} className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                    {(idea.ai_tags ?? []).length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{ui.relatedSection}</p>
                  <IdeaRelatedResources idea={idea} language={language} />
                </div>
              </div>
            </div>
          )}
        </div>

        {editing ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-5">
            <Button variant="outline" onClick={() => setEditing(false)}>
              {ui.detailCancelEdit}
            </Button>
            <Button onClick={handleSave} disabled={updateIdea.isPending}>
              {updateIdea.isPending ? ui.saving : ui.detailSave}
            </Button>
          </div>
        ) : null}
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ui.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ui.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ui.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function IdeaDetailSheet() {
  const selectedIdeaId = useIdeasStore((s) => s.selectedIdeaId);
  const setSelectedIdeaId = useIdeasStore((s) => s.setSelectedIdeaId);
  const items = useIdeasStore((s) => s.items);

  const idea = useMemo(
    () => items.find((i) => i.id === selectedIdeaId) ?? null,
    [items, selectedIdeaId],
  );

  const open = Boolean(selectedIdeaId);

  const close = useCallback(() => {
    setSelectedIdeaId(null);
  }, [setSelectedIdeaId]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="bottom-card"
        showCloseButton={false}
        className={cn(
          "!rounded-none !border-0 !bg-transparent !shadow-none !ring-0",
          "scheme-light dark:scheme-dark",
          "sm:!max-w-5xl",
        )}
      >
        {idea ? <IdeaDetailInner key={idea.id} idea={idea} onClose={close} /> : null}
      </SheetContent>
    </Sheet>
  );
}
