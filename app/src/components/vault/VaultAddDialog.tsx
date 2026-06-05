"use client";

import { useState } from "react";
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
import { Loader2, ArrowRight, Search } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import {
  EMPTY_FORM,
  VaultEntryForm,
  buildCreatePayload,
  sanitizeVaultFormPatch,
  type VaultFormMetadata,
  type VaultFormState,
} from "@/components/vault/VaultEntryForm";
import { AppCandidatePickerModal } from "@/components/vault/AppCandidatePickerModal";
import { useCreateSoftwareVaultEntry } from "@/hooks/use-software-vault";
import { toast } from "sonner";
import type { AppCandidate, ConfidenceLevel, FieldSource, PricingPlan, SoftwareAlternative } from "@/types/vault-smart-autofill";

type Stage =
  | "prompt"
  | "form";

type AutofillResult = {
  fields: Partial<Record<keyof VaultFormState, unknown>>;
  pricing_plans?: PricingPlan[];
  pricing_options?: unknown[];
  alternative_options?: SoftwareAlternative[];
  field_sources?: FieldSource[];
  field_confidence?: Record<string, ConfidenceLevel>;
  needs_user_confirmation?: string[];
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
  const [stage, setStage] = useState<Stage>("prompt");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<VaultFormState>({ ...EMPTY_FORM });
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, ConfidenceLevel>>({});
  const [fieldSources, setFieldSources] = useState<FieldSource[]>([]);
  const [, setNeedsConfirmation] = useState<string[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [alternativeOptions, setAlternativeOptions] = useState<SoftwareAlternative[]>([]);
  const [metadata, setMetadata] = useState<VaultFormMetadata>({});
  const [candidates, setCandidates] = useState<AppCandidate[]>([]);
  const [, setSelectedCandidate] = useState<AppCandidate | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const createMutation = useCreateSoftwareVaultEntry();

  const resetDialog = () => {
    setStage("prompt");
    setQuery("");
    setForm({ ...EMPTY_FORM });
    setAiFields(new Set());
    setFieldConfidence({});
    setFieldSources([]);
    setNeedsConfirmation([]);
    setPricingPlans([]);
    setAlternativeOptions([]);
    setMetadata({});
    setCandidates([]);
    setSelectedCandidate(null);
    setShowCandidateModal(false);
    setIsFetching(false);
    setIsIdentifying(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetDialog();
    onOpenChange(nextOpen);
  };

  const runIdentify = async () => {
    if (!query.trim()) return;
    setIsIdentifying(true);
    try {
      const res = await fetch("/api/vault/identify", {
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
        await runAutofill(null);
        return;
      }
      const data = (await res.json()) as {
        candidates: AppCandidate[];
        auto_select: AppCandidate | null;
      };
      setCandidates(data.candidates);
      if (data.auto_select) {
        setSelectedCandidate(data.auto_select);
        await runAutofill(data.auto_select);
        return;
      }
      if (data.candidates.length > 0) {
        setShowCandidateModal(true);
        return;
      }
      await runAutofill(null);
    } catch {
      await runAutofill(null);
    } finally {
      setIsIdentifying(false);
    }
  };

  const runAutofill = async (candidate: AppCandidate | null) => {
    setIsFetching(true);
    setShowCandidateModal(false);
    try {
      const res = await fetch("/api/vault/autofill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          candidate: candidate ?? undefined,
        }),
      });
      if (res.status === 429) {
        toast.error(copy.add.errors.rateLimited);
        setStage("form");
        setForm((f) => ({ ...f, app_name: candidate?.name ?? query.trim() }));
        return;
      }
      if (!res.ok) {
        toast.error(copy.add.errors.notFound);
        setStage("form");
        setForm((f) => ({ ...f, app_name: candidate?.name ?? query.trim() }));
        return;
      }
      const data = (await res.json()) as AutofillResult;
      const safePatch = sanitizeVaultFormPatch(data.fields ?? {});
      setForm(() => ({ ...EMPTY_FORM, ...safePatch }));
      const generated = data.ai_generated_fields.filter((key) => {
        const value = safePatch[key as keyof VaultFormState];
        return value != null && String(value).trim() !== "";
      });
      const nextConfidence = Object.fromEntries(
        Object.entries(data.field_confidence ?? {}).filter(([key]) => key in safePatch),
      ) as Record<string, ConfidenceLevel>;
      const nextSources = (data.field_sources ?? []).filter((source) => source.field in safePatch);
      setAiFields(new Set(generated));
      setFieldConfidence(nextConfidence);
      setFieldSources(nextSources);
      setNeedsConfirmation(data.needs_user_confirmation ?? []);
      const plans = data.pricing_plans ?? [];
      setPricingPlans(plans);
      setAlternativeOptions(data.alternative_options ?? []);
      setMetadata({
        pricing_plans: plans,
        alternative_options: data.alternative_options,
        field_sources: nextSources,
        field_confidence: nextConfidence,
      });
      if (generated.length === 0) {
        toast.warning(copy.add.errors.partial);
      }
      setStage("form");
    } catch {
      toast.error(copy.add.errors.notFound);
      setStage("form");
      setForm((f) => ({ ...f, app_name: candidate?.name ?? query.trim() }));
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualEntry = () => {
    setForm((f) => ({ ...f, app_name: query.trim() }));
    setAiFields(new Set());
    setFieldConfidence({});
    setNeedsConfirmation([]);
    setFieldSources([]);
    setPricingPlans([]);
    setAlternativeOptions([]);
    setMetadata({});
    setStage("form");
    setShowCandidateModal(false);
  };

  const handleChange = (patch: Partial<VaultFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setAiFields((prev) => {
      const next = new Set(prev);
      for (const key of Object.keys(patch)) next.delete(key);
      return next;
    });
  };

  const handleFieldUserEdit = (field: keyof VaultFormState) => {
    setFieldConfidence((prev) => ({ ...prev, [field]: "user_confirmed" }));
    setNeedsConfirmation((prev) => prev.filter((k) => k !== field));
  };

  const handleSave = async () => {
    if (!form.app_name.trim()) return;
    const payload = buildCreatePayload(form, aiFields, {
      ...metadata,
      pricing_plans: pricingPlans,
      field_confidence: fieldConfidence,
      field_sources: fieldSources,
      alternative_options: alternativeOptions,
    });
    try {
      await createMutation.mutateAsync(payload);
      handleOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  const busy = isFetching || isIdentifying || createMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                    if (e.key === "Enter" && !busy && query.trim()) {
                      e.preventDefault();
                      void runIdentify();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void runIdentify()} disabled={busy || !query.trim()}>
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {busy ? copy.add.fetching : copy.add.fetchCta}
                </Button>
                <Button type="button" variant="outline" onClick={handleManualEntry} disabled={busy}>
                  {copy.add.manualEntry}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <VaultEntryForm
                form={form}
                onChange={handleChange}
                aiFields={aiFields}
                fieldConfidence={fieldConfidence}
                fieldSources={fieldSources}
                alternativeOptions={alternativeOptions}
                onFieldUserEdit={handleFieldUserEdit}
              />
              <DialogFooter className="mt-4 flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setStage("prompt")} disabled={busy}>
                  ← {copy.review.back}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
                    {copy.form.cancel}
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={busy || !form.app_name.trim()}>
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

      <AppCandidatePickerModal
        open={showCandidateModal}
        onOpenChange={setShowCandidateModal}
        candidates={candidates}
        loading={isIdentifying}
        onSelect={(c) => {
          setSelectedCandidate(c);
          void runAutofill(c);
        }}
        onManual={handleManualEntry}
        onRefine={() => {
          setShowCandidateModal(false);
          setStage("prompt");
        }}
      />
    </>
  );
}
