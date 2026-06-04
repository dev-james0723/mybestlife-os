"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  LayoutGrid,
  Link2,
  List,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPage } from "@/components/shared/loading-state";
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
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
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
          <p className="text-xs text-muted-foreground break-words">{detail}</p>
        ) : null}
        {!missingMigrations ? (
          <p className="text-xs text-muted-foreground">{copy.errors.fetchHint}</p>
        ) : null}
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          {copy.errors.retry}
        </Button>
      </div>
    );
  }

  const hasAny = files.length > 0;

  return (
    <div className="space-y-6">
      {/* Header: breadcrumb + upload */}
      <div className="flex items-center gap-2">
        <Link
          href={withLocalePrefix(localeSlug, "/career")}
          className="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:min-h-0 sm:min-w-0 sm:px-1.5 sm:py-1 sm:text-xs"
          aria-label={copy.breadcrumb.career}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {copy.breadcrumb.career}
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.pageTitle}
        </h1>
        <Button
          variant="outline"
          size="sm"
          className="h-11 min-w-11 px-3 sm:h-7 sm:min-w-0 sm:px-2.5"
          render={
            <Link
              href={withLocalePrefix(localeSlug, "/career/vault/bundles")}
              aria-label={copy.bundles.pageTitle}
            />
          }
        >
          <Package className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.bundles.pageTitle}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 min-w-11 px-3 sm:h-7 sm:min-w-0 sm:px-2.5"
          render={
            <Link
              href={withLocalePrefix(localeSlug, "/career/vault/shares")}
              aria-label={copy.shares.pageTitle}
            />
          }
        >
          <Link2 className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.shares.pageTitle}</span>
        </Button>
        <Button onClick={openUpload} size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5">
          <Plus className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.uploadButton}</span>
          <span className="sm:hidden">{copy.uploadShort}</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="h-11 pl-9 sm:h-9"
          aria-label={copy.searchPlaceholder}
        />
      </div>

      {/* Stats */}
      {hasAny ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{copy.stats.filesCount(files.length)}</span>
          <span aria-hidden>·</span>
          <span>{copy.stats.totalSize(formatFileSize(totalBytes))}</span>
        </div>
      ) : null}

      {/* Category pills */}
      {hasAny ? (
        <CategoryFilter
          value={selectedCategory}
          onChange={setSelectedCategory}
          copy={copy}
          counts={categoryCounts}
        />
      ) : null}

      {/* Body */}
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.sections.allFiles}
              </h2>
              <div className="flex items-center gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(v) => v && setSortBy(v as VaultSortKey)}
                >
                  <SelectTrigger className="h-11 w-auto gap-1 border-none bg-muted/60 px-3 text-sm sm:h-8 sm:px-2 sm:text-xs">
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
    </div>
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
