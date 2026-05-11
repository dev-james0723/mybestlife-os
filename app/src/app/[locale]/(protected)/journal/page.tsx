"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { stripHtml } from "@/lib/utils/html";
import { Badge } from "@/components/ui/badge";
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
import { BookMarked, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
} from "@/hooks/use-journal";
import { formatDate } from "@/lib/utils/date";
import type { JournalEntry, Json } from "@/types/database";
import { ResonantQuotesPanel } from "@/components/quote-library/resonant-quotes-panel";

const scaleOptions = [
  { value: "1", label: "1 — Very low" },
  { value: "2", label: "2 — Low" },
  { value: "3", label: "3 — Medium" },
  { value: "4", label: "4 — High" },
  { value: "5", label: "5 — Very high" },
];

function emotionToForm(eq: Json | null): { pleasantness: string; activation: string } {
  if (eq && typeof eq === "object" && !Array.isArray(eq)) {
    const o = eq as Record<string, unknown>;
    const p = o.pleasantness;
    const a = o.activation;
    return {
      pleasantness: typeof p === "number" && p >= 1 && p <= 5 ? String(p) : "3",
      activation: typeof a === "number" && a >= 1 && a <= 5 ? String(a) : "3",
    };
  }
  return { pleasantness: "3", activation: "3" };
}

function buildEmotionQuadrant(pleasantness: string, activation: string): Json {
  return {
    pleasantness: Number.parseInt(pleasantness, 10),
    activation: Number.parseInt(activation, 10),
  };
}

function entryTitle(entry: JournalEntry): string {
  const text = stripHtml(entry.content?.trim() ?? "");
  if (!text) return `Journal — ${formatDate(entry.entry_date)}`;
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}

