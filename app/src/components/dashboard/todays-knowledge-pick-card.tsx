"use client";

import Link from "next/link";
import { BookOpenText, ChevronRight, LibraryBig, RotateCw } from "lucide-react";

import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { OptimizedThumbnailImage } from "@/components/shared/OptimizedThumbnailImage";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useTodaysKnowledgePick } from "@/hooks/use-todays-knowledge-pick";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

type TodaysKnowledgePickCardProps = {
  dayKey: string;
  userId?: string;
  isUserLoading?: boolean;
};

export function TodaysKnowledgePickCard({
  dayKey,
  userId,
  isUserLoading = false,
}: TodaysKnowledgePickCardProps) {
  const language = useAppStore((state) => state.language);
  const copy = getDashboardCopy(language);
  const knowledgeCopy = getKnowledgeUiCopy(language);
  const knowledgeHref = useLocalizedPath("/knowledge-base");
  const { data: item, isPending, isError, refetch } = useTodaysKnowledgePick({
    userId,
    dayKey,
  });

  if (isUserLoading || (userId && isPending)) {
    return <KnowledgePickSkeleton title={copy.knowledgePickTitle} />;
  }

  if (!userId || isError) {
    return (
      <KnowledgePickState title={copy.knowledgePickTitle} description={copy.knowledgePickUnavailable}>
        {userId ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-11 min-h-11 rounded-xl px-3",
            )}
          >
            <RotateCw className="h-4 w-4" />
            {copy.knowledgePickRetry}
          </button>
        ) : null}
        <Link
          href={knowledgeHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-11 min-h-11 rounded-xl px-3",
          )}
        >
          {copy.knowledgePickBrowse}
        </Link>
      </KnowledgePickState>
    );
  }

  if (!item) {
    return (
      <KnowledgePickState title={copy.knowledgePickTitle} description={copy.knowledgePickEmpty}>
        <Link
          href={knowledgeHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-11 min-h-11 rounded-xl px-3",
          )}
        >
          <LibraryBig className="h-4 w-4" />
          {copy.knowledgePickBrowse}
        </Link>
      </KnowledgePickState>
    );
  }

  const itemHref = `${knowledgeHref}?item=${encodeURIComponent(item.id)}`;
  const typeLabel = knowledgeCopy.typeLabels[item.contentType] ?? item.contentType;

  return (
    <section aria-labelledby="todays-knowledge-pick-title">
      <GlassTintPanel tint="violet" className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem] md:items-stretch">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200">
                <BookOpenText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2
                  id="todays-knowledge-pick-title"
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  {copy.knowledgePickTitle}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {copy.knowledgePickDescription}
                </p>
              </div>
            </div>

            <div className="mt-5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-card/45 px-2.5 py-1">
                  {typeLabel}
                </span>
                {item.sourceDomain ? <span className="truncate">{item.sourceDomain}</span> : null}
              </div>
              <h3 className="mt-3 text-balance text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-3 max-w-[65ch] text-sm leading-relaxed text-foreground/78">
                {item.summary ?? copy.knowledgePickSummaryFallback}
              </p>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <Link
                href={itemHref}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-11 min-h-11 rounded-xl px-4",
                )}
              >
                {copy.knowledgePickOpen}
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href={knowledgeHref}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-11 min-h-11 rounded-xl px-3",
                )}
              >
                {copy.knowledgePickBrowse}
              </Link>
            </div>
          </div>

          <Link
            href={itemHref}
            aria-label={`${copy.knowledgePickOpen}: ${item.title}`}
            className="group relative min-h-40 overflow-hidden rounded-xl border border-border/55 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:min-h-48"
          >
            {item.thumbnailUrl ? (
              <OptimizedThumbnailImage
                src={item.thumbnailUrl}
                alt={item.title}
                sizes="(max-width: 767px) calc(100vw - 3rem), 224px"
                variant="card"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
              />
            ) : (
              <span className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground md:min-h-48">
                <LibraryBig className="h-8 w-8 text-violet-500/70" />
                <span className="text-xs font-medium">{typeLabel}</span>
              </span>
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-white/[0.04]"
            />
          </Link>
        </div>
      </GlassTintPanel>
    </section>
  );
}

function KnowledgePickSkeleton({ title }: { title: string }) {
  return (
    <section aria-label={title} aria-busy="true">
      <GlassTintPanel tint="violet" className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
          <Skeleton className="min-h-40 rounded-xl md:min-h-48" />
        </div>
      </GlassTintPanel>
    </section>
  );
}

function KnowledgePickState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <GlassTintPanel tint="violet" className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
        </div>
      </GlassTintPanel>
    </section>
  );
}
