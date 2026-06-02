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
import { Sparkles, Loader2, ArrowRight, Search } from "lucide-react";
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
import { PlanPickerSteps } from "@/components/vault/PlanPickerSteps";
import { VaultReviewStep } from "@/components/vault/VaultReviewStep";
import { SoftwareProductResearchDialog } from "@/components/vault/SoftwareProductResearchDialog";
import { useCreateSoftwareVaultEntry } from "@/hooks/use-software-vault";
import { toast } from "sonner";
import type { AppCandidate, ConfidenceLevel, FieldSource, PricingPlan, SoftwareAlternative } from "@/types/vault-smart-autofill";
import type { ShouldAddResponse } from "@/lib/vault/intelligence-schemas";
import {
  applyPlanSelection,
  applySubscribeChoice,
  shouldShowPlanPicker,
  type SubscribeChoice,
} from "@/lib/vault/plan-picker";
import type { BillingCycle } from "@/types/vault-smart-autofill";

type Stage =
  | "prompt"
  | "identify"
  | "pricing-subscribe"
  | "pricing-plan"
  | "pricing-cycle"
  | "review"
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
  const [needsConfirmation, setNeedsConfirmation] = useState<string[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [alternativeOptions, setAlternativeOptions] = useState<SoftwareAlternative[]>([]);
  const [shouldAddResult, setShouldAddResult] = useState<ShouldAddResponse | null>(null);
  const [metadata, setMetadata] = useState<VaultFormMetadata>({});
  const [candidates, setCandidates] = useState<AppCandidate[]>([]);
  const [, setSelectedCandidate] = useState<AppCandidate | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [subscribeChoice, setSubscribeChoice] = useState<SubscribeChoice | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle | null>(null);
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
    setShouldAddResult(null);
    setMetadata({});
    setCandidates([]);
    setSelectedCandidate(null);
    setShowCandidateModal(false);
    setResearchOpen(false);
    setIsFetching(false);
    setIsIdentifying(false);
    setSubscribeChoice(null);
    setSelectedPlanId(null);
    setSelectedCycle(null);
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
      if (data.candidates.length > 1) {
        setShowCandidateModal(true);
        setStage("identify");
        return;
      }
      if (data.candidates.length === 1) {
        setSelectedCandidate(data.candidates[0]!);
        await runAutofill(data.candidates[0]!);
        return;
      }
      await runAutofill(null);
    } catch {
      await runAutofill(null);
    } finally {
      setIsIdentifying(false);
    }
  };

  const runShouldAdd = async () => {
    if (!query.trim()) return;
    setIsFetching(true);
    setShouldAddResult(null);
    try {
      const res = await fetch("/api/vault/should-add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (res.status === 429) {
        toast.error(copy.add.errors.rateLimited);
        return;
      }
      if (!res.ok) {
        toast.error(copy.add.errors.notFound);
        return;
      }
      const data = (await res.json()) as ShouldAddResponse;
      setShouldAddResult(data);
      const safePatch = sanitizeVaultFormPatch(data.fields_to_save_if_user_confirms ?? {});
      setForm(() => ({
        ...EMPTY_FORM,
        ...safePatch,
        app_name: safePatch.app_name || query.trim(),
      }));
      const generated = Object.keys(safePatch).filter((key) => {
        const value = safePatch[key as keyof VaultFormState];
        return value != null && String(value).trim() !== "";
      });
      setAiFields(new Set(generated));
      setFieldConfidence(
        Object.fromEntries(generated.map((key) => [key, "medium" as ConfidenceLevel])),
      );
      setFieldSources(
        generated.map((field) => ({
          field,
          source_type: "llm_inference",
          fetched_at: data.generatedAt,
          confidence: "medium",
        })),
      );
      setNeedsConfirmation([]);
      setPricingPlans([]);
      setAlternativeOptions([]);
      setMetadata({
        field_sources: generated.map((field) => ({
          field,
          source_type: "llm_inference",
          fetched_at: data.generatedAt,
          confidence: "medium",
        })),
        field_confidence: Object.fromEntries(
          generated.map((key) => [key, "medium" as ConfidenceLevel]),
        ),
      });
      setStage("review");
    } catch {
      toast.error(copy.add.errors.notFound);
    } finally {
      setIsFetching(false);
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
      setShouldAddResult(null);
      const safePatch = sanitizeVaultFormPatch(data.fields ?? {});
      setForm(() => ({ ...EMPTY_FORM, ...safePatch }));
      setAiFields(new Set(data.ai_generated_fields));
      setFieldConfidence(data.field_confidence ?? {});
      setFieldSources(data.field_sources ?? []);
      setNeedsConfirmation(data.needs_user_confirmation ?? []);
      const plans = data.pricing_plans ?? [];
      setPricingPlans(plans);
      setAlternativeOptions(data.alternative_options ?? []);
      setMetadata({
        pricing_plans: plans,
        alternative_options: data.alternative_options,
        field_sources: data.field_sources,
        field_confidence: data.field_confidence,
      });
      if (data.ai_generated_fields.length === 0) {
        toast.warning(copy.add.errors.partial);
      }
      if (shouldShowPlanPicker(plans)) {
        setStage("pricing-subscribe");
      } else {
        setStage("review");
      }
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

  const applyPricingMetadata = (
    patch: Partial<VaultFormState> & {
      selected_plan_id?: string;
      billing_cycle?: BillingCycle;
      cost_currency?: string;
    },
  ) => {
    setForm((f) => ({ ...f, ...patch }));
    setMetadata((m) => ({
      ...m,
      selected_plan_id: patch.selected_plan_id ?? m.selected_plan_id,
      billing_cycle: patch.billing_cycle ?? m.billing_cycle,
      cost_currency: patch.cost_currency ?? m.cost_currency,
    }));
    for (const key of ["cost_type", "cost_amount", "cost_period"] as const) {
      handleFieldUserEdit(key);
    }
  };

  const handlePricingContinue = () => {
    if (stage === "pricing-subscribe" && subscribeChoice) {
      if (subscribeChoice === "subscribed") {
        setStage("pricing-plan");
        return;
      }
      const patch = applySubscribeChoice(subscribeChoice, pricingPlans);
      applyPricingMetadata(patch);
      setStage("review");
      return;
    }
    if (stage === "pricing-plan" && selectedPlanId) {
      setStage("pricing-cycle");
      const plan = pricingPlans.find((p) => p.id === selectedPlanId);
      if (plan) setSelectedCycle(plan.billing_cycle ?? "monthly");
      return;
    }
    if (stage === "pricing-cycle" && selectedPlanId && selectedCycle) {
      const plan = pricingPlans.find((p) => p.id === selectedPlanId);
      if (plan) {
        applyPricingMetadata(applyPlanSelection(plan, selectedCycle));
      }
      setStage("review");
    }
  };

  const handlePricingBack = () => {
    if (stage === "pricing-cycle") setStage("pricing-plan");
    else if (stage === "pricing-plan") setStage("pricing-subscribe");
    else setStage("prompt");
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
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {busy ? copy.add.fetching : copy.add.fetchCta}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void runShouldAdd()} disabled={busy || !query.trim()}>
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Should I add this?
                </Button>
                <Button type="button" variant="outline" onClick={() => setResearchOpen(true)} disabled={busy || !query.trim()}>
                  <Search className="mr-2 h-4 w-4" />
                  Research before adding
                </Button>
                <Button type="button" variant="ghost" onClick={handleManualEntry} disabled={busy}>
                  {copy.add.manualEntry}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : stage === "pricing-subscribe" || stage === "pricing-plan" || stage === "pricing-cycle" ? (
            <PlanPickerSteps
              step={
                stage === "pricing-subscribe"
                  ? "subscribe"
                  : stage === "pricing-plan"
                    ? "plan"
                    : "cycle"
              }
              plans={pricingPlans}
              subscribeChoice={subscribeChoice}
              selectedPlanId={selectedPlanId}
              selectedCycle={selectedCycle}
              onSubscribeChoice={setSubscribeChoice}
              onSelectPlan={setSelectedPlanId}
              onSelectCycle={setSelectedCycle}
              onBack={handlePricingBack}
              onContinue={handlePricingContinue}
              onSkip={() => setStage("review")}
            />
          ) : stage === "review" ? (
            <VaultReviewStep
              form={form}
              fieldConfidence={fieldConfidence}
              fieldSources={fieldSources}
              needsConfirmation={needsConfirmation}
              shouldAddResult={shouldAddResult}
              onEdit={() => setStage("form")}
              onDeposit={handleSave}
              onBack={() =>
                setStage(shouldShowPlanPicker(pricingPlans) ? "pricing-subscribe" : "prompt")
              }
              depositing={createMutation.isPending}
            />
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
                <Button type="button" variant="ghost" onClick={() => setStage("review")} disabled={busy}>
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
      <SoftwareProductResearchDialog
        open={researchOpen}
        onOpenChange={setResearchOpen}
        initialProductName={query}
        onApplied={() => handleOpenChange(false)}
      />
    </>
  );
}
