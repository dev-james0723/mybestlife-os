"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
import { Lightbulb, Plus, Pencil, Trash2 } from "lucide-react";
import { useIdeas, useCreateIdea, useUpdateIdea, useDeleteIdea } from "@/hooks/use-ideas";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { formatDateShort, formatDateTime } from "@/lib/utils/date";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { stripHtml } from "@/lib/utils/html";
import type { Idea } from "@/types/database";

const statusOptions = [
  { value: "captured", label: "Captured" },
  { value: "reviewed", label: "Reviewed" },
  { value: "archived", label: "Archived" },
];

const sourceOptions = [
  { value: "text", label: "Text" },
  { value: "voice", label: "Voice" },
];

const sortOptions = [
  { value: "created_at", label: "Date captured" },
  { value: "status", label: "Status" },
];

const ideaStatusOrder: Record<Idea["status"], number> = {
  captured: 0,
  reviewed: 1,
  archived: 2,
};

function previewContent(content: string, max = 100) {
  const line = stripHtml(content).split("\n")[0]?.trim() ?? "";
  if (line.length <= max) return line || "Untitled idea";
  return `${line.slice(0, max)}…`;
}

export default function IdeasPage() {
  const { data: ideas, isLoading } = useIdeas();
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const createIdea = useCreateIdea();
  const updateIdea = useUpdateIdea();
  const deleteIdea = useDeleteIdea();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createEditorKey, setCreateEditorKey] = useState(0);
  const createIdeaEditorRef = useRef<RichTextEditorHandle>(null);
  const editIdeaEditorRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    status: "captured" as Idea["status"],
    source_type: "text" as Idea["source_type"],
    voice_transcript: "",
    linked_project_ids: [] as string[],
    linked_task_ids: [] as string[],
  });

  const resetForm = () => {
    setForm({
      status: "captured",
      source_type: "text",
      voice_transcript: "",
      linked_project_ids: [],
      linked_task_ids: [],
    });
    createIdeaEditorRef.current?.reset();
  };

  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];
    let result = [...ideas];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          stripHtml(i.content).toLowerCase().includes(q) ||
          i.voice_transcript?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }
    result.sort((a, b) => {
      if (sortBy === "status") {
        return (ideaStatusOrder[a.status] ?? 0) - (ideaStatusOrder[b.status] ?? 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [ideas, search, statusFilter, sortBy]);

  const openCreateIdea = () => {
    resetForm();
    setCreateEditorKey((k) => k + 1);
    setShowCreate(true);
  };

  const handleFilterChange = useCallback((key: string, value: string) => {
    if (key === "status") setStatusFilter(value);
  }, []);

  const handleCreate = async () => {
    const html = createIdeaEditorRef.current?.getHtml() ?? "";
    const text = createIdeaEditorRef.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return;
    await createIdea.mutateAsync({
      content: html.trim() || text,
      status: form.status,
      source_type: form.source_type,
      voice_transcript: form.source_type === "voice" ? form.voice_transcript.trim() || null : null,
      linked_project_ids: form.linked_project_ids,
      linked_task_ids: form.linked_task_ids,
    });
    resetForm();
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!selectedIdea) return;
    const html = editIdeaEditorRef.current?.getHtml() ?? "";
    const text = editIdeaEditorRef.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return;
    const updated = await updateIdea.mutateAsync({
      id: selectedIdea.id,
      data: {
        content: html.trim() || text,
        status: form.status,
        source_type: form.source_type,
        voice_transcript: form.source_type === "voice" ? form.voice_transcript.trim() || null : null,
        linked_project_ids: form.linked_project_ids,
        linked_task_ids: form.linked_task_ids,
      },
    });
    setSelectedIdea(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedIdea) return;
    await deleteIdea.mutateAsync(selectedIdea.id);
    setSelectedIdea(null);
    setShowDeleteConfirm(false);
  };

  const openDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setForm({
      status: idea.status,
      source_type: idea.source_type,
      voice_transcript: idea.voice_transcript ?? "",
      linked_project_ids: [...idea.linked_project_ids],
      linked_task_ids: [...idea.linked_task_ids],
    });
    setIsEditing(false);
  };

  const toggleProject = (id: string) => {
    setForm((f) => ({
      ...f,
      linked_project_ids: f.linked_project_ids.includes(id)
        ? f.linked_project_ids.filter((x) => x !== id)
        : [...f.linked_project_ids, id],
    }));
  };

  const toggleTask = (id: string) => {
    setForm((f) => ({
      ...f,
      linked_task_ids: f.linked_task_ids.includes(id)
        ? f.linked_task_ids.filter((x) => x !== id)
        : [...f.linked_task_ids, id],
    }));
  };

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title="Ideas Capture"
        description="Capture thoughts and review them later"
        actions={
          <Button onClick={openCreateIdea}>
            <Plus className="h-4 w-4 mr-2" />
            Capture idea
          </Button>
        }
      >
        <FilterBar
          search={{ placeholder: "Search ideas…", value: search, onChange: setSearch }}
          filters={[{ key: "status", label: "Status", options: statusOptions, value: statusFilter }]}
          onFilterChange={handleFilterChange}
          sort={{ options: sortOptions, value: sortBy, onChange: setSortBy }}
          viewModes={["list", "grid"]}
          activeViewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {filteredIdeas.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No ideas found"
            description={
              ideas?.length === 0
                ? "Record your first spark before it fades"
                : "Try adjusting filters or search"
            }
            action={
              ideas?.length === 0
                ? { label: "Capture idea", onClick: openCreateIdea }
                : undefined
            }
          />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            }
          >
            {filteredIdeas.map((idea) => (
              <EntityCard
                key={idea.id}
                title={previewContent(idea.content)}
                subtitle={formatDateShort(idea.created_at)}
                badges={
                  <>
                    <StatusBadge variant="status" value={idea.status} />
                    <StatusBadge variant="status" value={idea.source_type} />
                  </>
                }
                onClick={() => openDetail(idea)}
              />
            ))}
          </div>
        )}
      </PageShell>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Capture idea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Content *</Label>
              <RichTextEditor
                key={createEditorKey}
                ref={createIdeaEditorRef}
                initialHtml=""
                placeholder="What is on your mind?"
                minHeightClass="min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => {
                  if (v !== null) setForm((f) => ({ ...f, status: v as Idea["status"] }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createIdea.isPending}>
                {createIdea.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SlideOverPanel
        open={!!selectedIdea}
        onClose={() => setSelectedIdea(null)}
        title={isEditing ? "Edit idea" : "Idea"}
        actions={
          !isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedIdea &&
          (isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Content *</Label>
                <RichTextEditor
                  key={`${selectedIdea.id}-edit`}
                  ref={editIdeaEditorRef}
                  initialHtml={selectedIdea.content}
                  placeholder="What is on your mind?"
                  minHeightClass="min-h-[220px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => {
                      if (v !== null) setForm((f) => ({ ...f, status: v as Idea["status"] }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
                    value={form.source_type}
                    onValueChange={(v) => {
                      if (v !== null) setForm((f) => ({ ...f, source_type: v as Idea["source_type"] }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.source_type === "voice" && (
                <div className="space-y-2">
                  <Label>Voice transcript</Label>
                  <Textarea
                    value={form.voice_transcript}
                    onChange={(e) => setForm((f) => ({ ...f, voice_transcript: e.target.value }))}
                    rows={3}
                  />
                </div>
              )}
              {projects && projects.length > 0 && (
                <div className="space-y-2">
                  <Label>Linked projects</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {projects.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.linked_project_ids.includes(p.id)}
                          onCheckedChange={() => toggleProject(p.id)}
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {tasks && tasks.length > 0 && (
                <div className="space-y-2">
                  <Label>Linked tasks</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {tasks.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={form.linked_task_ids.includes(t.id)}
                          onCheckedChange={() => toggleTask(t.id)}
                        />
                        <span className="truncate">{t.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updateIdea.isPending}>
                  {updateIdea.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant="status" value={selectedIdea.status} />
                <StatusBadge variant="status" value={selectedIdea.source_type} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Content</p>
                <RichTextReadOnly value={selectedIdea.content} empty="No content." />
              </div>
              {selectedIdea.source_type === "voice" && selectedIdea.voice_transcript && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Transcript</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedIdea.voice_transcript}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Captured</p>
                  <p>{formatDateTime(selectedIdea.created_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Updated</p>
                  <p>{formatDateTime(selectedIdea.updated_at)}</p>
                </div>
              </div>
              {(selectedIdea.linked_project_ids.length > 0 || selectedIdea.linked_task_ids.length > 0) && (
                <>
                  <Separator />
                  <div className="space-y-3 text-sm">
                    {selectedIdea.linked_project_ids.length > 0 && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Projects</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {selectedIdea.linked_project_ids.map((pid) => {
                            const name = projects?.find((p) => p.id === pid)?.name ?? pid;
                            return <li key={pid}>{name}</li>;
                          })}
                        </ul>
                      </div>
                    )}
                    {selectedIdea.linked_task_ids.length > 0 && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Tasks</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {selectedIdea.linked_task_ids.map((tid) => {
                            const title = tasks?.find((t) => t.id === tid)?.title ?? tid;
                            return <li key={tid}>{title}</li>;
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
      </SlideOverPanel>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete idea</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the idea permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
