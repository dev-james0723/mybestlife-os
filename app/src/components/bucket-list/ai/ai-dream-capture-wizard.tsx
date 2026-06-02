"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import { useBucketItems, useCreateBucketItem } from "@/hooks/use-bucket-list";
import { useDreamAutofill } from "@/hooks/use-bucket-autofill";
import type { BucketItem, BucketItemSummary } from "@/types/bucket-list";

import { DreamInputMethodStep } from "./dream-input-method-step";
import { DreamExtractionProgress } from "./dream-extraction-progress";
import {
  DreamAutofillReview,
  draftFromAutofill,
  draftToCreateInput,
  type DreamDraftForm,
} from "./dream-autofill-review";
import { DreamNextActionsStep } from "./dream-next-actions-step";
import {
  bucketControlSize,
  bucketDialogSurface,
  bucketGlassControl,
  bucketPrimaryControl,
} from "../bucket-glass";

type WizardStep = "input" | "extracting" | "review" | "saved";

/**
 * AI-first dream capture wizard.
 *
 * input → (AI autofill) → review/edit → save (confirmed) → next actions.
 * Never auto-saves AI output, and never auto-executes cross-module writes; the
 * post-save actions open existing confirm-first flows.
 */
export function AIDreamCaptureWizard() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const router = useRouter();
  const pathname = usePathname();

  const open = useBucketListStore((s) => s.aiWizardOpen);
  const closeWizard = useBucketListStore((s) => s.closeAiWizard);
  const setSelectedBucketId = useBucketListStore((s) => s.setSelectedBucketId);
  const openActivateModal = useBucketListStore((s) => s.openActivateModal);

  const { data: items } = useBucketItems();
  const autofill = useDreamAutofill();
  const createBucket = useCreateBucketItem();

  const [step, setStep] = useState<WizardStep>("input");
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState<DreamDraftForm | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savedItem, setSavedItem] = useState<BucketItem | null>(null);

  // Reset wizard state synchronously when it (re)opens — same signature pattern
  // the Add sheet uses, no useEffect required.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) resetState();
  }

  function resetState() {
    setStep("input");
    setText("");
    setImageDataUrl(null);
    setForm(null);
    setSuggestions([]);
    setSavedItem(null);
  }

  const currentSummaries: BucketItemSummary[] = useMemo(
    () =>
      (items ?? []).slice(0, 30).map((it) => ({
        id: it.id,
        title: it.title,
        type: it.type,
        status: it.status,
      })),
    [items],
  );

  const canExtract = (text.trim().length > 0 || Boolean(imageDataUrl)) && !autofill.isPending;

  async function handleExtract() {
    if (!text.trim() && !imageDataUrl) {
      toast.error(copy.aiNeedsInput);
      return;
    }
    setStep("extracting");
    try {
      const result = await autofill.mutateAsync({
        text: text.trim() || undefined,
        imageUrl: imageDataUrl ?? undefined,
        currentBucketItems: currentSummaries,
      });
      setForm(draftFromAutofill(result));
      setSuggestions(result.suggested_next_actions ?? []);
      setStep("review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg === "quota_exceeded" ? copy.aiQuotaExhausted : copy.aiGenericError);
      setStep("input");
    }
  }

  function updateForm<K extends keyof DreamDraftForm>(
    key: K,
    value: DreamDraftForm[K],
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!form || !form.title.trim()) return;
    const saved = await createBucket.mutateAsync(draftToCreateInput(form));
    setSavedItem(saved);
    setStep("saved");
  }

  function close() {
    closeWizard();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        size="2xl"
        className={cn(
          "z-[140] flex max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-[1.4rem] p-0 sm:max-h-[min(90dvh,880px)]",
          bucketDialogSurface,
        )}
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lime-500" />
            {copy.aiWizardTitle}
          </DialogTitle>
          <DialogDescription>
            {step === "review"
              ? copy.aiReviewSubtitle
              : step === "saved"
                ? copy.aiSavedSubtitle
                : copy.aiWizardDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === "input" ? (
            <DreamInputMethodStep
              text={text}
              onTextChange={setText}
              imageDataUrl={imageDataUrl}
              onImageChange={setImageDataUrl}
              onError={(m) => toast.error(m)}
              copy={copy}
              disabled={autofill.isPending}
            />
          ) : null}

          {step === "extracting" ? <DreamExtractionProgress copy={copy} /> : null}

          {step === "review" && form ? (
            <DreamAutofillReview form={form} onChange={updateForm} copy={copy} />
          ) : null}

          {step === "saved" && savedItem ? (
            <DreamNextActionsStep
              savedItem={savedItem}
              suggestions={suggestions}
              copy={copy}
              onOpenDetails={() => {
                close();
                setSelectedBucketId(savedItem.id);
              }}
              onActivate={() => {
                close();
                openActivateModal(savedItem.id);
              }}
              onViewMap={() => {
                close();
                router.push(`${pathname}?tab=map`);
              }}
              onAddAnother={() => resetState()}
              onDone={close}
            />
          ) : null}
        </div>

        {step === "input" ? (
          <DialogFooter className="border-t border-white/10 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={close}
              className={cn(bucketGlassControl, bucketControlSize)}
            >
              {copy.cancel}
            </Button>
            <Button
              size="sm"
              className={cn(bucketPrimaryControl, bucketControlSize)}
              onClick={handleExtract}
              disabled={!canExtract}
            >
              <Sparkles className="h-4 w-4" />
              {copy.aiExtractButton}
            </Button>
          </DialogFooter>
        ) : null}

        {step === "review" ? (
          <DialogFooter className="border-t border-white/10 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("input")}
              disabled={createBucket.isPending}
              className={cn(bucketGlassControl, bucketControlSize)}
            >
              {copy.aiStartOver}
            </Button>
            <Button
              size="sm"
              className={cn(bucketPrimaryControl, bucketControlSize)}
              onClick={handleSave}
              disabled={!form?.title.trim() || createBucket.isPending}
            >
              {createBucket.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {copy.aiSaveDream}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
