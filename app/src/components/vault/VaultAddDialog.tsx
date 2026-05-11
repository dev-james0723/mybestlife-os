"use client";

import { useState, useEffect } from "react";
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
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import {
  EMPTY_FORM,
  VaultEntryForm,
  buildCreatePayload,
  sanitizeVaultFormPatch,
  type VaultFormState,
} from "@/components/vault/VaultEntryForm";
import { useCreateSoftwareVaultEntry } from "@/hooks/use-software-vault";
import { toast } from "sonner";

type AutofillResult = {
  fields: Partial<Record<keyof VaultFormState, unknown>>;
  ai_generated_fields: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VaultAddDialog({ open, onOpenChange }: Props) {
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const [stage, setStage] = useState<"prompt" | "form">("prompt");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<VaultFormState>({ ...EMPTY_FORM });
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const createMutation = useCreateSoftwareVaultEntry();

  useEffect(() => {
    if (!open) {
      setStage("prompt");
      setQuery("");
      setForm({ ...EMPTY_FORM });
      setAiFields(new Set());
      setIsFetching(false);
    }
  }, [open]);

  const runAutofill = async () => {
    if (!query.trim()) return;
    setIsFetching(true);
    try {
      const res = await fetch("/api/vault/autofill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (res.status === 429) {
        toast.error(copy.add.errors.rateLimited);
        setStage("form");
        setForm((f) => ({ ...f, app_name: query.trim() }));
        return;
      }
      if (!res.ok) {
        toast.error(copy.add.errors.notFound);
        setStage("form");
        setForm((f) => ({ ...f, app_name: query.trim() }));
        return;
      }
      const data = (await res.json()) as AutofillResult;
      const safePatch = sanitizeVaultFormPatch(data.fields ?? {});
      setForm(() => ({ ...EMPTY_FORM, ...safePatch }));
      setAiFields(new Set(data.ai_generated_fields));
      if (data.ai_generated_fields.length === 0) {
        toast.warning(copy.add.errors.partial);
      }
      setStage("form");
    } catch {
      toast.error(copy.add.errors.notFound);
      setStage("form");
      setForm((f) => ({ ...f, app_name: query.trim() }));
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualEntry = () => {
    setForm((f) => ({ ...f, app_name: query.trim() }));
    setAiFields(new Set());
    setStage("form");
  };

  const handleChange = (patch: Partial<VaultFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setAiFields((prev) => {
      const next = new Set(prev);
      for (const key of Object.keys(patch)) next.delete(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.app_name.trim()) return;
    const payload = buildCreatePayload(form, aiFields);
    try {
      await createMutation.mutateAsync(payload);
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="3xl"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto pt-8 sm:max-h-[90vh] sm:pt-6"
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{copy.add.dialogTitle[uiTheme]}</DialogTitle>
        </DialogHeader>

        {stage === "prompt" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vault-add-prompt">{copy.add.promptLabel}</Label>
              <Input
                id="vault-add-prompt"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.add.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isFetching && query.trim()) {
                    e.preventDefault();
                    runAutofill();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={runAutofill}
                disabled={isFetching || !query.trim()}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isFetching ? copy.add.fetching : copy.add.fetchCta}
              </Button>
              <Button type="button" variant="ghost" onClick={handleManualEntry}>
                {copy.add.manualEntry}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <VaultEntryForm form={form} onChange={handleChange} aiFields={aiFields} />
            <DialogFooter className="mt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStage("prompt")}
                disabled={createMutation.isPending}
              >
                ← {copy.add.retry}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={createMutation.isPending}
                >
                  {copy.form.cancel}
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={createMutation.isPending || !form.app_name.trim()}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {copy.add.depositCta[uiTheme]}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
