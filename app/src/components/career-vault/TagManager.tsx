"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Merge,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { normalizeTag } from "@/lib/career-vault/utils";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  useDeleteVaultTag,
  useMergeVaultTags,
  useRenameVaultTag,
  useVaultTagUsage,
} from "@/hooks/use-career-vault-tags";
import type { TagUsage } from "@/types/career-vault";

const POPULAR_LIMIT = 8;

export function TagManager() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();

  const usageQuery = useVaultTagUsage();
  const rename = useRenameVaultTag();
  const merge = useMergeVaultTags();
  const remove = useDeleteVaultTag();

  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<TagUsage | null>(null);
  const [deleting, setDeleting] = useState<TagUsage | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSources, setMergeSources] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState("");

  if (usageQuery.isLoading) return <LoadingPage />;

  const all = usageQuery.data ?? [];
  const normalizedSearch = normalizeTag(search);
  const filtered = normalizedSearch
    ? all.filter((t) => t.name.includes(normalizedSearch))
    : all;
  const popular = [...all]
    .sort((a, b) => b.count - a.count)
    .slice(0, POPULAR_LIMIT);

  const vaultHref = withLocalePrefix(localeSlug, "/career/vault");

  const toggleMergeSource = (tag: string) => {
    setMergeSources((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={vaultHref} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.breadcrumb.vault}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.tags.pageTitle}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMergeSources(new Set());
            setMergeTarget("");
            setMergeOpen(true);
          }}
          disabled={all.length < 2}
        >
          <Merge className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">{copy.tags.actions.merge}</span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.tags.pageDescription}
      </p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={copy.tags.searchPlaceholder}
          className="pl-9"
        />
      </div>

      {all.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-base font-medium">{copy.tags.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.tags.emptyDescription}
          </p>
        </div>
      ) : (
        <>
          {!normalizedSearch && popular.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.tags.popular}
              </h2>
              <TagListCard
                rows={popular}
                copy={copy}
                onRename={setRenaming}
                onDelete={setDeleting}
                localeSlug={localeSlug}
              />
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.tags.all}{" "}
              <span className="ml-1 text-muted-foreground/80">
                {copy.tags.totalCount(all.length)}
              </span>
            </h2>
            <TagListCard
              rows={filtered}
              copy={copy}
              onRename={setRenaming}
              onDelete={setDeleting}
              localeSlug={localeSlug}
            />
          </section>
        </>
      )}

      <RenameDialog
        tag={renaming}
        onClose={() => setRenaming(null)}
        copy={copy}
        onSubmit={async (to) => {
          if (!renaming) return;
          await rename.mutateAsync({ from: renaming.name, to });
          setRenaming(null);
        }}
        pending={rename.isPending}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => (v ? null : setDeleting(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.tags.confirmDelete.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? copy.tags.confirmDelete.description(
                    deleting.name,
                    deleting.count,
                  )
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {copy.tags.confirmDelete.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={async () => {
                if (!deleting) return;
                try {
                  await remove.mutateAsync(deleting.name);
                } finally {
                  setDeleting(null);
                }
              }}
            >
              {copy.tags.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        copy={copy}
        all={all}
        sources={mergeSources}
        target={mergeTarget}
        onToggleSource={toggleMergeSource}
        onTargetChange={setMergeTarget}
        pending={merge.isPending}
        onSubmit={async () => {
          const sources = [...mergeSources];
          const target = normalizeTag(mergeTarget);
          if (!target || sources.length === 0) return;
          await merge.mutateAsync({ sources, target });
          setMergeOpen(false);
          setMergeSources(new Set());
          setMergeTarget("");
        }}
      />
    </div>
  );
}

function TagListCard({
  rows,
  copy,
  onRename,
  onDelete,
  localeSlug,
}: {
  rows: TagUsage[];
  copy: ReturnType<typeof getCareerVaultCopy>;
  onRename: (t: TagUsage) => void;
  onDelete: (t: TagUsage) => void;
  localeSlug: ReturnType<typeof useLocaleSlug>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        {copy.tags.emptyDescription}
      </div>
    );
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((t) => {
        const filesHref = withLocalePrefix(
          localeSlug,
          `/career/vault?tag=${encodeURIComponent(t.name)}`,
        );
        return (
          <li
            key={t.name}
            className="flex items-center gap-2 px-3 py-2.5"
          >
            <Badge variant="secondary" className="font-normal">
              #{t.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {copy.tags.filesWithTag(t.count)}
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={filesHref} />}
              aria-label={copy.tags.actions.viewFiles}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRename(t)}
              aria-label={copy.tags.actions.rename}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(t)}
              aria-label={copy.tags.actions.delete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function RenameDialog({
  tag,
  onClose,
  copy,
  onSubmit,
  pending,
}: {
  tag: TagUsage | null;
  onClose: () => void;
  copy: ReturnType<typeof getCareerVaultCopy>;
  onSubmit: (to: string) => Promise<void>;
  pending: boolean;
}) {
  const [value, setValue] = useState("");

  const key = tag?.name ?? "";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (key !== lastKey) {
    setLastKey(key);
    setValue(tag ? tag.name : "");
  }

  const normalized = normalizeTag(value);
  const canSubmit = !!tag && !!normalized && normalized !== tag.name;

  return (
    <Dialog open={!!tag} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.tags.rename.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-tag">{copy.tags.rename.label}</Label>
          <Input
            id="rename-tag"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={copy.tags.rename.placeholder}
            disabled={pending}
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            {copy.tags.rename.hint} · #{normalized || "…"}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {copy.tags.rename.cancel}
          </Button>
          <Button
            onClick={() => canSubmit && void onSubmit(normalized)}
            disabled={!canSubmit || pending}
          >
            {copy.tags.rename.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({
  open,
  onClose,
  copy,
  all,
  sources,
  target,
  onToggleSource,
  onTargetChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  copy: ReturnType<typeof getCareerVaultCopy>;
  all: TagUsage[];
  sources: Set<string>;
  target: string;
  onToggleSource: (tag: string) => void;
  onTargetChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  pending: boolean;
}) {
  const normalizedTarget = normalizeTag(target);
  const canSubmit =
    sources.size > 0 && !!normalizedTarget && !sources.has(normalizedTarget);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = normalizeTag(search);
    return q ? all.filter((t) => t.name.includes(q)) : all;
  }, [search, all]);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{copy.tags.merge.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {copy.tags.merge.description}
          </p>

          <div className="space-y-2">
            <Label>{copy.tags.merge.sourcesLabel}</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.tags.searchPlaceholder}
              disabled={pending}
            />
            <div className="max-h-52 overflow-y-auto rounded-md border">
              {filtered.map((t) => {
                const checked = sources.has(t.name);
                return (
                  <label
                    key={t.name}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-accent",
                      checked && "bg-accent/60",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggleSource(t.name)}
                      disabled={pending}
                    />
                    <span className="flex-1">#{t.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {copy.tags.filesWithTag(t.count)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merge-target">{copy.tags.merge.targetLabel}</Label>
            <Input
              id="merge-target"
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              placeholder={copy.tags.merge.targetPlaceholder}
              disabled={pending}
            />
            <p className="text-[11px] text-muted-foreground">
              → #{normalizedTarget || "…"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {copy.tags.merge.cancel}
          </Button>
          <Button
            onClick={() => canSubmit && void onSubmit()}
            disabled={!canSubmit || pending}
          >
            {copy.tags.merge.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
