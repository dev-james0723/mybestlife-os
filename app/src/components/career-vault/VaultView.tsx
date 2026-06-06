"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  Link2,
  List,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  CareerMetricCard,
  CareerMetricGrid,
  CareerSectionPanel,
} from "@/components/career/career-page-ui";
import { useAppStore } from "@/stores/app-store";
import { useCareerVaultStore } from "@/stores/career-vault-store";
import {
  useCareerVaultFiles,
  useDeleteVaultFile,
  useToggleVaultStar,
} from "@/hooks/use-career-vault";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { downloadVaultObject } from "@/lib/career-vault/storage";
import { isMissingCareerVaultTableError } from "@/lib/repositories/career-vault";
import { formatFileSize } from "@/lib/career-vault/utils";
import type {
  CareerVaultFile,
  VaultSortKey,
  VaultViewMode,
  VaultCategoryFilter,
} from "@/types/career-vault";
import { FileGrid } from "./FileGrid";
import { FileList } from "./FileList";
import { CategoryFilter } from "./CategoryFilter";
import { QuickAccessSection } from "./QuickAccessSection";
import { VaultEmptyState } from "./EmptyState";
import { UploadModal } from "./UploadModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

export function VaultView() {
  const router = useRouter();
  const localeSlug = useLocaleSlug();
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);

  const {
    viewMode,
    sortBy,
    selectedCategory,
    searchQuery,
    uploadOpen,
    deleteTargetId,
    setViewMode,
    setSortBy,
    setSelectedCategory,
    setSearchQuery,
    openUpload,
    closeUpload,
    setDeleteTargetId,
  } = useCareerVaultStore();

  const {
    data: files = [],
    isLoading,
    isError,
    error,
    refetch,
    authLoading,
  } = useCareerVaultFiles();
  const deleteMutation = useDeleteVaultFile();
  const toggleStar = useToggleVaultStar();

  const detailHref = useCallback(
    (id: string) => withLocalePrefix(localeSlug, `/career/vault/${id}`),
    [localeSlug],
  );

  const deleteTarget = useMemo(
    () => files.find((f) => f.id === deleteTargetId) ?? null,
    [files, deleteTargetId],
  );

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((f) => {
      if (selectedCategory !== "all" && f.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        f.filename.toLowerCase().includes(q) ||
        f.original_filename.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [files, searchQuery, selectedCategory]);

  const sortedFiles = useMemo(() => {
    const arr = [...filteredFiles];
    switch (sortBy) {
      case "name":
        return arr.sort((a, b) =>
          a.filename.localeCompare(b.filename, undefined, { sensitivity: "base" }),
        );
      case "size":
        return arr.sort((a, b) => b.file_size - a.file_size);
      case "category":
        return arr.sort((a, b) => a.category.localeCompare(b.category));
      case "recent":
      default:
        return arr.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
    }
  }, [filteredFiles, sortBy]);

  const starred = useMemo(() => files.filter((f) => f.is_starred), [files]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<VaultCategoryFilter, number>> = {
      all: files.length,
    };
    for (const f of files) {
      counts[f.category] = (counts[f.category] ?? 0) + 1;
    }
    return counts;
  }, [files]);

  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + f.file_size, 0),
    [files],
  );

  const handleEdit = useCallback(
    (file: CareerVaultFile) => {
      router.push(detailHref(file.id));
    },
    [router, detailHref],
  );

  const handleDownload = useCallback((file: CareerVaultFile) => {
    void downloadVaultObject(file.file_path, file.filename);
  }, []);

  if (authLoading || isLoading) return <LoadingPage />;

  if (isError) {
    const detail =
      error instanceof Error ? error.message : String(error ?? "");
    const missingMigrations = isMissingCareerVaultTableError(error);
    return (
      <PageShell title={copy.pageTitle} description={copy.pageDescription}>
        <CareerSectionPanel>
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm font-medium text-destructive">
              {copy.errors.fetchFailed}
            </p>
            {missingMigrations ? (
              <div className="w-full rounded-lg border bg-muted/30 p-4 text-left">
                <p className="text-sm font-medium text-foreground">
                  {copy.errors.migrationTitle}
                </p>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {copy.errors.migrationSteps}
                </pre>
              </div>
            ) : detail ? (
              <p className="break-words text-xs text-muted-foreground">{detail}</p>
            ) : null}
            {!missingMigrations ? (
              <p className="text-xs text-muted-foreground">{copy.errors.fetchHint}</p>
            ) : null}
            <OSControl type="button" onClick={() => void refetch()}>
              {copy.errors.retry}
            </OSControl>
          </div>
        </CareerSectionPanel>
      </PageShell>
    );
  }

  const hasAny = files.length > 0;
  const categoryTotal = new Set(files.map((file) => file.category)).size;

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageDescription}
      actions={
        <>
          <OSControl
            render={
              <Link
                href={withLocalePrefix(localeSlug, "/career/vault/bundles")}
                aria-label={copy.bundles.pageTitle}
              />
            }
            className="gap-2"
          >
            <Package className="size-4" aria-hidden />
            <span className="hidden sm:inline">{copy.bundles.pageTitle}</span>
            <span className="sm:hidden">Bundles</span>
          </OSControl>
          <OSControl
            render={
              <Link
                href={withLocalePrefix(localeSlug, "/career/vault/shares")}
                aria-label={copy.shares.pageTitle}
              />
            }
            className="gap-2"
          >
            <Link2 className="size-4" aria-hidden />
            <span className="hidden sm:inline">{copy.shares.pageTitle}</span>
            <span className="sm:hidden">Shares</span>
          </OSControl>
          <OSPrimaryAction onClick={openUpload} className="gap-2">
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{copy.uploadButton}</span>
            <span className="sm:hidden">{copy.uploadShort}</span>
          </OSPrimaryAction>
        </>
      }
    >
      <div className="space-y-5">
        {hasAny ? (
          <CareerMetricGrid>
            <CareerMetricCard
              icon={Archive}
              label="Total assets"
              value={files.length}
              description="Reusable resumes, portfolios, credentials, references, and career files."
            />
            <CareerMetricCard
              icon={FolderOpen}
              label="Quick access"
              value={starred.length}
              description="Starred files that are ready to reuse."
            />
            <CareerMetricCard
              icon={HardDrive}
              label="Storage"
              value={formatFileSize(totalBytes)}
              description="Total size across the files in this vault."
            />
            <CareerMetricCard
              icon={Package}
              label="Categories"
              value={categoryTotal}
              description="Asset groups represented in your library."
            />
          </CareerMetricGrid>
        ) : null}

        <CareerSectionPanel
          title="Find and organize assets"
          description="Search by file name, tag, or description; then narrow the library by category, sort order, and view."
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-11 rounded-xl border-white/50 bg-white/68 pl-9 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                aria-label={copy.searchPlaceholder}
              />
            </div>

            {hasAny ? (
              <CategoryFilter
                value={selectedCategory}
                onChange={setSelectedCategory}
                copy={copy}
                counts={categoryCounts}
              />
            ) : null}
          </div>
        </CareerSectionPanel>

        {!hasAny ? (
          <VaultEmptyState copy={copy} onUpload={openUpload} />
        ) : (
          <>
            {starred.length > 0 && selectedCategory === "all" && !searchQuery.trim() ? (
              <QuickAccessSection
                files={starred}
                copy={copy}
                detailHref={detailHref}
                onToggleStar={toggleStar}
                onDownload={handleDownload}
                onEdit={handleEdit}
                onRequestDelete={(f) => setDeleteTargetId(f.id)}
              />
            ) : null}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {copy.sections.allFiles}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.stats.filesCount(sortedFiles.length)} shown
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={(v) => v && setSortBy(v as VaultSortKey)}
                  >
                    <SelectTrigger className="h-11 w-auto gap-1 rounded-xl border-white/50 bg-white/68 px-3 text-sm shadow-sm sm:h-9 sm:px-2 sm:text-xs dark:border-white/10 dark:bg-white/[0.04]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">{copy.sort.recent}</SelectItem>
                      <SelectItem value="name">{copy.sort.name}</SelectItem>
                      <SelectItem value="size">{copy.sort.size}</SelectItem>
                      <SelectItem value="category">{copy.sort.category}</SelectItem>
                    </SelectContent>
                  </Select>
                  <ViewToggle
                    mode={viewMode}
                    onChange={setViewMode}
                    copy={copy}
                  />
                </div>
              </div>

              {sortedFiles.length === 0 ? (
                <VaultEmptyState
                  copy={copy}
                  onUpload={openUpload}
                  variant="noResults"
                />
              ) : viewMode === "grid" ? (
                <FileGrid
                  files={sortedFiles}
                  copy={copy}
                  detailHref={detailHref}
                  onToggleStar={toggleStar}
                  onDownload={handleDownload}
                  onEdit={handleEdit}
                  onRequestDelete={(f) => setDeleteTargetId(f.id)}
                />
              ) : (
                <FileList
                  files={sortedFiles}
                  copy={copy}
                  detailHref={detailHref}
                  onToggleStar={toggleStar}
                  onDownload={handleDownload}
                  onEdit={handleEdit}
                  onRequestDelete={(f) => setDeleteTargetId(f.id)}
                />
              )}
            </section>
          </>
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={(v) => (v ? openUpload() : closeUpload())}
        copy={copy}
        initialCategory={
          selectedCategory !== "all" ? selectedCategory : undefined
        }
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTargetId(null);
        }}
        filename={deleteTarget?.filename ?? ""}
        pending={deleteMutation.isPending}
        copy={copy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
          } finally {
            setDeleteTargetId(null);
          }
        }}
      />
    </PageShell>
  );
}

function ViewToggle({
  mode,
  onChange,
  copy,
}: {
  mode: VaultViewMode;
  onChange: (m: VaultViewMode) => void;
  copy: ReturnType<typeof getCareerVaultCopy>;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={copy.view.toggleLabel}
      className="inline-flex items-center rounded-md bg-muted/60 p-0.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "grid"}
        aria-label={copy.view.grid}
        onClick={() => onChange("grid")}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-[6px] transition-colors sm:h-7 sm:w-7",
          mode === "grid"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "list"}
        aria-label={copy.view.list}
        onClick={() => onChange("list")}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-[6px] transition-colors sm:h-7 sm:w-7",
          mode === "list"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
