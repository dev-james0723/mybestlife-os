"use client";

import {
  useState,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { CreateGratitudeDialog } from "@/components/grateful-things/create-gratitude-dialog";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/shared/rich-text-editor";
import { RichTextReadOnly } from "@/components/shared/rich-text-read-only";
import { stripHtml } from "@/lib/utils/html";
import { Heart, Plus, Pencil, Star, Trash2 } from "lucide-react";
import {
  useGratefulThings,
  useCreateGratefulThing,
  useUpdateGratefulThing,
  useDeleteGratefulThing,
} from "@/hooks/use-grateful-things";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import type { GratefulThing } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import {
  getGratefulThingsUiCopy,
  gratefulCategoryLabel,
  type GratefulThingsUiCopy,
} from "@/lib/i18n/grateful-things-ui";

type GratefulDetailForm = {
  entry_date: string;
  category: string;
  photo_url: string | null;
  is_favorite: boolean;
};

function GratefulThingDetailModal({
  entry,
  open,
  onOpenChange,
  isEditing,
  onEdit,
  onCancelEdit,
  onRequestDelete,
  form,
  setForm,
  editContentRef,
  onSave,
  isSaving,
  copy,
}: {
  entry: GratefulThing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onRequestDelete: () => void;
  form: GratefulDetailForm;
  setForm: Dispatch<SetStateAction<GratefulDetailForm>>;
  editContentRef: RefObject<RichTextEditorHandle | null>;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
  copy: GratefulThingsUiCopy;
}) {
  const language = useAppStore((s) => s.language);
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[85vh] overflow-y-auto">
        {isEditing ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.detailEditTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{copy.labelDate}</Label>
                <DatePickerInput
                  value={form.entry_date}
                  onChange={(v) => setForm((f) => ({ ...f, entry_date: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.labelCategory}</Label>
                <Input
                  value={form.category}
                  onChange={(ev) => setForm((f) => ({ ...f, category: ev.target.value }))}
                  placeholder={copy.categoryPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.labelContent}</Label>
                <RichTextEditor
                  key={`${entry.id}-edit`}
                  ref={editContentRef}
                  initialHtml={entry.content}
                  placeholder={copy.contentPlaceholder}
                  minHeightClass="min-h-[200px]"
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.labelPhotoUrl}</Label>
                <Input
                  value={form.photo_url ?? ""}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, photo_url: ev.target.value.trim() || null }))
                  }
                  placeholder={copy.photoUrlPlaceholder}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_favorite}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_favorite: v === true }))}
                />
                {copy.markFavorite}
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onCancelEdit}>
                {copy.cancel}
              </Button>
              <Button onClick={() => void onSave()} disabled={isSaving}>
                {isSaving ? copy.saving : copy.save}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-0">
              <div className="flex items-start justify-between gap-4 pr-8">
                <DialogTitle>{copy.detailViewTitle}</DialogTitle>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={copy.editEntryAria}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onRequestDelete}
                    aria-label={copy.deleteEntryAria}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">{formatDate(entry.entry_date)}</p>
                {entry.category ? (
                  <Badge variant="secondary" className="font-normal">
                    {gratefulCategoryLabel(language, entry.category)}
                  </Badge>
                ) : null}
                {entry.is_favorite ? (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {copy.favoriteBadge}
                  </Badge>
                ) : null}
              </div>
              {entry.photo_url ? (
                <img
                  src={entry.photo_url}
                  alt=""
                  className="max-h-56 w-full rounded-lg border object-cover"
                />
              ) : null}
              <Separator />
              <RichTextReadOnly value={entry.content} empty={copy.emptyContentReadonly} />
              <p className="text-xs text-muted-foreground">
                {copy.createdAt} {formatDateTime(entry.created_at)}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function GratefulThingsPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getGratefulThingsUiCopy(language), [language]);

  const sortOptions = useMemo(
    () => [
      { value: "entry_date", label: copy.sortEntryDate },
      { value: "created_at", label: copy.sortDateAdded },
    ],
    [copy.sortDateAdded, copy.sortEntryDate]
  );

  const { data: entries, isLoading } = useGratefulThings();
  const createEntry = useCreateGratefulThing();
  const updateEntry = useUpdateGratefulThing();
  const deleteEntry = useDeleteGratefulThing();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("entry_date");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<GratefulThing | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const editContentRef = useRef<RichTextEditorHandle>(null);

  const [form, setForm] = useState<GratefulDetailForm>({
    entry_date: "",
    category: "",
    photo_url: null,
    is_favorite: false,
  });

  const filtered = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => stripHtml(e.content).toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "created_at") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const da = new Date(a.entry_date).getTime();
      const db = new Date(b.entry_date).getTime();
      if (db !== da) return db - da;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [entries, search, sortBy]);

  const openDetail = (e: GratefulThing) => {
    setSelected(e);
    setForm({
      entry_date: e.entry_date,
      category: e.category ?? "",
      photo_url: e.photo_url ?? null,
      is_favorite: e.is_favorite ?? false,
    });
    setIsEditing(false);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const html = editContentRef.current?.getHtml() ?? "";
    const text = editContentRef.current?.getText().trim() ?? "";
    if (!text && !/<img\b/i.test(html)) return;
    await updateEntry.mutateAsync({
      id: selected.id,
      data: {
        content: html.trim() || text,
        entry_date: form.entry_date,
        category: form.category.trim() || null,
        photo_url: form.photo_url,
        is_favorite: form.is_favorite,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteEntry.mutateAsync(selected.id);
    setSelected(null);
    setShowDeleteConfirm(false);
  };

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {copy.newEntry}
          </Button>
        }
      >
        <FilterBar
          search={{ placeholder: copy.searchPlaceholder, value: search, onChange: setSearch }}
          sort={{ options: sortOptions, value: sortBy, onChange: setSortBy }}
          i18n={{
            searchDefaultPlaceholder: copy.searchPlaceholder,
            sortPlaceholder: copy.sortPlaceholder,
            formatAllFilterOption: (filterLabel) => filterLabel,
          }}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={copy.emptyTitle}
            description={
              entries?.length === 0 ? copy.emptyDescNoEntries : copy.emptyDescSearch
            }
            action={
              entries?.length === 0
                ? { label: copy.emptyAction, onClick: () => setShowCreate(true) }
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => (
              <EntityCard
                key={e.id}
                icon={
                  e.is_favorite ? (
                    <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                  ) : (
                    <Heart className="h-5 w-5 text-primary" />
                  )
                }
                title={formatDate(e.entry_date)}
                subtitle={
                  (() => {
                    let plain = stripHtml(e.content);
                    if (!plain && /<img\b/i.test(e.content)) plain = copy.subtitleHasImage;
                    return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain;
                  })()
                }
                onClick={() => openDetail(e)}
              />
            ))}
          </div>
        )}
      </PageShell>

      <CreateGratitudeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        copy={copy}
        isSaving={createEntry.isPending}
        onSave={async (input) => {
          await createEntry.mutateAsync(input);
        }}
      />

      <GratefulThingDetailModal
        entry={selected}
        open={!!selected}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelected(null);
            setIsEditing(false);
          }
        }}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={() => setIsEditing(false)}
        onRequestDelete={() => setShowDeleteConfirm(true)}
        form={form}
        setForm={setForm}
        editContentRef={editContentRef}
        onSave={handleUpdate}
        isSaving={updateEntry.isPending}
        copy={copy}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
