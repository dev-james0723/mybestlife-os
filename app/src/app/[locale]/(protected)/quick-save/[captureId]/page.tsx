import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, FileText, Lightbulb, Trash2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerPageUser } from "@/lib/auth/server-page-user";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getQuickSaveCaptureForUser } from "@/lib/quick-save/server";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";
import { PageShell } from "@/components/shared/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  osControlSizeClassName,
  osFrostedPanelClassName,
  osGlassControlClassName,
  osPrimaryControlClassName,
  osSheenClassName,
  osSolidPanelClassName,
} from "@/components/ui/os-glass";
import { cn } from "@/lib/utils";
import {
  discardQuickSaveAction,
  saveQuickSaveIdeaAction,
  saveQuickSaveKnowledgeAction,
} from "./actions";

type PageProps = { params: Promise<{ locale: string; captureId: string }> };

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isImageRef(mimeType: string | null, name: string): boolean {
  if (mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function QuickSaveReviewPage({ params }: PageProps) {
  const { locale, captureId } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  const supabase = await createServerSupabaseClient();
  const user = await getServerPageUser(supabase);

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  const capture = await getQuickSaveCaptureForUser(supabase, user.id, captureId);
  if (!capture) {
    return (
      <PageShell title="Quick Save" description="This shared item could not be found.">
        <div className={cn(osSolidPanelClassName, "max-w-xl space-y-4 p-5 sm:p-6")}>
          <p className="text-sm leading-6 text-muted-foreground">
            It may have already been saved, discarded, or created under another account.
          </p>
          <Button
            render={<Link href={withLocalePrefix(slug, "/dashboard")} />}
            className={cn(osPrimaryControlClassName, osControlSizeClassName)}
          >
            Back to Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  const canAct = capture.status === "pending" || capture.status === "failed";
  const canSaveKnowledge = Boolean(
    capture.normalized_url || capture.text || capture.title || capture.file_refs.length > 0,
  );
  const canSaveIdea = canSaveKnowledge;

  return (
    <PageShell
      title="Quick Save Review"
      description="Choose where this shared content should live."
      actions={
        <Link
          href={withLocalePrefix(slug, "/dashboard")}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            osGlassControlClassName,
            "h-9 rounded-xl gap-2",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      }
    >
      <div className="grid max-w-3xl gap-4">
        <div
          className={cn(
            osFrostedPanelClassName,
            osSheenClassName,
            "space-y-5 p-4 sm:p-5",
          )}
        >
          <div className="space-y-1.5">
            <h2 className="font-heading text-lg font-semibold leading-snug text-foreground">
              {capture.title || capture.normalized_url || "Shared content"}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {capture.status === "failed"
                ? "The previous save attempt failed. You can try again."
                : "Review the content before saving."}
            </p>
          </div>
          <div className="space-y-4">
            {capture.error_message ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {capture.error_message}
              </div>
            ) : null}

            {capture.normalized_url ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">URL</p>
                <a
                  href={capture.normalized_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {capture.normalized_url}
                </a>
              </div>
            ) : null}

            {capture.text ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">Text</p>
                <div className={cn(osSolidPanelClassName, "max-h-64 overflow-auto whitespace-pre-wrap rounded-xl p-3 text-sm leading-6")}>
                  {capture.text}
                </div>
              </div>
            ) : null}

            {capture.file_refs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Files</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {capture.file_refs.map((file) => {
                    const src = knowledgeFilesProxyUrlFromStoragePath(file.storage_path);
                    return (
                      <div key={file.storage_path} className={cn(osSolidPanelClassName, "overflow-hidden rounded-xl")}>
                        {isImageRef(file.mime_type, file.name) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt={file.name}
                            className="h-44 w-full bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex h-44 items-center justify-center bg-muted/40">
                            <FileText className="h-9 w-9 text-muted-foreground" />
                          </div>
                        )}
                        <div className="space-y-1 p-3">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.mime_type ?? "file"} · {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Separator />

            <div className="grid gap-2 sm:grid-cols-2">
              <form action={saveQuickSaveKnowledgeAction.bind(null, slug, capture.id)}>
                <Button
                  type="submit"
                  className={cn(osPrimaryControlClassName, "h-12 w-full justify-center gap-2 rounded-xl")}
                  disabled={!canAct || !canSaveKnowledge}
                >
                  <BookOpen className="h-4 w-4" />
                  Save to Knowledge Base
                </Button>
              </form>
              <form action={saveQuickSaveIdeaAction.bind(null, slug, capture.id)}>
                <Button
                  type="submit"
                  variant="secondary"
                  className={cn(osGlassControlClassName, "h-12 w-full justify-center gap-2 rounded-xl")}
                  disabled={!canAct || !canSaveIdea}
                >
                  <Lightbulb className="h-4 w-4" />
                  Save to Idea Capture
                </Button>
              </form>
            </div>

            <form action={discardQuickSaveAction.bind(null, slug, capture.id)}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-center gap-2 text-muted-foreground"
                disabled={!canAct}
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
