"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCompare, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/loading-state";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { useAppStore } from "@/stores/app-store";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  createVaultSignedUrl,
  downloadVaultObject,
} from "@/lib/career-vault/storage";
import {
  useCareerVaultFile,
} from "@/hooks/use-career-vault";
import {
  useFileVersions,
  useRestoreVersion,
} from "@/hooks/use-career-vault-versions";
import type { CareerVaultFileVersion } from "@/types/career-vault";
import { UploadNewVersionModal } from "./UploadNewVersionModal";
import { VersionCard } from "./VersionCard";

interface VersionTimelineProps {
  fileId: string;
}

const PAGE_SIZE = 10;

export function VersionTimeline({ fileId }: VersionTimelineProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();

  const fileQuery = useCareerVaultFile(fileId);
  const versionsQuery = useFileVersions(fileId);
  const restoreMutation = useRestoreVersion();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] =
    useState<CareerVaultFileVersion | null>(null);

  const versions = useMemo(
    () => versionsQuery.data ?? [],
    [versionsQuery.data],
  );
  const visibleVersions = useMemo(
    () => versions.slice(0, visibleCount),
    [versions, visibleCount],
  );

  if (fileQuery.isLoading || versionsQuery.isLoading) return <LoadingPage />;
  const file = fileQuery.data;
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground">
        {copy.errors.fetchFailed}
      </div>
    );
  }

  const vaultHref = withLocalePrefix(localeSlug, "/career/vault");
  const detailHref = withLocalePrefix(localeSlug, `/career/vault/${fileId}`);
  const compareHref = withLocalePrefix(
    localeSlug,
    `/career/vault/${fileId}/compare`,
  );

  const handleOpenInNewTab = async (path: string) => {
    try {
      const url = await createVaultSignedUrl(path, 60 * 10);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={detailHref} aria-label={copy.actions.close} />}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          <span className="truncate max-w-[180px] sm:max-w-[320px]">
            {file.filename}
          </span>
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.versions.title}
        </h1>
        {versions.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={compareHref} />}
          >
            <GitCompare className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{copy.versions.compareBtn}</span>
          </Button>
        ) : null}
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">
            {copy.versions.uploadNew.trigger}
          </span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{copy.versions.subtitle}</p>

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <VersionCard
          copy={copy}
          current={{ file }}
          isLast={versions.length === 0}
          onView={() => handleOpenInNewTab(file.file_path)}
          onDownload={() =>
            void downloadVaultObject(file.file_path, file.filename)
          }
        />

        {versions.length === 0 ? (
          <p className="ml-10 text-sm text-muted-foreground">
            {copy.versions.empty}
          </p>
        ) : null}

        {visibleVersions.map((v, i) => (
          <VersionCard
            key={v.id}
            copy={copy}
            past={{ version: v }}
            isLast={i === visibleVersions.length - 1}
            onView={() => handleOpenInNewTab(v.file_path)}
            onDownload={() =>
              void downloadVaultObject(v.file_path, v.filename)
            }
            onRestore={() => setRestoreTarget(v)}
          />
        ))}

        {versions.length > visibleCount ? (
          <div className="pt-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              {copy.versions.loadMore}
            </Button>
          </div>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        <Link href={vaultHref} className="underline-offset-4 hover:underline">
          ← {copy.breadcrumb.vault}
        </Link>
      </p>

      <UploadNewVersionModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        file={file}
        copy={copy}
      />

      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(v) => (v ? null : setRestoreTarget(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.versions.confirmRestore.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget
                ? copy.versions.confirmRestore.description(
                    restoreTarget.version_number,
                  )
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>
              {copy.versions.confirmRestore.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreMutation.isPending}
              onClick={async () => {
                if (!restoreTarget) return;
                try {
                  await restoreMutation.mutateAsync({
                    fileId,
                    versionId: restoreTarget.id,
                  });
                } finally {
                  setRestoreTarget(null);
                }
              }}
            >
              {copy.versions.confirmRestore.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
