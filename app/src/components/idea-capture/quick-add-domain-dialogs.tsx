"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OSDialogSurface } from "@/components/ui/os-primitives";
import { RelationshipFormModal } from "@/components/relationship/forms/relationship-form-modal";
import { RoleModelForm } from "@/components/relationship/role-model-form";
import { CreateGratitudeDialog } from "@/components/grateful-things/create-gratitude-dialog";
import { ConnectedDocumentIntakeDialog } from "@/components/documents/ConnectedDocumentIntakeDialog";
import { useCreateAsset } from "@/hooks/use-assets";
import { useCreateGratefulThing } from "@/hooks/use-grateful-things";
import { useCreateNote, useNotes } from "@/hooks/use-notes";
import { useProjects } from "@/hooks/use-projects";
import { useGoals } from "@/hooks/use-goals";
import { useIdeas } from "@/hooks/use-ideas";
import { useTasks } from "@/hooks/use-tasks";
import { useCreateRelationship } from "@/hooks/use-relationships";
import { useCreateRoleModel, useRoleModels } from "@/hooks/use-role-models";
import { useAppStore } from "@/stores/app-store";
import { getGratefulThingsUiCopy } from "@/lib/i18n/grateful-things-ui";
import { getNotesUiCopy } from "@/lib/i18n/notes-ui";
import { getResourcesUiCopy } from "@/lib/i18n/resources-ui";
import { NOTE_TYPE_LABELS, NOTE_TYPES, type NoteType } from "@/lib/notes/note-types";
import { ASSET_CATEGORY_KEYS, isAssetCategoryKey, type AssetCategoryKey } from "@/types/assets";
import { relationshipToRoleModelInput } from "@/lib/relationships/role-model-conversion";

type QuickAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function titleFromCapture(content: string) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.trim();
  if (!firstLine) return "Untitled note";
  return firstLine.replace(/^#+\s*/, "").replace(/[.。]\s*$/, "").slice(0, 120);
}

function categoryFromMode(mode: NoteType) {
  if (mode === "auto" || mode === "general") return null;
  return NOTE_TYPE_LABELS[mode];
}

export function QuickAddNoteDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getNotesUiCopy(language), [language]);
  const createNote = useCreateNote();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<NoteType>("auto");

  const reset = () => {
    setTitle("");
    setContent("");
    setMode("auto");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await createNote.mutateAsync({
      title: title.trim() || titleFromCapture(trimmed),
      content: trimmed,
      category: categoryFromMode(mode),
      tags: [],
      is_favorite: false,
      project_id: null,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <OSDialogSurface size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.newNote}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="quick-add-note-title">{copy.titleLabel}</Label>
            <Input
              id="quick-add-note-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.untitled}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>{copy.modeAuto}</Label>
            <Select
              value={mode}
              onValueChange={(value) => {
                if (NOTE_TYPES.includes(value as NoteType)) setMode(value as NoteType);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "auto" ? copy.modeAuto : NOTE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-add-note-content">{copy.contentLabel}</Label>
            <Textarea
              id="quick-add-note-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={copy.quickCapturePlaceholder}
              rows={6}
              className="min-h-40"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createNote.isPending}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!content.trim() || createNote.isPending}
          >
            {createNote.isPending ? "Saving..." : copy.saveNote}
          </Button>
        </DialogFooter>
      </OSDialogSurface>
    </Dialog>
  );
}

export function QuickAddDocumentDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <ConnectedDocumentIntakeDialog
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

type QuickAssetForm = {
  name: string;
  category_key: AssetCategoryKey | "";
  value: string;
  current_value: string;
  location: string;
  purchase_date: string;
  serial_number: string;
  notes: string;
};

const EMPTY_ASSET_FORM: QuickAssetForm = {
  name: "",
  category_key: "",
  value: "",
  current_value: "",
  location: "",
  purchase_date: "",
  serial_number: "",
  notes: "",
};

