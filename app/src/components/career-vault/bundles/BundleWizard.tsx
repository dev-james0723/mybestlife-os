"use client";

import { useCallback, useMemo, useRef, useState, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPage } from "@/components/shared/loading-state";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { useCreateBundle, useUpdateBundle } from "@/hooks/use-career-vault-bundles";
import { getBundleTemplate } from "@/lib/career-vault/bundle-templates";
import {
  BUNDLE_MAX_BYTES,
  estimateBundleBytes,
  exportBundle,
  isMergedPdfSafe,
} from "@/lib/career-vault/bundle-exporter";
import type {
  BundleExportFormat,
  BundleTemplateKey,
  CareerVaultFile,
} from "@/types/career-vault";
import { BundleTemplateSelector } from "./BundleTemplateSelector";
import { BundleFileSelector } from "./BundleFileSelector";
import { CoverPageEditor } from "./CoverPageEditor";
import { useAccountDraft } from "@/hooks/use-account-draft";
import { bundleDraftSchema } from "@/lib/form-draft-schemas";
import { LocalDraftStatus } from "@/components/shared/local-draft-status";
import { z } from "zod";

type WizardStep = 1 | 2 | 3 | 4;

export function BundleWizard() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();
  const router = useRouter();
  const params = useSearchParams();

  const filesQuery = useCareerVaultFiles();
  const createMutation = useCreateBundle();
  const updateMutation = useUpdateBundle();
  const savedId = useRef<string | null>(null);
  const busy = useRef(false);

  const fileId = params.get("fileId");
  const initialDraft: z.infer<typeof bundleDraftSchema> = { operationId: null, savedId: null, step: 1, template: null, selectedIds: fileId && /^[0-9a-f-]{36}$/i.test(fileId) ? [fileId] : [], includeCover: true, title: "", subtitle: "", recipient: "", name: "", description: "", format: "zip", filename: "" };
  const { draft, setDraft, clearDraft, ready, storageError } = useAccountDraft("career:bundle", initialDraft, bundleDraftSchema);
  const { step, template, selectedIds, includeCover, title, subtitle, recipient, name, description, format, filename } = draft;
  const operationId = useRef<string | null>(null);
  const setField = useCallback(<K extends keyof typeof draft>(key: K, value: SetStateAction<typeof draft[K]>) => setDraft((previous) => ({ ...previous, [key]: typeof value === "function" ? (value as (current: typeof draft[K]) => typeof draft[K])(previous[key]) : value })), [setDraft]);
  const [exporting, setExporting] = useState(false);

  const allFiles = useMemo(
    () => filesQuery.data ?? [],
    [filesQuery.data],
  );
  const tplDef = getBundleTemplate(template ?? "custom");

  // Default cover title / bundle name when template changes.
  const applyTemplateDefaults = (key: BundleTemplateKey) => {
    const defs = copy.bundles.templateDefaults;
    const defaultCover =
      key === "grad_school"
        ? defs.gradSchoolCover
        : key === "tech_job"
          ? defs.techJobCover
          : key === "speaking"
            ? defs.speakingCover
            : key === "funding"
              ? defs.fundingCover
              : defs.customCover;
    setField("title", (t) => t || defaultCover);
    setField("name", (n) => n || copy.bundles.templates[key]);
  };

  const selectedFiles: CareerVaultFile[] = useMemo(() => {
    const map = new Map<string, CareerVaultFile>();
    for (const f of allFiles) map.set(f.id, f);
    return selectedIds
      .map((id) => map.get(id))
      .filter((f): f is CareerVaultFile => !!f);
  }, [allFiles, selectedIds]);

  const excludedFromMergedPdf = useMemo(
    () => selectedFiles.filter((f) => !isMergedPdfSafe(f.mime_type)).length,
    [selectedFiles],
  );

  const totalBytes = useMemo(
    () => estimateBundleBytes(selectedFiles),
    [selectedFiles],
  );
  const tooLarge = totalBytes > BUNDLE_MAX_BYTES;
  const missingFiles = selectedIds.length - selectedFiles.length;

  const bundlesHref = withLocalePrefix(localeSlug, "/career/vault/bundles");

  if (!ready || filesQuery.isLoading) return <LoadingPage />;
  if (filesQuery.isError) return <div role="alert" className="space-y-3"><p>{language.startsWith("zh") ? "未能載入材料，請重試。" : "Could not load your materials. Please retry."}</p><Button onClick={() => void filesQuery.refetch()}>{language.startsWith("zh") ? "重試" : "Retry"}</Button></div>;

  const defaultFilename = () =>
    (name || copy.bundles.templates[template ?? "custom"] || "bundle")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, 60);

  const persistBundle = async () => {
    if (!template || !selectedFiles.length || missingFiles > 0) throw new Error("Review the selected files before saving.");
    savedId.current ??= draft.savedId;
    if (savedId.current) return updateMutation.mutateAsync({ id: savedId.current, updates: {
      name: name || copy.bundles.templates[template], description: description || null,
      bundle_type: template, file_order: selectedFiles.map((file) => file.id), include_cover_page: includeCover,
      cover_title: title || null, cover_subtitle: subtitle || null, cover_recipient: recipient || null,
    } });
    operationId.current ??= draft.operationId ?? crypto.randomUUID();
    setField("operationId", operationId.current);
    const created = await createMutation.mutateAsync({
      id: operationId.current,
      name: name || copy.bundles.templates[template ?? "custom"],
      description: description || null,
      bundleType: template,
      fileOrder: selectedFiles.map((file) => file.id),
      includeCoverPage: includeCover,
      coverTitle: title || null,
      coverSubtitle: subtitle || null,
      coverRecipient: recipient || null,
    });
    savedId.current = created.id;
    setField("savedId", created.id);
    return created;
  };

  const handleFinishSave = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const created = await persistBundle();
      clearDraft();
      router.push(
        withLocalePrefix(localeSlug, `/career/vault/bundles/${created.id}`),
      );
    } catch {
      /* handled via toast */
    } finally { busy.current = false; }
  };

  const handleFinishExport = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setExporting(true);
      const created = await persistBundle();

      const result = await exportBundle({
        bundle: {
          name: created.name,
          include_cover_page: created.include_cover_page,
          cover_title: created.cover_title,
          cover_subtitle: created.cover_subtitle,
          cover_recipient: created.cover_recipient,
        },
        files: selectedFiles,
        format,
        baseFilename: filename || defaultFilename(),
        coverFilenameLabel: copy.bundles.coverFilename,
        coverDateLabel: new Date().toLocaleDateString(),
      });

      if (result.skippedFiles.length > 0) {
        toast.warning(
          copy.bundles.toasts.exportWithSkipped(result.skippedFiles.length),
        );
      } else {
        toast.success(copy.bundles.toasts.exported(result.filename));
      }
      clearDraft();
      router.push(
        withLocalePrefix(localeSlug, `/career/vault/bundles/${created.id}`),
      );
    } catch {
      toast.error(copy.bundles.toasts.exportFailed);
    } finally {
      setExporting(false);
      busy.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <LocalDraftStatus unavailable={storageError} />
      {missingFiles > 0 && <div role="alert" className="space-y-2 rounded-xl border p-3"><p>{language.startsWith("zh") ? `${missingFiles} 份已選文件目前無法存取。請重試，或重新選擇材料。` : `${missingFiles} selected files are unavailable. Retry or review your material selection.`}</p><Button variant="outline" onClick={() => void filesQuery.refetch()}>{language.startsWith("zh") ? "重試" : "Retry"}</Button><Button variant="outline" onClick={() => { setField("selectedIds", selectedFiles.map((file) => file.id)); setField("step", 2); }}>{language.startsWith("zh") ? "只保留可用材料並檢查" : "Keep available files and review"}</Button></div>}
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={bundlesHref} />}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.bundles.breadcrumb}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.bundles.wizard.title}
        </h1>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4] as const).map((n) => {
          const label =
            n === 1
              ? copy.bundles.wizard.step1
              : n === 2
                ? copy.bundles.wizard.step2
                : n === 3
                  ? copy.bundles.wizard.step3
                  : copy.bundles.wizard.step4;
          const active = step === n;
          const done = step > n;
          return (
            <button data-control-variant="outline" data-selected={active}
              key={n}
              type="button"
              onClick={() => setField("step", n)}
              disabled={exporting || createMutation.isPending || updateMutation.isPending || (n > 1 && !template) || (n > 2 && !selectedFiles.length)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : done
                    ? "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                    : "border-muted-foreground/20 text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="tabular-nums">{n}</span>
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Step body */}
      {step === 1 ? (
        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold">
              {copy.bundles.wizard.step1Title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {copy.bundles.wizard.step1Description}
            </p>
          </header>
          <BundleTemplateSelector
            copy={copy}
            value={template}
            onChange={(k) => {
              setField("template", k);
              applyTemplateDefaults(k);
            }}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold">
              {copy.bundles.wizard.step2Title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {copy.bundles.wizard.step2Description}
            </p>
          </header>
          <BundleFileSelector
            copy={copy}
            allFiles={allFiles}
            selectedIds={selectedIds}
            onChange={(value) => setField("selectedIds", value)}
            suggestedCategories={tplDef.suggestedCategories}
          />

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{copy.bundles.wizard.nameLabel}</Label>
              <Input
                aria-label={copy.bundles.wizard.nameLabel}
                value={name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={copy.bundles.wizard.namePlaceholder}
              />
            </div>
            <div className="space-y-1">
              <Label>{copy.bundles.wizard.descriptionLabel}</Label>
              <Input
                value={description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder={copy.bundles.wizard.descriptionPlaceholder}
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold">
              {copy.bundles.wizard.step3Title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {copy.bundles.wizard.step3Description}
            </p>
          </header>
          <CoverPageEditor
            copy={copy}
            include={includeCover}
            onIncludeChange={(value) => setField("includeCover", value)}
            title={title}
            onTitleChange={(value) => setField("title", value)}
            subtitle={subtitle}
            onSubtitleChange={(value) => setField("subtitle", value)}
            recipient={recipient}
            onRecipientChange={(value) => setField("recipient", value)}
          />
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-3">
          <header>
            <h2 className="text-sm font-semibold">
              {copy.bundles.wizard.step4Title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {copy.bundles.wizard.step4Description}
            </p>
          </header>

          <ol className="list-inside list-decimal space-y-1 text-sm">{selectedFiles.map((file) => <li key={file.id} className="break-words">{file.filename}</li>)}</ol>
          <div className="space-y-2">
            <Label>{copy.bundles.wizard.formatLabel}</Label>
            <Select
              value={format}
              itemToStringLabel={(value) => value === "zip" ? copy.bundles.wizard.formatZip : copy.bundles.wizard.formatMergedPdf}
              onValueChange={(v) => v && setField("format", v as BundleExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zip">
                  {copy.bundles.wizard.formatZip}
                </SelectItem>
                <SelectItem value="merged_pdf">
                  {copy.bundles.wizard.formatMergedPdf}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {format === "zip"
                ? copy.bundles.wizard.formatZipHint
                : copy.bundles.wizard.formatMergedPdfHint}
            </p>
            {format === "merged_pdf" && excludedFromMergedPdf > 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {copy.bundles.wizard.mergedPdfWarning(excludedFromMergedPdf)}
              </p>
            ) : null}
            {tooLarge ? (
              <p className="text-xs text-destructive">
                {copy.bundles.wizard.sizeWarning}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label>{copy.bundles.wizard.filenameLabel}</Label>
            <Input
              value={filename}
              onChange={(e) => setField("filename", e.target.value)}
              placeholder={defaultFilename()}
            />
          </div>

          <Textarea
            value={description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={copy.bundles.wizard.descriptionPlaceholder}
            rows={2}
          />
        </section>
      ) : null}

      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
        <Button
          variant="ghost"
          onClick={() => setField("step", (s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
          disabled={step === 1 || exporting || createMutation.isPending || updateMutation.isPending}
        >
          {copy.bundles.wizard.back}
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setField("step", (s) => ((s + 1) as WizardStep))}
            disabled={!template || (step === 2 && selectedFiles.length === 0)}
          >
            {copy.bundles.wizard.next}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleFinishSave}
              disabled={createMutation.isPending || updateMutation.isPending || exporting || !template || selectedFiles.length === 0}
            >
              {createMutation.isPending
                ? copy.bundles.wizard.saving
                : copy.bundles.wizard.finish}
            </Button>
            <Button
              onClick={handleFinishExport}
              disabled={createMutation.isPending || updateMutation.isPending || exporting || !template || selectedFiles.length === 0}
            >
              {exporting
                ? copy.bundles.wizard.saving
                : copy.bundles.wizard.finishAndExport}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
