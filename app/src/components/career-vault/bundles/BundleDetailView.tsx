"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Share2, Trash2 } from "lucide-react";
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
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  useCareerVaultBundle,
  useDeleteBundle,
  useMarkBundleExported,
  useUpdateBundle,
} from "@/hooks/use-career-vault-bundles";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import {
  BUNDLE_MAX_BYTES,
  estimateBundleBytes,
  exportBundle,
  isMergedPdfSafe,
} from "@/lib/career-vault/bundle-exporter";
import type { BundleExportFormat, CareerVaultFile } from "@/types/career-vault";
import { BundleFileSelector } from "./BundleFileSelector";
import { CoverPageEditor } from "./CoverPageEditor";
import { CreateShareModal } from "@/components/career-vault/shares/CreateShareModal";

interface BundleDetailViewProps {
  bundleId: string;
}

export function BundleDetailView({ bundleId }: BundleDetailViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();
  const router = useRouter();

  const bundleQuery = useCareerVaultBundle(bundleId);
  const filesQuery = useCareerVaultFiles();
  const updateMutation = useUpdateBundle();
  const deleteMutation = useDeleteBundle();
  const markExported = useMarkBundleExported();

  const bundle = bundleQuery.data;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [includeCover, setIncludeCover] = useState(true);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fileOrder, setFileOrder] = useState<string[]>([]);
  const [format, setFormat] = useState<BundleExportFormat>("zip");
  const [filename, setFilename] = useState("");
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const seededBundleId = useRef<string | null>(null);
  useEffect(() => {
    if (!bundle || seededBundleId.current === bundle.id) return;
    seededBundleId.current = bundle.id;
    setName(bundle.name);
    setDescription(bundle.description ?? "");
    setIncludeCover(bundle.include_cover_page);
    setTitle(bundle.cover_title ?? "");
    setSubtitle(bundle.cover_subtitle ?? "");
    setRecipient(bundle.cover_recipient ?? "");
    setFileOrder([...bundle.file_order]);
  }, [bundle]);

  const bundlesHref = withLocalePrefix(localeSlug, "/career/vault/bundles");

  const allFiles = useMemo(
    () => filesQuery.data ?? [],
    [filesQuery.data],
  );
  const orderedFiles: CareerVaultFile[] = useMemo(() => {
    const byId = new Map<string, CareerVaultFile>();
    for (const f of allFiles) byId.set(f.id, f);
    return fileOrder
      .map((id) => byId.get(id))
      .filter((f): f is CareerVaultFile => !!f);
  }, [allFiles, fileOrder]);

  const excludedFromMergedPdf = useMemo(
    () => orderedFiles.filter((f) => !isMergedPdfSafe(f.mime_type)).length,
    [orderedFiles],
  );

  const totalBytes = estimateBundleBytes(orderedFiles);
  const tooLarge = totalBytes > BUNDLE_MAX_BYTES;

  if (bundleQuery.isLoading || filesQuery.isLoading) {
    return <LoadingPage />;
  }

  if (bundleQuery.isError || filesQuery.isError || !bundle) return <div role="alert" className="space-y-3"><p>{language.startsWith("zh") ? "未能載入套件或材料。請重試。" : "Could not load the bundle or its materials. Please retry."}</p><Button onClick={() => { void bundleQuery.refetch(); void filesQuery.refetch(); }}>{language.startsWith("zh") ? "重試" : "Retry"}</Button></div>;

  const missingFiles = fileOrder.length - orderedFiles.length;
  const defaultFilename = () =>
    (name || "bundle")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, 60);

  const handleSave = async () => {
    if (updateMutation.isPending || !name.trim()) return;
    try { await updateMutation.mutateAsync({
      id: bundle.id,
      updates: {
        name,
        description: description || null,
        file_order: fileOrder,
        include_cover_page: includeCover,
        cover_title: title || null,
        cover_subtitle: subtitle || null,
        cover_recipient: recipient || null,
      },
    });
    } catch { /* Keep the edit state; mutation reports the error. */ }
  };

  const handleExport = async () => {
    if (exporting || tooLarge || missingFiles) return;
    try {
      setExporting(true);
      const files = orderedFiles;
      const result = await exportBundle({
        bundle: {
          name,
          include_cover_page: includeCover,
          cover_title: title || null,
          cover_subtitle: subtitle || null,
          cover_recipient: recipient || null,
        },
        files,
        format,
        baseFilename: filename || defaultFilename(),
        coverFilenameLabel: copy.bundles.coverFilename,
        coverDateLabel: new Date().toLocaleDateString(),
      });
      try {
        await markExported.mutateAsync(bundle.id);
      } catch {
        toast.warning(language.startsWith("zh") ? "檔案已下載，但未能更新匯出時間。" : "Download completed, but the export timestamp could not be updated.");
        return;
      }
      if (result.skippedFiles.length > 0) {
        toast.warning(
          copy.bundles.toasts.exportWithSkipped(result.skippedFiles.length),
        );
      } else {
        toast.success(copy.bundles.toasts.exported(result.filename));
      }
    } catch {
      toast.error(copy.bundles.toasts.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(bundle.id);
      router.push(bundlesHref);
      setConfirmDelete(false);
    } catch { /* Mutation reports the error; keep the confirmation for retry. */ }
  };

  return (
    <div className="space-y-6">
      {missingFiles > 0 && <p role="alert">{language.startsWith("zh") ? "部分材料已無法存取。匯出前請重新選擇材料。" : "Some materials are unavailable. Review your file selection before exporting."}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={bundlesHref} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.bundles.breadcrumb}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {name}
        </h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="mr-1 h-4 w-4" />
          {copy.bundles.card.share}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {copy.bundles.card.delete}
        </Button>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          {copy.bundles.wizard.nameLabel}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{copy.bundles.wizard.nameLabel}</Label>
            <Input aria-label={copy.bundles.wizard.nameLabel} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{copy.bundles.wizard.descriptionLabel}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={copy.bundles.wizard.descriptionPlaceholder}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          {copy.bundles.detail.filesHeading}
        </h2>
        <BundleFileSelector
          copy={copy}
          allFiles={allFiles}
          selectedIds={fileOrder}
          onChange={setFileOrder}
        />
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          {copy.bundles.detail.coverHeading}
        </h2>
        <CoverPageEditor
          copy={copy}
          include={includeCover}
          onIncludeChange={setIncludeCover}
          title={title}
          onTitleChange={setTitle}
          subtitle={subtitle}
          onSubtitleChange={setSubtitle}
          recipient={recipient}
          onRecipientChange={setRecipient}
        />
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          {copy.bundles.detail.exportHeading}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{copy.bundles.wizard.formatLabel}</Label>
            <Select
              value={format}
              onValueChange={(v) => v && setFormat(v as BundleExportFormat)}
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
          </div>

          <div className="space-y-1">
            <Label>{copy.bundles.wizard.filenameLabel}</Label>
            <Input
              aria-label={copy.bundles.wizard.filenameLabel}
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder={defaultFilename()}
            />
          </div>
        </div>

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

        {orderedFiles.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            {copy.bundles.detail.noFiles}
          </div>
        ) : null}

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={copy.bundles.wizard.descriptionPlaceholder}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={updateMutation.isPending || !name.trim()}
          >
            {updateMutation.isPending
              ? copy.bundles.wizard.saving
              : copy.bundles.wizard.finish}
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || tooLarge || missingFiles > 0 || orderedFiles.length === 0}
          >
            <Download className="mr-1 h-4 w-4" />
            {exporting
              ? copy.bundles.wizard.saving
              : copy.bundles.card.export}
          </Button>
        </div>
      </section>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.bundles.card.delete}</AlertDialogTitle>
            <AlertDialogDescription>{bundle.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {copy.bundles.wizard.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
            >
              {copy.bundles.card.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        copy={copy}
        shareType="bundle"
        bundleId={bundle.id}
        subjectLabel={bundle.name}
      />
    </div>
  );
}
