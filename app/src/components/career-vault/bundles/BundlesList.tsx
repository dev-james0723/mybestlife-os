"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  FilePlus2,
  Package,
  PencilLine,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { useAppStore } from "@/stores/app-store";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  useCareerVaultBundles,
  useDeleteBundle,
  useDuplicateBundle,
} from "@/hooks/use-career-vault-bundles";
import { CreateShareModal } from "@/components/career-vault/shares/CreateShareModal";
import type { CareerVaultBundle } from "@/types/career-vault";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

export function BundlesList() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();
  const router = useRouter();

  const bundlesQuery = useCareerVaultBundles();
  const duplicateMutation = useDuplicateBundle();
  const deleteMutation = useDeleteBundle();

  const [deleteTarget, setDeleteTarget] = useState<CareerVaultBundle | null>(
    null,
  );
  const [shareTarget, setShareTarget] = useState<CareerVaultBundle | null>(null);

  const vaultHref = withLocalePrefix(localeSlug, "/career/vault");
  const newBundleHref = withLocalePrefix(
    localeSlug,
    "/career/vault/bundles/new",
  );

  const bundles = useMemo(() => bundlesQuery.data ?? [], [bundlesQuery.data]);

  if (bundlesQuery.isLoading) return <LoadingPage />;

  const handleDuplicate = async (id: string) => {
    try {
      const created = await duplicateMutation.mutateAsync(id);
      toast.success(copy.bundles.toasts.created);
      router.push(
        withLocalePrefix(localeSlug, `/career/vault/bundles/${created.id}`),
      );
    } catch {
      toast.error(copy.bundles.toasts.updateFailed);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
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
          {copy.bundles.pageTitle}
        </h1>
        <Button size="sm" render={<Link href={newBundleHref} />}>
          <FilePlus2 className="mr-1 h-4 w-4" />
          {copy.bundles.newButton}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.bundles.pageDescription}
      </p>

      {bundles.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {copy.bundles.empty.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.bundles.empty.description}
          </p>
          <Button
            className="mt-4"
            size="sm"
            render={<Link href={newBundleHref} />}
          >
            {copy.bundles.empty.cta}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bundles.map((b) => {
            const detailHref = withLocalePrefix(
              localeSlug,
              `/career/vault/bundles/${b.id}`,
            );
            const fileCount = b.file_order.length;
            return (
              <article
                key={b.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={detailHref}
                      className="truncate text-sm font-semibold hover:underline"
                    >
                      {b.name}
                    </Link>
                    {b.bundle_type ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {copy.bundles.templates[b.bundle_type]}
                      </p>
                    ) : null}
                  </div>
                </div>

                {b.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {b.description}
                  </p>
                ) : null}

                <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                  <li>{copy.bundles.card.fileCount(fileCount)}</li>
                  <li>
                    {b.last_exported_at
                      ? copy.bundles.card.lastExported(
                          formatDate(b.last_exported_at),
                        )
                      : copy.bundles.card.neverExported}
                  </li>
                </ul>

                <div className="mt-auto flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={detailHref} />}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    {copy.bundles.card.export}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<Link href={detailHref} />}
                  >
                    <PencilLine className="mr-1 h-3.5 w-3.5" />
                    {copy.bundles.card.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicate(b.id)}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {copy.bundles.card.duplicate}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShareTarget(b)}
                  >
                    <Share2 className="mr-1 h-3.5 w-3.5" />
                    {copy.bundles.card.share}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(b)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {copy.bundles.card.delete}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.bundles.card.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}
            </AlertDialogDescription>
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
        open={!!shareTarget}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
        copy={copy}
        shareType="bundle"
        bundleId={shareTarget?.id}
        subjectLabel={shareTarget?.name}
      />
    </div>
  );
}
