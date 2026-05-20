"use client";

import { useState, useMemo, useCallback, useRef, useEffect, Suspense, type MouseEvent } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
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
import { StickyNote, Plus, Pencil, Trash2, Star, ExternalLink, Calendar } from "lucide-react";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { useProjects } from "@/hooks/use-projects";
import { formatDate } from "@/lib/utils/date";
import type { Note } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { stripHtml } from "@/lib/utils/html";
import { useSearchParams } from "next/navigation";

const sortOptions = [
  { value: "updated_at", label: "Last Updated" },
  { value: "created_at", label: "Date Created" },
  { value: "title", label: "Title" },
];

const favoriteFilterOptions = [
  { value: "favorites", label: "Favorites only" },
  { value: "not_favorites", label: "Not starred" },
];

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function NotesQueryParamSync({
  notes,
  onOpen,
}: {
  notes: Note[] | undefined;
  onOpen: (n: Note) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("note")?.trim();
    if (!id || !notes?.length) return;
    const found = notes.find((n) => n.id === id);
    if (found) onOpen(found);
  }, [searchParams, notes, onOpen]);
  return null;
}

function NoteCard({
  note,
  onOpen,
  onToggleFavorite,
  favoritePending,
}: {
  note: Note;
  onOpen: () => void;
  onToggleFavorite: (e: MouseEvent<HTMLButtonElement>) => void;
  favoritePending: boolean;
}) {
  return (
    <EntityCard
      title={note.title}
      subtitle={note.category ?? undefined}
      badges={
        note.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        ) : undefined
      }
      meta={note.project?.name ?? undefined}
      onClick={onOpen}
      actions={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={favoritePending}
          onClick={(e) => onToggleFavorite(e)}
          aria-label={note.is_favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={cn(
              "h-4 w-4",
              note.is_favorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
            )}
          />
        </Button>
      }
    />
  );
}

