"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { LoadingPage } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import {
  OSControl,
  OSDialogSurface,
  OSEmptyState,
  OSPrimaryAction,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Pencil, Trash2, Clock, BarChart3, Timer, Calendar } from "lucide-react";
import {
  useJapaneseStudySessions,
  useCreateJapaneseStudySession,
  useUpdateJapaneseStudySession,
  useDeleteJapaneseStudySession,
} from "@/hooks/use-japanese-study";
import { formatDate, formatDateShort } from "@/lib/utils/date";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { stripHtml } from "@/lib/utils/html";
import type { JapaneseStudySession } from "@/types/database";

const sortOptions = [
  { value: "session_date", label: "Session date" },
  { value: "duration", label: "Duration" },
  { value: "created_at", label: "Date logged" },
];

const studyTypeOptions = [
  "Anki",
  "Reading",
  "Conversation",
  "Grammar",
  "Listening",
  "Writing",
  "Kanji",
  "Vocabulary",
  "Other",
];

function sessionTitle(session: JapaneseStudySession) {
  return session.study_type?.trim() || "Study session";
}

export default function JapaneseStudyPage() {
  const { data: sessions, isLoading } = useJapaneseStudySessions();
  const createSession = useCreateJapaneseStudySession();
  const updateSession = useUpdateJapaneseStudySession();
  const deleteSession = useDeleteJapaneseStudySession();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("session_date");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<JapaneseStudySession | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createEditorKey, setCreateEditorKey] = useState(0);
  const createJpContentRef = useRef<RichTextEditorHandle>(null);
  const editJpContentRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    duration_minutes: "25",
    study_type: "",
    notes: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      session_date: new Date().toISOString().slice(0, 10),
      duration_minutes: "25",
      study_type: "",
      notes: "",
    });
    createJpContentRef.current?.reset();
  }, []);

  const stats = useMemo(() => {
    if (!sessions?.length) {
      return { total: 0, totalMinutes: 0, avgMinutes: 0 };
    }
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    return {
      total: sessions.length,
      totalMinutes,
      avgMinutes: Math.round(totalMinutes / sessions.length),
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    let result = [...sessions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.study_type?.toLowerCase().includes(q) ||
          stripHtml(s.content ?? "").toLowerCase().includes(q) ||
          s.notes?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === "duration") {
        return b.duration_minutes - a.duration_minutes;
      }
      if (sortBy === "created_at") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
    });
    return result;
  }, [sessions, search, sortBy]);

  const handleCreate = async () => {
    const mins = Number.parseInt(form.duration_minutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) return;
    const html = createJpContentRef.current?.getHtml() ?? "";
    const text = createJpContentRef.current?.getText().trim() ?? "";
    await createSession.mutateAsync({
      session_date: form.session_date,
      duration_minutes: mins,
      study_type: form.study_type.trim() || null,
      content: html.trim() || text || null,
      notes: form.notes.trim() || null,
    });
    resetForm();
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const mins = Number.parseInt(form.duration_minutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) return;
    const html = editJpContentRef.current?.getHtml() ?? "";
    const text = editJpContentRef.current?.getText().trim() ?? "";
    const updated = await updateSession.mutateAsync({
      id: selected.id,
      data: {
        session_date: form.session_date,
        duration_minutes: mins,
        study_type: form.study_type.trim() || null,
        content: html.trim() || text || null,
        notes: form.notes.trim() || null,
      },
    });
    setSelected(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteSession.mutateAsync(selected.id);
    setSelected(null);
    setShowDeleteConfirm(false);
  };

  const openCreateJp = () => {
    resetForm();
    setCreateEditorKey((k) => k + 1);
    setShowCreate(true);
  };

  const openDetail = (s: JapaneseStudySession) => {
    setSelected(s);
    setForm({
      session_date: s.session_date.slice(0, 10),
      duration_minutes: String(s.duration_minutes),
      study_type: s.study_type ?? "",
      notes: s.notes ?? "",
    });
    setIsEditing(false);
  };

  const totalHoursDisplay = (stats.totalMinutes / 60).toFixed(1);

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title="Japanese Study"
        description="Log sessions and watch your consistency grow"
        actions={
          <OSPrimaryAction onClick={openCreateJp}>
            <Plus className="h-4 w-4 mr-2" />
            Log session
          </OSPrimaryAction>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <OSSolidPanel className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Total sessions</p>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{stats.total}</p>
          </OSSolidPanel>
          <OSSolidPanel className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Total hours</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{totalHoursDisplay}</p>
          </OSSolidPanel>
          <OSSolidPanel className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Avg. duration</p>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.total === 0 ? "—" : `${stats.avgMinutes} min`}
            </p>
          </OSSolidPanel>
        </div>

        <FilterBar
          search={{ placeholder: "Search sessions…", value: search, onChange: setSearch }}
          sort={{ options: sortOptions, value: sortBy, onChange: setSortBy }}
          viewModes={["list", "grid"]}
          activeViewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {filtered.length === 0 ? (
          <OSEmptyState
            icon={BookOpen}
            title="No sessions found"
            description={
              sessions?.length === 0
                ? "Log your first study block to start tracking"
                : "Try a different search"
            }
            action={
              sessions?.length === 0
                ? (
                    <OSPrimaryAction onClick={openCreateJp}>
                      <Plus className="h-4 w-4 mr-2" />
                      Log session
                    </OSPrimaryAction>
                  )
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
            {filtered.map((s) => (
              <EntityCard
                key={s.id}
                title={sessionTitle(s)}
                subtitle={`${formatDateShort(s.session_date)} · ${s.duration_minutes} min`}
                meta={
                  s.content ? (
                    <span className="line-clamp-2">{stripHtml(s.content)}</span>
                  ) : undefined
                }
                onClick={() => openDetail(s)}
              />
            ))}
          </div>
        )}
      </PageShell>

      {/* ── Create Study Session Modal ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <OSDialogSurface size="xl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log study session</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2" key={createEditorKey}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session date *</Label>
                <DatePickerInput
                  value={form.session_date}
                  onChange={(v) => setForm((f) => ({ ...f, session_date: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Study type</Label>
              <Select
                value={form.study_type}
                onValueChange={(v) => { if (v !== null) setForm((f) => ({ ...f, study_type: v })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a type…" />
                </SelectTrigger>
                <SelectContent>
                  {studyTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                ref={createJpContentRef}
                initialHtml=""
                placeholder="What did you cover?"
                minHeightClass="min-h-[140px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Anything worth remembering…"
              />
            </div>
          </div>

          <DialogFooter>
            <OSControl onClick={() => setShowCreate(false)}>
              Cancel
            </OSControl>
            <OSPrimaryAction
              onClick={handleCreate}
              disabled={
                createSession.isPending ||
                !form.session_date ||
                !Number.isFinite(Number.parseInt(form.duration_minutes, 10)) ||
                Number.parseInt(form.duration_minutes, 10) <= 0
              }
            >
              {createSession.isPending ? "Saving…" : "Save"}
            </OSPrimaryAction>
          </DialogFooter>
        </OSDialogSurface>
      </Dialog>

      {/* ── Study Session Detail Modal ── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setIsEditing(false); } }}>
        <OSDialogSurface size="2xl" className="max-h-[85vh] overflow-y-auto">
          {selected && (
            isEditing ? (
              <>
                <DialogHeader>
                  <DialogTitle>Edit session</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <DatePickerInput
                        value={form.session_date}
                        onChange={(v) => setForm((f) => ({ ...f, session_date: v }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes) *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.duration_minutes}
                        onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Study type</Label>
                    <Select
                      value={form.study_type}
                      onValueChange={(v) => { if (v !== null) setForm((f) => ({ ...f, study_type: v })); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {studyTypeOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <RichTextEditor
                      ref={editJpContentRef}
                      initialHtml={selected.content ?? ""}
                      placeholder="What did you cover?"
                      minHeightClass="min-h-[160px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="sm:mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <OSControl onClick={() => setIsEditing(false)}>
                    Cancel
                  </OSControl>
                  <OSPrimaryAction
                    onClick={handleUpdate}
                    disabled={
                      updateSession.isPending ||
                      !Number.isFinite(Number.parseInt(form.duration_minutes, 10)) ||
                      Number.parseInt(form.duration_minutes, 10) <= 0
                    }
                  >
                    {updateSession.isPending ? "Saving…" : "Save changes"}
                  </OSPrimaryAction>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="space-y-2">
                      <DialogTitle className="text-xl">{sessionTitle(selected)}</DialogTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(selected.session_date)}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {selected.duration_minutes} min
                        </Badge>
                        {selected.study_type && (
                          <Badge>{selected.study_type}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {(selected.content?.trim() || /<img\b/i.test(selected.content ?? "")) && (
                    <section>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Content</p>
                      <OSSolidPanel className="rounded-xl p-4">
                        <RichTextReadOnly value={selected.content} empty="" />
                      </OSSolidPanel>
                    </section>
                  )}

                  {selected.notes && (
                    <section>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                      <OSSolidPanel className="rounded-xl p-4">
                        <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                      </OSSolidPanel>
                    </section>
                  )}

                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Logged {formatDate(selected.created_at)}
                  </p>
                </div>

                <DialogFooter>
                  <OSControl onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </OSControl>
                </DialogFooter>
              </>
            )
          )}
        </OSDialogSurface>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this study session from your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSession.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
