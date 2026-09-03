"use client";

import { useState, useMemo, useCallback } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
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
import { FileText, Plus, Pencil, Trash2, AlertCircle, ExternalLink, Calendar, Loader2 } from "lucide-react";
import { ConnectedDocumentIntakeDialog } from "@/components/documents/ConnectedDocumentIntakeDialog";
import { useDocuments, useUpdateDocument, useDeleteDocument } from "@/hooks/use-documents";
import { formatDate, formatDateShort, isOverdue } from "@/lib/utils/date";
import type { Document } from "@/types/database";

const sortOptions = [
  { value: "expiration_date", label: "Expiration" },
  { value: "name", label: "Name" },
  { value: "created_at", label: "Recently added" },
];

function isValidExternalDocumentUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function DocumentsView() {
  const { data: documents, isLoading } = useDocuments();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("expiration_date");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Document | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    document_type: "",
    expiration_date: "",
    file_url: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    if (!documents) return [];
    let list = [...documents];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.document_type?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: {
          if (!a.expiration_date) return 1;
          if (!b.expiration_date) return -1;
          return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
        }
      }
    });
    return list;
  }, [documents, search, sortBy]);

  const openDetail = (d: Document) => {
    setSelected(d);
    setForm({
      name: d.name,
      document_type: d.document_type ?? "",
      expiration_date: d.expiration_date ?? "",
      file_url: d.file_url ?? "",
      notes: d.notes ?? "",
    });
    setIsEditing(false);
  };

  const handleUpdate = async () => {
    if (!selected || !form.name.trim()) return;
    const nextFileUrl = form.file_url.trim();
    if (!selected.storage_path && !isValidExternalDocumentUrl(nextFileUrl)) {
      toast.error("Enter a complete http:// or https:// address.");
      return;
    }
    await updateDocument.mutateAsync({
      id: selected.id,
      data: {
        name: form.name.trim(),
        document_type: form.document_type.trim() || null,
        expiration_date: form.expiration_date || null,
        file_url: nextFileUrl || null,
        source_kind: selected.storage_path
          ? selected.source_kind
          : nextFileUrl
            ? "external_link"
            : "manual",
        notes: form.notes.trim() || null,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteDocument.mutateAsync(selected.id);
    setSelected(null);
    setShowDeleteConfirm(false);
  };

  const handleOpenFile = async (document: Document) => {
    if (document.storage_path) {
      // Open during the click gesture so strict popup blockers do not reject
      // the tab while we wait for the short-lived private download URL.
      const fileWindow = window.open("about:blank", "_blank");
      if (fileWindow) fileWindow.opener = null;
      setOpeningFileId(document.id);
      try {
        const response = await fetch(
          `/api/documents/intake?storagePath=${encodeURIComponent(document.storage_path)}`,
        );
        const body = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !body.url) {
          throw new Error(body.error || "Could not open this file");
        }
        if (fileWindow) fileWindow.location.replace(body.url);
        else window.location.assign(body.url);
      } catch (error) {
        fileWindow?.close();
        toast.error(error instanceof Error ? error.message : "Could not open this file");
      } finally {
        setOpeningFileId(null);
      }
      return;
    }

    if (document.file_url) {
      window.open(document.file_url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
  }, []);

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title="Documents"
        description="Passports, licenses, and paperwork with renewal dates"
        actions={
          <Button
            variant="gradient-pink"
            size="lg"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-4" />
            New document
          </Button>
        }
      >
        <FilterBar
          search={{ placeholder: "Search documents...", value: search, onChange: setSearch }}
          sort={{ options: sortOptions, value: sortBy, onChange: handleSortChange }}
          viewModes={["list", "grid"]}
          activeViewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description={
              documents?.length === 0
                ? "Store important documents and expiry reminders here"
                : "Try adjusting your search"
            }
            action={
              documents?.length === 0
                ? { label: "Add document", onClick: () => setShowCreate(true) }
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
            {filtered.map((d) => {
              const overdue = d.expiration_date ? isOverdue(d.expiration_date) : false;
              return (
                <EntityCard
                  key={d.id}
                  icon={<FileText className="h-5 w-5 text-primary" />}
                  title={d.name}
                  subtitle={d.document_type ?? undefined}
                  badges={
                    d.document_type ? <StatusBadge variant="custom" value={d.document_type} /> : undefined
                  }
                  meta={
                    d.expiration_date ? (
                      <span
                        className={
                          overdue
                            ? "text-destructive font-medium flex items-center gap-1"
                            : "flex items-center gap-1"
                        }
                      >
                        {overdue && <AlertCircle className="h-3 w-3 shrink-0" />}
                        Expires {formatDateShort(d.expiration_date)}
                      </span>
                    ) : (
                      <span>No expiration</span>
                    )
                  }
                  onClick={() => openDetail(d)}
                />
              );
            })}
          </div>
        )}
      </PageShell>

      {/* ── Create Document Modal ── */}
      <ConnectedDocumentIntakeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
      />

      {/* ── Document Detail Modal ── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent size="2xl" className="max-h-[85vh] overflow-y-auto">
          {selected && (isEditing ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input
                      value={form.document_type}
                      onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiration date</Label>
                    <DatePickerInput
                      value={form.expiration_date}
                      onChange={(v) => setForm((f) => ({ ...f, expiration_date: v }))}
                    />
                  </div>
                  {selected.storage_path ? (
                    <div className="space-y-2">
                      <Label>Uploaded file</Label>
                      <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/35 px-3 text-sm text-muted-foreground">
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">
                          {selected.original_file_name ?? "Private document"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>External link</Label>
                      <Input
                        type="url"
                        value={form.file_url}
                        onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                        placeholder="https://…"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={
                    !form.name.trim() ||
                    updateDocument.isPending ||
                    (!selected.storage_path &&
                      !isValidExternalDocumentUrl(form.file_url))
                  }
                >
                  {updateDocument.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="space-y-2">
                    <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                    {selected.document_type && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selected.document_type}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {selected.expiration_date && (
                  <div
                    className={`flex items-center gap-2 text-sm font-medium rounded-lg border p-3 ${
                      isOverdue(selected.expiration_date)
                        ? "border-destructive/50 bg-destructive/5 text-destructive"
                        : "border-border bg-muted/50"
                    }`}
                  >
                    {isOverdue(selected.expiration_date) ? (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>
                      {isOverdue(selected.expiration_date) ? "Expired" : "Expires"}{" "}
                      {formatDate(selected.expiration_date)}
                    </span>
                  </div>
                )}

                {(selected.storage_path || selected.file_url) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleOpenFile(selected)}
                    disabled={openingFileId === selected.id}
                  >
                    {openingFileId === selected.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    {selected.original_file_name
                      ? `Open ${selected.original_file_name}`
                      : "Open file"}
                  </Button>
                )}

                {selected.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                  </>
                )}

                <Separator />
                <p className="text-xs text-muted-foreground">Updated {formatDate(selected.updated_at)}</p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          ))}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{selected?.name}&quot;? This cannot be undone.
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