export default function NotesPage() {
  const { data: notes, isLoading } = useNotes();
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated_at");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createEditorKey, setCreateEditorKey] = useState(0);
  const createNoteEditorRef = useRef<RichTextEditorHandle>(null);
  const editNoteEditorRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    tagsInput: "",
    project_id: "",
    is_favorite: false,
  });

  const resetForm = () => {
    setForm({
      title: "",
      category: "",
      tagsInput: "",
      project_id: "",
      is_favorite: false,
    });
    createNoteEditorRef.current?.reset();
  };

  const categoryOptions = useMemo(() => {
    if (!notes) return [];
    const set = new Set<string>();
    for (const n of notes) {
      if (n.category?.trim()) set.add(n.category.trim());
    }
    return [...set].sort().map((c) => ({ value: c, label: c }));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    let result = [...notes];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          stripHtml(n.content ?? "").toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter((n) => (n.category ?? "") === categoryFilter);
    }
    if (favoriteFilter === "favorites") {
      result = result.filter((n) => n.is_favorite);
    } else if (favoriteFilter === "not_favorites") {
      result = result.filter((n) => !n.is_favorite);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [notes, search, categoryFilter, favoriteFilter, sortBy]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    if (key === "category") setCategoryFilter(value);
    if (key === "favorite") setFavoriteFilter(value);
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const html = createNoteEditorRef.current?.getHtml() ?? "";
    const text = createNoteEditorRef.current?.getText().trim() ?? "";
    await createNote.mutateAsync({
      title: form.title,
      content: html.trim() || text || null,
      category: form.category.trim() || null,
      tags: parseTags(form.tagsInput),
      is_favorite: form.is_favorite,
      project_id: form.project_id || null,
    });
    resetForm();
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!selectedNote || !form.title.trim()) return;
    const html = editNoteEditorRef.current?.getHtml() ?? "";
    const text = editNoteEditorRef.current?.getText().trim() ?? "";
    await updateNote.mutateAsync({
      id: selectedNote.id,
      data: {
        title: form.title,
        content: html.trim() || text || null,
        category: form.category.trim() || null,
        tags: parseTags(form.tagsInput),
        is_favorite: form.is_favorite,
        project_id: form.project_id || null,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    await deleteNote.mutateAsync(selectedNote.id);
    setSelectedNote(null);
    setShowDeleteConfirm(false);
  };

  const openDetail = useCallback((note: Note) => {
    setSelectedNote(note);
    setForm({
      title: note.title,
      category: note.category ?? "",
      tagsInput: note.tags.join(", "),
      project_id: note.project_id ?? "",
      is_favorite: note.is_favorite,
    });
    setIsEditing(false);
  }, []);

  const toggleFavorite = async (note: Note, e?: MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    await updateNote.mutateAsync({
      id: note.id,
      data: { is_favorite: !note.is_favorite },
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateEditorKey((k) => k + 1);
    setShowCreate(true);
  };

  const favoritePendingFor = useCallback(
    (id: string) => {
      if (!updateNote.isPending || !updateNote.variables) return false;
      const { id: vid, data } = updateNote.variables;
      if (vid !== id || !data) return false;
      const keys = Object.keys(data);
      return keys.length === 1 && keys[0] === "is_favorite";
    },
    [updateNote.isPending, updateNote.variables]
  );

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <Suspense fallback={null}>
        <NotesQueryParamSync notes={notes} onOpen={openDetail} />
      </Suspense>
      <PageShell
        title="Notes"
        description="Capture ideas and reference material"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        }
      >
        <FilterBar
          search={{ placeholder: "Search notes...", value: search, onChange: setSearch }}
          filters={[
            {
              key: "category",
              label: "Category",
              options: categoryOptions,
              value: categoryFilter,
            },
            {
              key: "favorite",
              label: "Notes",
              options: favoriteFilterOptions,
              value: favoriteFilter,
            },
          ]}
          onFilterChange={handleFilterChange}
          sort={{ options: sortOptions, value: sortBy, onChange: setSortBy }}
          viewModes={["list", "grid"]}
          activeViewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {filteredNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No notes found"
            description={
              notes?.length === 0
                ? "Create your first note to start capturing thoughts"
                : "Try adjusting your filters"
            }
            action={
              notes?.length === 0
                ? { label: "Create Note", onClick: openCreateDialog }
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
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => openDetail(note)}
                onToggleFavorite={(e) => {
                  void toggleFavorite(note, e);
                }}
                favoritePending={favoritePendingFor(note.id)}
              />
            ))}
          </div>
        )}
      </PageShell>

      {/* ── Create Note Modal ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent size="2xl">
          <DialogHeader>
            <DialogTitle>Create Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Title */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Note title"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                key={createEditorKey}
                ref={createNoteEditorRef}
                initialHtml=""
                placeholder="Write something..."
                minHeightClass="min-h-[200px]"
              />
            </div>

            <Separator />

            {/* Metadata section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Work"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={form.tagsInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  placeholder="comma separated"
                />
              </div>
            </div>

            {/* Project selector */}
            {projects && projects.length > 0 && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={form.project_id || "none"}
                  onValueChange={(v) => {
                    if (v !== null) setForm((f) => ({ ...f, project_id: v === "none" ? "" : v }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Favorite */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.is_favorite}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_favorite: !!v }))}
              />
              <span className="text-sm">Star as favorite</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || createNote.isPending}>
              {createNote.isPending ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Note Detail / Edit Modal ── */}
      <Dialog
        open={!!selectedNote}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNote(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent size="2xl">
          {selectedNote && (
            isEditing ? (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-2 max-h-[70vh] overflow-y-auto pr-1">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <RichTextEditor
                      key={`${selectedNote.id}-edit`}
                      ref={editNoteEditorRef}
                      initialHtml={selectedNote.content ?? ""}
                      placeholder="Write something..."
                      minHeightClass="min-h-[220px]"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <Input
                        value={form.tagsInput}
                        onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                        placeholder="comma separated"
                      />
                    </div>
                  </div>

                  {projects && projects.length > 0 && (
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select
                        value={form.project_id || "none"}
                        onValueChange={(v) => {
                          if (v !== null) setForm((f) => ({ ...f, project_id: v === "none" ? "" : v }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.is_favorite}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_favorite: !!v }))}
                    />
                    <span className="text-sm">Favorite</span>
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate} disabled={!form.title.trim() || updateNote.isPending}>
                    {updateNote.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="min-w-0 space-y-1">
                      <DialogTitle className="text-xl leading-snug">
                        {selectedNote.title}
                      </DialogTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedNote.category && (
                          <Badge variant="outline" className="font-normal">
                            {selectedNote.category}
                          </Badge>
                        )}
                        {selectedNote.project?.name && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            {selectedNote.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={favoritePendingFor(selectedNote.id)}
                        onClick={() => void toggleFavorite(selectedNote)}
                        aria-label={selectedNote.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star
                          className={cn(
                            "h-5 w-5",
                            selectedNote.is_favorite
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                  {/* Tags */}
                  {selectedNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  {(selectedNote.content?.trim() || /<img\b/i.test(selectedNote.content ?? "")) && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Content</p>
                        <RichTextReadOnly value={selectedNote.content} empty="" />
                      </div>
                    </>
                  )}

                  {/* Dates */}
                  <Separator />
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Updated {formatDate(selectedNote.updated_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Created {formatDate(selectedNote.created_at)}
                    </span>
                  </div>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedNote?.title}&quot;? This action cannot be
              undone.
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