function parseNeedsInput(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function JournalPage() {
  const { data: entries, isLoading } = useJournalEntries();
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createEditorKey, setCreateEditorKey] = useState(0);
  const createJournalEditorRef = useRef<RichTextEditorHandle>(null);
  const editJournalEditorRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState({
    entry_date: format(new Date(), "yyyy-MM-dd"),
    pleasantness: "3",
    activation: "3",
    needs: "",
    ai_summary: "",
    ai_illustration_url: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      entry_date: format(new Date(), "yyyy-MM-dd"),
      pleasantness: "3",
      activation: "3",
      needs: "",
      ai_summary: "",
      ai_illustration_url: "",
    });
    createJournalEditorRef.current?.reset();
  }, []);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => stripHtml(e.content ?? "").toLowerCase().includes(q));
  }, [entries, search]);

  const handleCreate = async () => {
    const html = createJournalEditorRef.current?.getHtml() ?? "";
    const text = createJournalEditorRef.current?.getText().trim() ?? "";
    await createEntry.mutateAsync({
      entry_date: form.entry_date,
      content: html.trim() || text || null,
      emotion_quadrant: buildEmotionQuadrant(form.pleasantness, form.activation),
      needs: parseNeedsInput(form.needs),
      ai_summary: form.ai_summary.trim() || null,
      ai_illustration_url: form.ai_illustration_url.trim() || null,
    });
    resetForm();
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;
    const html = editJournalEditorRef.current?.getHtml() ?? "";
    const text = editJournalEditorRef.current?.getText().trim() ?? "";
    await updateEntry.mutateAsync({
      id: selectedEntry.id,
      data: {
        entry_date: form.entry_date,
        content: html.trim() || text || null,
        emotion_quadrant: buildEmotionQuadrant(form.pleasantness, form.activation),
        needs: parseNeedsInput(form.needs),
        ai_summary: form.ai_summary.trim() || null,
        ai_illustration_url: form.ai_illustration_url.trim() || null,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    await deleteEntry.mutateAsync(selectedEntry.id);
    setSelectedEntry(null);
    setShowDeleteConfirm(false);
  };

  const openCreateJournal = () => {
    resetForm();
    setCreateEditorKey((k) => k + 1);
    setShowCreate(true);
  };

  const openDetail = (entry: JournalEntry) => {
    const em = emotionToForm(entry.emotion_quadrant);
    setSelectedEntry(entry);
    setForm({
      entry_date: entry.entry_date,
      pleasantness: em.pleasantness,
      activation: em.activation,
      needs: entry.needs?.length ? entry.needs.join(", ") : "",
      ai_summary: entry.ai_summary ?? "",
      ai_illustration_url: entry.ai_illustration_url ?? "",
    });
    setIsEditing(false);
  };

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title="Journal"
        description="Your emotional processing journal"
        actions={
          <Button onClick={openCreateJournal}>
            <Plus className="h-4 w-4 mr-2" />
            New entry
          </Button>
        }
      >
        <FilterBar
          search={{
            placeholder: "Search by content…",
            value: search,
            onChange: setSearch,
          }}
        />

        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="No journal entries"
            description={
              entries?.length === 0
                ? "Write your first entry to capture how you feel"
                : "Try a different search"
            }
            action={
              entries?.length === 0
                ? { label: "New entry", onClick: openCreateJournal }
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <EntityCard
                key={entry.id}
                title={entryTitle(entry)}
                subtitle={formatDate(entry.entry_date)}
                meta={
                  entry.needs?.length ? (
                    <span className="flex flex-wrap gap-1">
                      {entry.needs.slice(0, 4).map((n) => (
                        <Badge key={n} variant="secondary" className="text-xs font-normal">
                          {n}
                        </Badge>
                      ))}
                      {entry.needs.length > 4 ? (
                        <span className="text-muted-foreground">+{entry.needs.length - 4}</span>
                      ) : null}
                    </span>
                  ) : undefined
                }
                onClick={() => openDetail(entry)}
              />
            ))}
          </div>
        )}
      </PageShell>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New journal entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePickerInput
                value={form.entry_date}
                onChange={(v) => setForm((f) => ({ ...f, entry_date: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                key={createEditorKey}
                ref={createJournalEditorRef}
                initialHtml=""
                placeholder="What happened, and how did it land for you?"
                minHeightClass="min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Emotion check-in</p>
              <p className="text-xs text-muted-foreground">
                Pleasantness and activation help place the moment on an emotion map.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pleasantness</Label>
                  <Select
                    value={form.pleasantness}
                    onValueChange={(v) => {
                      if (v !== null) setForm((f) => ({ ...f, pleasantness: v }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scaleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Activation / energy</Label>
                  <Select
                    value={form.activation}
                    onValueChange={(v) => {
                      if (v !== null) setForm((f) => ({ ...f, activation: v }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scaleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Needs (comma-separated)</Label>
              <Input
                value={form.needs}
                onChange={(e) => setForm((f) => ({ ...f, needs: e.target.value }))}
                placeholder="e.g. rest, connection, clarity"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createEntry.isPending}>
                {createEntry.isPending ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SlideOverPanel
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={isEditing ? "Edit entry" : "Journal entry"}
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
        {selectedEntry && (
          isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePickerInput
                  value={form.entry_date}
                  onChange={(v) => setForm((f) => ({ ...f, entry_date: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  key={`${selectedEntry.id}-edit`}
                  ref={editJournalEditorRef}
                  initialHtml={selectedEntry.content ?? ""}
                  placeholder="What happened, and how did it land for you?"
                  minHeightClass="min-h-[200px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pleasantness</Label>
                  <Select
                    value={form.pleasantness}
                    onValueChange={(v) => {
                      if (v !== null) setForm((f) => ({ ...f, pleasantness: v }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scaleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Activation</Label>
                  <Select
                    value={form.activation}
                    onValueChange={(v) => {
                      if (v !== null) setForm((f) => ({ ...f, activation: v }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scaleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Needs (comma-separated)</Label>
                <Input
                  value={form.needs}
                  onChange={(e) => setForm((f) => ({ ...f, needs: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>AI summary (optional)</Label>
                <Textarea
                  value={form.ai_summary}
                  onChange={(e) => setForm((f) => ({ ...f, ai_summary: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Illustration URL (optional)</Label>
                <Input
                  value={form.ai_illustration_url}
                  onChange={(e) => setForm((f) => ({ ...f, ai_illustration_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updateEntry.isPending}>
                  {updateEntry.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">{formatDate(selectedEntry.entry_date)}</p>
                {selectedEntry.content?.trim() || /<img\b/i.test(selectedEntry.content ?? "") ? (
                  <div className="mt-3">
                    <RichTextReadOnly value={selectedEntry.content} empty="No content" />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground italic">No content</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Emotion map</p>
                {(() => {
                  const em = emotionToForm(selectedEntry.emotion_quadrant);
                  return (
                    <p className="text-sm">
                      Pleasantness {em.pleasantness} · Activation {em.activation}
                    </p>
                  );
                })()}
              </div>
              {selectedEntry.needs?.length ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Needs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.needs.map((n) => (
                      <Badge key={n} variant="secondary">
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedEntry.content?.trim() ? (
                <>
                  <Separator />
                  <ResonantQuotesPanel text={selectedEntry.content} />
                </>
              ) : null}
              {(selectedEntry.ai_summary || selectedEntry.ai_illustration_url) && (
                <>
                  <Separator />
                  {selectedEntry.ai_summary && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">AI summary</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedEntry.ai_summary}</p>
                    </div>
                  )}
                  {selectedEntry.ai_illustration_url && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Illustration</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedEntry.ai_illustration_url}
                        alt=""
                        className="rounded-md border max-h-64 w-auto object-contain"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )
        )}
      </SlideOverPanel>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry</AlertDialogTitle>
            <AlertDialogDescription>
              This journal entry will be permanently removed. This cannot be undone.
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
