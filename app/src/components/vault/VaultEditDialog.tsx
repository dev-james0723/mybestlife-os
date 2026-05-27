"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  VaultEntryForm,
  entryToForm,
  buildCreatePayload,
  type VaultFormMetadata,
  type VaultFormState,
} from "@/components/vault/VaultEntryForm";
import type { ConfidenceLevel } from "@/types/vault-smart-autofill";
import { useUpdateSoftwareVaultEntry } from "@/hooks/use-software-vault";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import type { SoftwareVaultEntry } from "@/types/database";

type Props = {
  entry: SoftwareVaultEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VaultEditDialog({ entry, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="3xl"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto pt-8 sm:max-h-[90vh] sm:pt-6"
      >
        {entry && open ? (
          <EditForm entry={entry} onOpenChange={onOpenChange} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  entry,
  onOpenChange,
}: {
  entry: SoftwareVaultEntry;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<VaultFormState>(() => entryToForm(entry));
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, ConfidenceLevel>>(
    () => ({ ...(entry.field_confidence ?? {}) }),
  );
  const metadata = useMemo<VaultFormMetadata>(
    () => ({
      pricing_plans: entry.pricing_plans ?? [],
      selected_plan_id: entry.selected_plan_id,
      billing_cycle: entry.billing_cycle,
      cost_currency: entry.cost_currency,
      alternative_options: entry.alternative_options ?? [],
      field_sources: entry.field_sources ?? [],
      field_confidence: fieldConfidence,
    }),
    [entry, fieldConfidence],
  );
  const updateMutation = useUpdateSoftwareVaultEntry();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);

  const handleChange = (patch: Partial<VaultFormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleFieldUserEdit = (field: keyof VaultFormState) => {
    setFieldConfidence((prev) => ({ ...prev, [field]: "user_confirmed" }));
  };

  const handleSave = async () => {
    const payload = buildCreatePayload(form, undefined, metadata);
    try {
      await updateMutation.mutateAsync({ id: entry.id, data: payload });
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle>{copy.form.editTitle(entry.app_name)}</DialogTitle>
      </DialogHeader>
      <VaultEntryForm
        form={form}
        onChange={handleChange}
        fieldConfidence={fieldConfidence}
        fieldSources={entry.field_sources ?? []}
        alternativeOptions={entry.alternative_options ?? []}
        onFieldUserEdit={handleFieldUserEdit}
      />
      <DialogFooter className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={updateMutation.isPending}
        >
          {copy.form.cancel}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending || !form.app_name.trim()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {copy.form.saveChanges}
        </Button>
      </DialogFooter>
    </>
  );
}
