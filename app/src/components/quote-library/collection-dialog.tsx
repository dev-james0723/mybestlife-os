"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import {
  useCreateCollection,
  useUpdateCollection,
} from "@/hooks/use-quote-collections";
import type { QuoteCollection } from "@/types/quote";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  editing?: QuoteCollection | null;
}

export function CollectionDialog({ open, onOpenChange, editing }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <CollectionDialogBody
          key={editing?.id ?? "new"}
          editing={editing ?? null}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CollectionDialogBody({
  editing,
  onDone,
}: {
  editing: QuoteCollection | null;
  onDone: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();

  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            name: name.trim(),
            description: description.trim() || null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || null,
        });
      }
      onDone();
    } catch {
      toast.error(copy.errorGeneric);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editing ? copy.collectionRename : copy.newCollection}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 pt-1">
        <div className="space-y-2">
          <Label htmlFor="collection-name">{copy.collectionNameLabel}</Label>
          <Input
            id="collection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-description">
            {copy.collectionDescriptionLabel}
          </Label>
          <Textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isSubmitting}
        >
          {copy.buttonCancel}
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {copy.buttonSaving}
            </>
          ) : (
            copy.collectionSave
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
