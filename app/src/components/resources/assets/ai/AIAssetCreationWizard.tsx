"use client";

/**
 * AI Asset Creation Wizard — the AI-first path to adding an asset.
 *
 *   choose method → upload / describe → AI extraction → review (with
 *   confidence) → choose visual → suggested next actions → save.
 *
 * The asset is only written to Supabase after the user reviews and confirms.
 * A generated/uploaded visual is persisted as the asset's primary image after
 * creation. AI extraction can be wrong, so every field stays editable and
 * carries a confidence chip.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Camera,
  ShieldCheck,
  Type,
  PencilLine,
  Sparkles,
  UploadCloud,
  Check,
  Loader2,
  ImageIcon,
  Package,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useAppStore } from "@/stores/app-store";
import { getAssetIntelUiCopy } from "@/lib/i18n/asset-intelligence-ui";
import { getResourcesUiCopy } from "@/lib/i18n/resources-ui";
import { toast } from "sonner";
import { useCreateAsset } from "@/hooks/use-assets";
import { useAssetAutofill, useGenerateAssetImage } from "@/hooks/use-asset-ai";
import { useCreateAssetImage } from "@/hooks/use-asset-media";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useHydrationSafeReducedMotion } from "@/hooks/use-hydration-safe-reduced-motion";
import { getOSBuddyActionLabel } from "@/lib/os-buddy/os-buddy-action-labels";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import {
  ASSET_CATEGORY_KEYS,
  isAssetCategoryKey,
  type Asset,
  type AssetCategoryKey,
} from "@/types/assets";
import type {
  AssetAutofillResult,
  AssetFieldConfidence,
} from "@/types/asset-intelligence";

type WizardStep = "method" | "input" | "extracting" | "review" | "visual" | "actions";

type InputMethod =
  | "receipt"
  | "photo"
  | "warranty"
  | "name"
  | "describe"
  | "generate";

type ReviewForm = {
  name: string;
  category_key: AssetCategoryKey | "";
  value: string;
  current_value: string;
  location: string;
  purchase_date: string;
  serial_number: string;
  notes: string;
  warranty_expiration_date: string;
};

type AttachmentDraft = {
  mimeType: string;
  data: string; // base64, no prefix
  previewUrl: string;
  isImage: boolean;
};

async function fileToAttachment(file: File): Promise<AttachmentDraft> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const data = btoa(binary);
  return {
    mimeType: file.type,
    data,
    previewUrl: URL.createObjectURL(file),
    isImage: file.type.startsWith("image/"),
  };
}

export type AIAssetCreationWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (asset: Asset) => void;
};

export function AIAssetCreationWizard({
  open,
  onOpenChange,
  onCreated,
}: AIAssetCreationWizardProps) {
  const language = useAppStore((s) => s.language);
  const { name: buddyName } = useOSBuddy();
  const t = getAssetIntelUiCopy(language).wizard;
  const resources = getResourcesUiCopy(language);
  const buddyCopy = useMemo(
    () => ({
      addAsset: getOSBuddyActionLabel({
        action: "addAsset",
        buddyName,
        locale: language,
      }),
      reviewDetails: getOSBuddyActionLabel({
        action: "assetReviewDetails",
        buddyName,
        locale: language,
      }),
    }),
    [buddyName, language],
  );
  const prefersReduced = useHydrationSafeReducedMotion();

  const createAsset = useCreateAsset();
  const autofill = useAssetAutofill();
  const generateImage = useGenerateAssetImage();
  const createImage = useCreateAssetImage();

  const [step, setStep] = useState<WizardStep>("method");
  const [method, setMethod] = useState<InputMethod | null>(null);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [result, setResult] = useState<AssetAutofillResult | null>(null);
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedStoragePath, setGeneratedStoragePath] = useState<string | null>(null);
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [visualChoice, setVisualChoice] = useState<
    "generated" | "uploaded" | "icon" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("method");
    setMethod(null);
    setText("");
    setAttachment(null);
    setResult(null);
    setForm(null);
    setGeneratedImageUrl(null);
    setGeneratedStoragePath(null);
    setGeneratedModel(null);
    setVisualChoice(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      // Defer reset so the close animation isn't janky.
      const id = setTimeout(reset, 250);
      return () => clearTimeout(id);
    }
  }, [open, reset]);

  // ── Extraction ──
  const runExtraction = useCallback(async () => {
    setError(null);
    setStep("extracting");
    emitOSBuddyEvent({ type: "asset:extract:start" });
    try {
      const res = await autofill.mutateAsync({
        text: text.trim() || undefined,
        attachments: attachment
          ? [{ mimeType: attachment.mimeType, data: attachment.data }]
          : undefined,
      });
      const r = res.result;
      setResult(r);
      setForm({
        name: r.name,
        category_key: r.category_key ?? "",
        value: r.value != null ? String(r.value) : "",
        current_value: r.current_value != null ? String(r.current_value) : "",
        location: r.location ?? "",
        purchase_date: r.purchase_date ?? "",
        serial_number: r.serial_number ?? "",
        notes: r.notes ?? "",
        warranty_expiration_date: r.warranty_expiration_date ?? "",
      });
      setStep("review");
      emitOSBuddyEvent({ type: "asset:extract:success" });
    } catch {
      emitOSBuddyEvent({ type: "asset:extract:error" });
      setError(t.errorGeneric);
      setStep("input");
    }
  }, [attachment, autofill, t.errorGeneric, text]);

  const handleGenerateImage = useCallback(async () => {
    if (!form) return;
    setError(null);
    emitOSBuddyEvent({ type: "asset:visual:start" });
    try {
      const res = await generateImage.mutateAsync({
        assetName: form.name,
        brand: result?.possible_brand ?? null,
        model: result?.possible_model ?? null,
        category_key: form.category_key || null,
        visualStyle: "ultra_realistic_product_photo",
      });
      setGeneratedImageUrl(res.imageUrl);
      setGeneratedStoragePath(res.storagePath);
      setGeneratedModel(res.modelUsed);
      setVisualChoice("generated");
      emitOSBuddyEvent({ type: "asset:visual:success" });
    } catch (e) {
      emitOSBuddyEvent({ type: "asset:visual:error" });
      setError(e instanceof Error && e.message ? e.message : t.errorGeneric);
    }
  }, [form, generateImage, result, t.errorGeneric]);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setError(null);
    const categoryKey = form.category_key || null;
    const categoryLabel = categoryKey ? resources.categories[categoryKey] : null;
    const parseMoney = (v: string) => {
      const n = Number.parseFloat(v.trim());
      return Number.isFinite(n) ? n : null;
    };
    try {
      const asset = await createAsset.mutateAsync({
        name: form.name.trim(),
        category: categoryLabel,
        category_key: categoryKey,
        value: parseMoney(form.value),
        current_value: parseMoney(form.current_value),
        location: form.location.trim() || null,
        purchase_date: form.purchase_date || null,
        serial_number: form.serial_number.trim() || null,
        notes: form.notes.trim() || null,
      });

      // Persist chosen visual as the primary image (non-fatal — asset already exists).
      let imageWarning: string | null = null;
      if (visualChoice === "generated" && generatedImageUrl) {
        try {
          await createImage.mutateAsync({
            asset_id: asset.id,
            image_url: generatedImageUrl,
            storage_path: generatedStoragePath,
            image_type: "generated_product_image",
            model_used: generatedModel,
            is_primary: true,
          });
        } catch {
          imageWarning = t.imageAttachFailed;
        }
      } else if (visualChoice === "uploaded" && attachment?.isImage) {
        const uploadRes = await fetch("/api/ai/assets/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: asset.id,
            data: attachment.data,
            mimeType: attachment.mimeType,
            imageType: "uploaded_product_photo",
            makePrimary: true,
          }),
        });
        if (!uploadRes.ok) imageWarning = t.imageAttachFailed;
      }

      onCreated?.(asset);
      onOpenChange(false);
      if (imageWarning) toast.warning(imageWarning);
    } catch {
      setError(t.errorGeneric);
    }
  }, [
    attachment,
    createAsset,
    createImage,
    form,
    generatedImageUrl,
    generatedModel,
    generatedStoragePath,
    onCreated,
    onOpenChange,
    resources.categories,
    t.errorGeneric,
    visualChoice,
  ]);

  const onPickFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const att = await fileToAttachment(file);
    setAttachment(att);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-[var(--accent-pink)]" />
            {buddyCopy.addAsset}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator step={step} t={t} />

        <div className="min-h-[320px] pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            >
              {step === "method" && (
                <MethodStep
                  t={t}
                  onSelect={(m) => {
                    setMethod(m);
                    setStep("input");
                  }}
                />
              )}

              {step === "input" && (
                <InputStep
                  t={t}
                  method={method}
                  text={text}
                  setText={setText}
                  attachment={attachment}
                  onPickFile={onPickFile}
                  clearAttachment={() => setAttachment(null)}
                  fileInputRef={fileInputRef}
                  canSubmit={Boolean(text.trim() || attachment)}
                  onSubmit={runExtraction}
                  onBack={() => setStep("method")}
                  error={error}
                  extractCtaLabel={buddyCopy.reviewDetails}
                />
              )}

              {step === "extracting" && <ExtractingStep t={t} />}

              {step === "review" && form && (
                <ReviewStep
                  t={t}
                  resources={resources}
                  form={form}
                  setForm={setForm}
                  result={result}
                  onBack={() => setStep("input")}
                  onNext={() => setStep("visual")}
                />
              )}

              {step === "visual" && form && (
                <VisualStep
                  t={t}
                  hasUploadedImage={Boolean(attachment?.isImage)}
                  uploadedPreview={attachment?.isImage ? attachment.previewUrl : null}
                  generatedImageUrl={generatedImageUrl}
                  visualChoice={visualChoice}
                  setVisualChoice={setVisualChoice}
                  generating={generateImage.isPending}
                  onGenerate={handleGenerateImage}
                  onBack={() => setStep("review")}
                  onNext={() => setStep("actions")}
                  error={error}
                />
              )}

              {step === "actions" && (
                <ActionsStep
                  t={t}
                  actions={result?.suggested_next_actions ?? []}
                  saving={createAsset.isPending || createImage.isPending}
                  onBack={() => setStep("visual")}
                  onSave={handleSave}
                  error={error}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

type WizardCopy = ReturnType<typeof getAssetIntelUiCopy>["wizard"];

function StepIndicator({ step, t }: { step: WizardStep; t: WizardCopy }) {
  const order: WizardStep[] = ["input", "review", "visual", "actions"];
  const labels: Record<string, string> = {
    input: t.stepInput,
    review: t.stepReview,
    visual: t.stepVisual,
    actions: t.stepActions,
  };
  const activeIndex = step === "method" || step === "input" || step === "extracting"
    ? 0
    : order.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {order.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= activeIndex ? "bg-[var(--accent-pink)]" : "bg-muted",
            )}
          />
          <span
            className={cn(
              "hidden text-[11px] font-medium sm:inline",
              i <= activeIndex ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {labels[s]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Method step
// ---------------------------------------------------------------------------

function MethodStep({
  t,
  onSelect,
}: {
  t: WizardCopy;
  onSelect: (m: InputMethod) => void;
}) {
  const methods: { key: InputMethod; label: string; icon: React.ReactNode }[] = [
    { key: "receipt", label: t.methodReceipt, icon: <Receipt className="size-5" /> },
    { key: "photo", label: t.methodPhoto, icon: <Camera className="size-5" /> },
    { key: "warranty", label: t.methodWarranty, icon: <ShieldCheck className="size-5" /> },
    { key: "name", label: t.methodName, icon: <Type className="size-5" /> },
    { key: "describe", label: t.methodDescribe, icon: <PencilLine className="size-5" /> },
    { key: "generate", label: t.methodGenerate, icon: <Sparkles className="size-5" /> },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.chooseMethodTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.chooseMethodSubtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {methods.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onSelect(m.key)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border border-border/70 p-4 text-left transition-all",
              "hover:border-[var(--accent-pink)]/50 hover:bg-[var(--accent-pink)]/5 hover:shadow-sm",
            )}
          >
            <span className="text-[var(--accent-pink)]">{m.icon}</span>
            <span className="text-sm font-medium leading-tight">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input step
// ---------------------------------------------------------------------------

function InputStep({
  t,
  method,
  text,
  setText,
  attachment,
  onPickFile,
  clearAttachment,
  fileInputRef,
  canSubmit,
  onSubmit,
  onBack,
  error,
  extractCtaLabel,
}: {
  t: WizardCopy;
  method: InputMethod | null;
  text: string;
  setText: (v: string) => void;
  attachment: AttachmentDraft | null;
  onPickFile: (file: File | undefined) => void;
  clearAttachment: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  canSubmit: boolean;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
  extractCtaLabel?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const wantsUpload =
    method === "receipt" || method === "photo" || method === "warranty";
  const isNameOnly = method === "name";

  return (
    <div className="space-y-4">
      {wantsUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onPickFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-[var(--accent-pink)] bg-[var(--accent-pink)]/5"
              : "border-border/70",
          )}
        >
          {attachment ? (
            <div className="relative">
              {attachment.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.previewUrl}
                  alt="upload preview"
                  className="max-h-40 rounded-lg object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Receipt className="size-5" /> PDF ready
                </div>
              )}
              <button data-control-variant="ghost"
                type="button"
                onClick={clearAttachment}
                className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
                aria-label="Remove"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t.dropzoneHint}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {t.methodPhoto}
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>{isNameOnly ? t.methodName : t.methodDescribe}</Label>
        {isNameOnly ? (
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.namePlaceholder}
          />
        ) : (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.textPlaceholder}
            rows={3}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>
          {t.back}
        </Button>
        <Button
          variant="gradient-pink"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          <Sparkles className="size-4" />
          {extractCtaLabel || t.extractCta}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracting step
// ---------------------------------------------------------------------------

function ExtractingStep({ t }: { t: WizardCopy }) {
  const [stageIndex, setStageIndex] = useState(0);
  const prefersReduced = useHydrationSafeReducedMotion();
  useEffect(() => {
    const id = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, t.extractStages.length - 1));
    }, 900);
    return () => clearInterval(id);
  }, [t.extractStages.length]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12">
      <motion.div
        animate={prefersReduced ? undefined : { rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        className="text-[var(--accent-pink)]"
      >
        <Loader2 className="size-10" />
      </motion.div>
      <div className="h-6 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={stageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-medium text-muted-foreground"
          >
            {t.extractStages[stageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review step
// ---------------------------------------------------------------------------

const CONFIDENCE_TONE: Record<AssetFieldConfidence, string> = {
  high: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  missing: "border-border bg-muted text-muted-foreground",
};

function ConfidenceChip({
  level,
  t,
}: {
  level: AssetFieldConfidence | undefined;
  t: WizardCopy;
}) {
  if (!level) return null;
  const label =
    level === "high"
      ? t.confidenceHigh
      : level === "medium"
        ? t.confidenceMedium
        : level === "low"
          ? t.confidenceLow
          : t.needsInput;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        CONFIDENCE_TONE[level],
      )}
    >
      {label}
    </span>
  );
}

function ReviewStep({
  t,
  resources,
  form,
  setForm,
  result,
  onBack,
  onNext,
}: {
  t: WizardCopy;
  resources: ReturnType<typeof getResourcesUiCopy>;
  form: ReviewForm;
  setForm: React.Dispatch<React.SetStateAction<ReviewForm | null>>;
  result: AssetAutofillResult | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const fc = result?.field_confidence ?? {};
  const update = (patch: Partial<ReviewForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.reviewTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.reviewSubtitle}</p>
      </div>

      <div className="space-y-3">
        <Field label={resources.assetForm.nameLabel} confidence={fc.name} t={t}>
          <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={resources.assetForm.categoryLabel} confidence={fc.category_key} t={t}>
            <Select
              value={form.category_key || undefined}
              onValueChange={(v) =>
                update({ category_key: v && isAssetCategoryKey(v) ? v : "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={resources.assetForm.categoryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORY_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {resources.categories[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={resources.assetForm.purchaseDateLabel} confidence={fc.purchase_date} t={t}>
            <DatePickerInput
              value={form.purchase_date}
              onChange={(v) => update({ purchase_date: v })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={resources.assetForm.purchaseValueLabel} confidence={fc.value} t={t}>
            <Input
              value={form.value}
              inputMode="decimal"
              onChange={(e) => update({ value: e.target.value })}
            />
          </Field>
          <Field label={resources.assetForm.currentValueLabel} confidence={fc.current_value} t={t}>
            <Input
              value={form.current_value}
              inputMode="decimal"
              onChange={(e) => update({ current_value: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={resources.assetForm.serialNumberLabel} confidence={fc.serial_number} t={t}>
            <Input
              value={form.serial_number}
              onChange={(e) => update({ serial_number: e.target.value })}
            />
          </Field>
          <Field label={resources.assetForm.locationLabel} t={t}>
            <Input
              value={form.location}
              onChange={(e) => update({ location: e.target.value })}
            />
          </Field>
        </div>

        <Field label={resources.assetForm.notesLabel} t={t}>
          <Textarea
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={2}
          />
        </Field>
      </div>

      {result?.warnings && result.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          {result.warnings.map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>
          {t.back}
        </Button>
        <Button variant="gradient-pink" onClick={onNext} disabled={!form.name.trim()}>
          {t.next}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  confidence,
  t,
  children,
}: {
  label: string;
  confidence?: AssetFieldConfidence;
  t: WizardCopy;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <ConfidenceChip level={confidence} t={t} />
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual step
// ---------------------------------------------------------------------------

function VisualStep({
  t,
  hasUploadedImage,
  uploadedPreview,
  generatedImageUrl,
  visualChoice,
  setVisualChoice,
  generating,
  onGenerate,
  onBack,
  onNext,
  error,
}: {
  t: WizardCopy;
  hasUploadedImage: boolean;
  uploadedPreview: string | null;
  generatedImageUrl: string | null;
  visualChoice: "generated" | "uploaded" | "icon" | null;
  setVisualChoice: (v: "generated" | "uploaded" | "icon" | null) => void;
  generating: boolean;
  onGenerate: () => void;
  onBack: () => void;
  onNext: () => void;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.visualTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.visualSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hasUploadedImage && (
          <VisualOption
            selected={visualChoice === "uploaded"}
            onClick={() => setVisualChoice("uploaded")}
            title={t.useUploaded}
          >
            {uploadedPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uploadedPreview}
                alt="uploaded"
                className="h-28 w-full rounded-md object-cover"
              />
            )}
          </VisualOption>
        )}

        <VisualOption
          selected={visualChoice === "generated"}
          onClick={() => {
            if (generatedImageUrl) setVisualChoice("generated");
            else onGenerate();
          }}
          title={t.generateImage}
        >
          {generatedImageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImageUrl}
                alt="Asset visual"
                className="h-28 w-full rounded-md object-cover"
              />
            </div>
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-md bg-muted">
              {generating ? (
                <Loader2 className="size-6 animate-spin text-[var(--accent-pink)]" />
              ) : (
                <ImageIcon className="size-7 text-muted-foreground" />
              )}
            </div>
          )}
        </VisualOption>

        <VisualOption
          selected={visualChoice === "icon"}
          onClick={() => setVisualChoice("icon")}
          title={t.useIcon}
        >
          <div className="flex h-28 w-full items-center justify-center rounded-md bg-muted">
            <Package className="size-8 text-muted-foreground/50" />
          </div>
        </VisualOption>
      </div>

      <p className="text-[11px] text-muted-foreground">{t.notProofOfOwnership}</p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>
          {t.back}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setVisualChoice(null);
              onNext();
            }}
          >
            {t.skipVisual}
          </Button>
          <Button variant="gradient-pink" onClick={onNext}>
            {t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VisualOption({
  selected,
  onClick,
  title,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-2 text-left transition-all",
        selected
          ? "border-[var(--accent-pink)] ring-2 ring-[var(--accent-pink)]/30"
          : "border-border/70 hover:border-[var(--accent-pink)]/40",
      )}
    >
      {children}
      <span className="flex items-center justify-between px-1 text-xs font-medium">
        {title}
        {selected && <Check className="size-3.5 text-[var(--accent-pink)]" />}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Actions step
// ---------------------------------------------------------------------------

function ActionsStep({
  t,
  actions,
  saving,
  onBack,
  onSave,
  error,
}: {
  t: WizardCopy;
  actions: string[];
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  error: string | null;
}) {
  const prefersReduced = useHydrationSafeReducedMotion();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t.nextActionsTitle}</h3>
      {actions.length > 0 ? (
        <ul className="space-y-2">
          {actions.map((a, i) => (
            <motion.li
              key={i}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, ease: EASE_OUT_EXPO }}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
            >
              <Check className="size-4 shrink-0 text-[var(--accent-pink)]" />
              {a}
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.nextActionsTitle}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>
          {t.back}
        </Button>
        <Button variant="gradient-pink" onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t.saving}
            </>
          ) : (
            t.saveCta
          )}
        </Button>
      </div>
    </div>
  );
}
