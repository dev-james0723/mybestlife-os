"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  History,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/loading-state";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";
import {
  useCareerVaultFile,
  useDeleteVaultFile,
} from "@/hooks/use-career-vault";
import { downloadVaultObject } from "@/lib/career-vault/storage";
import { CreateShareModal } from "@/components/career-vault/shares/CreateShareModal";
import { FilePreview } from "./FilePreview";
import { FileDetailPanel } from "./FileDetailPanel";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { UsedInOpportunitiesSection } from "./UsedInOpportunitiesSection";

interface VaultDetailViewProps {
  fileId: string;
}

export function VaultDetailView({ fileId }: VaultDetailViewProps) {
  const router = useRouter();
  const localeSlug = useLocaleSlug();
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);

  const coachCopy = getAICoachCopy(language);
  const { data: file, isLoading, isError } = useCareerVaultFile(fileId);
  const deleteMutation = useDeleteVaultFile();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const backHref = withLocalePrefix(localeSlug, "/career/vault");
  const historyHref = withLocalePrefix(
    localeSlug,
    `/career/vault/${fileId}/history`,
  );
  const useWithAIHref = file
    ? withLocalePrefix(
        localeSlug,
        `/career/coach?fileId=${encodeURIComponent(file.id)}&category=${encodeURIComponent(file.category)}`,
      )
    : withLocalePrefix(localeSlug, "/career/coach");

  const handleDownload = useCallback(() => {
    if (!file) return;
    void downloadVaultObject(file.file_path, file.filename);
  }, [file]);

  const handleConfirmDelete = useCallback(async () => {
    if (!file) return;
    try {
      await deleteMutation.mutateAsync(file.id);
      router.push(backHref);
    } finally {
      setDeleteOpen(false);
    }
  }, [file, deleteMutation, router, backHref]);

  if (isLoading) return <LoadingPage />;

  if (isError || !file) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">{copy.errors.fetchFailed}</p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {copy.breadcrumb.vault}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-var(--app-topbar-height,48px))] flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 pb-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={backHref} aria-label={copy.actions.close} />}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.breadcrumb.vault}
        </Button>
        <h1 className="flex-1 truncate text-sm font-medium sm:text-base" title={file.filename}>
          {file.filename}
        </h1>
        <Button
          size="sm"
          render={
            <Link
              href={useWithAIHref}
              aria-label={coachCopy.vaultAction.useWithAI}
            />
          }
        >
          <Sparkles className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">
            {coachCopy.vaultAction.useWithAI}
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={historyHref} aria-label={copy.versions.title} />}
        >
          <History className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">
            {copy.versions.tab}
            {file.current_version > 1 ? ` · v${file.current_version}` : ""}
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShareOpen(true)}
          aria-label={copy.shares.create.submit}
        >
          <Share2 className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.shares.create.submit}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          aria-label={copy.actions.download}
        >
          <Download className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.actions.download}</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          aria-label={copy.actions.delete}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.actions.delete}</span>
        </Button>
      </div>

      {/* Preview + metadata */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl border">
          <FilePreview file={file} copy={copy} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <FileDetailPanel key={file.id} file={file} copy={copy} />
          </div>
          <UsedInOpportunitiesSection fileId={file.id} copy={copy} />
        </aside>
      </div>

      <CreateShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        copy={copy}
        shareType="single_file"
        fileId={file.id}
        subjectLabel={file.filename}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        filename={file.filename}
        pending={deleteMutation.isPending}
        copy={copy}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