function parseMoney(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function QuickAddAssetDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getResourcesUiCopy(language), [language]);
  const createAsset = useCreateAsset();
  const [form, setForm] = useState<QuickAssetForm>(EMPTY_ASSET_FORM);

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm(EMPTY_ASSET_FORM);
    onOpenChange(next);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const categoryKey = form.category_key || null;
    await createAsset.mutateAsync({
      name: form.name.trim(),
      category: categoryKey ? copy.categories[categoryKey] : null,
      category_key: categoryKey,
      value: parseMoney(form.value),
      current_value: parseMoney(form.current_value),
      location: form.location.trim() || null,
      purchase_date: form.purchase_date || null,
      serial_number: form.serial_number.trim() || null,
      notes: form.notes.trim() || null,
      document_id: null,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <OSDialogSurface size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.assetForm.newTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-add-asset-name">{copy.assetForm.nameLabel}</Label>
              <Input
                id="quick-add-asset-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={copy.assetForm.nameRequiredPlaceholder}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.assetForm.categoryLabel}</Label>
              <Select
                value={form.category_key || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    category_key: isAssetCategoryKey(value) ? value : "",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={copy.assetForm.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORY_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {copy.categories[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-add-asset-value">{copy.assetForm.purchaseValueLabel}</Label>
              <Input
                id="quick-add-asset-value"
                value={form.value}
                onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                placeholder={copy.assetForm.purchaseValuePlaceholder}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-add-asset-current-value">{copy.assetForm.currentValueLabel}</Label>
              <Input
                id="quick-add-asset-current-value"
                value={form.current_value}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, current_value: event.target.value }))
                }
                placeholder={copy.assetForm.purchaseValuePlaceholder}
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-add-asset-location">{copy.assetForm.locationLabel}</Label>
              <Input
                id="quick-add-asset-location"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder={copy.assetForm.locationPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.assetForm.purchaseDateLabel}</Label>
              <DatePickerInput
                value={form.purchase_date}
                onChange={(value) => setForm((prev) => ({ ...prev, purchase_date: value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-add-asset-serial">{copy.assetForm.serialNumberLabel}</Label>
            <Input
              id="quick-add-asset-serial"
              value={form.serial_number}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, serial_number: event.target.value }))
              }
              placeholder={copy.assetForm.serialNumberPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-add-asset-notes">{copy.assetForm.notesLabel}</Label>
            <Textarea
              id="quick-add-asset-notes"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createAsset.isPending}
          >
            {copy.assetForm.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!form.name.trim() || createAsset.isPending}
          >
            {createAsset.isPending ? copy.assetForm.creating : copy.assetForm.create}
          </Button>
        </DialogFooter>
      </OSDialogSurface>
    </Dialog>
  );
}

export function QuickAddRelationshipDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const { data: notes } = useNotes();
  const { data: ideas } = useIdeas();
  const { data: roleModels } = useRoleModels();
  const createRelationship = useCreateRelationship();
  const createRoleModel = useCreateRoleModel();

  return (
    <RelationshipFormModal
      open={open}
      onOpenChange={onOpenChange}
      projects={projects ?? []}
      goals={goals ?? []}
      notes={notes ?? []}
      ideas={ideas ?? []}
      roleModelNames={(roleModels ?? []).map((roleModel) => roleModel.name)}
      onSubmit={({ payload, addToRoleModel }) => {
        void (async () => {
          try {
            const saved = await createRelationship.mutateAsync(payload);
            if (addToRoleModel) {
              try {
                await createRoleModel.mutateAsync(
                  relationshipToRoleModelInput(saved),
                );
              } catch {
                // The role-model hook reports its own error; the relationship
                // is already persisted and should not be submitted twice.
              }
            }
            onOpenChange(false);
          } catch {
            // Keep the modal open; the relationship hook reports the failure.
          }
        })();
      }}
      isSubmitting={createRelationship.isPending || createRoleModel.isPending}
    />
  );
}

export function QuickAddRoleModelDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const { data: notes } = useNotes();
  const { data: tasks } = useTasks();
  const createRoleModel = useCreateRoleModel();

  return (
    <RoleModelForm
      open={open}
      mode="create"
      initial={null}
      projects={projects ?? []}
      goals={goals ?? []}
      notes={notes ?? []}
      tasks={tasks ?? []}
      isSaving={createRoleModel.isPending}
      onClose={() => onOpenChange(false)}
      onSubmit={async ({ payload }) => {
        await createRoleModel.mutateAsync(payload);
        onOpenChange(false);
      }}
    />
  );
}

export function QuickAddGratitudeDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getGratefulThingsUiCopy(language), [language]);
  const createEntry = useCreateGratefulThing();

  return (
    <CreateGratitudeDialog
      open={open}
      onOpenChange={onOpenChange}
      copy={copy}
      isSaving={createEntry.isPending}
      onSave={async (input) => {
        await createEntry.mutateAsync(input);
      }}
    />
  );
}
