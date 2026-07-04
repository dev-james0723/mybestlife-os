"use client";

import type { ReactNode } from "react";
import { useKnowledgeStore, type KnowledgeSortKey } from "@/stores/knowledge-store";
import { typeColors, type KnowledgeItem } from "@/types/knowledge";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  formatKnowledgeDate,
  formatKnowledgeRelativeAge,
  getKnowledgeUiCopy,
} from "@/lib/i18n/knowledge-ui";
import { getCategoryLabel, getSourceTypeInfo } from "@/lib/knowledge/labels";
import {
  collectionNamesForItem,
  getCardSummaryPreview,
} from "@/lib/knowledge/knowledge-list-utils";
import { getKnowledgeDisplayContentType } from "@/lib/knowledge/display-content-type";
import { scoreKnowledgeItem } from "@/lib/knowledgeMatching";
import { getKnowledgeUploadBadgePresentation } from "@/lib/knowledge/file-kind-presentation";
import { SourceTypeBadge } from "./source/SourceTypeBadge";
import { OptimizedThumbnailImage } from "@/components/shared/OptimizedThumbnailImage";
import { motion } from "framer-motion";

interface KnowledgeTableViewProps {
  items: KnowledgeItem[];
}

function KnowledgeSortHead({
  sortBy,
  setSortBy,
  sk,
  children,
  className,
}: {
  sortBy: KnowledgeSortKey;
  setSortBy: (sortKey: KnowledgeSortKey) => void;
  sk: KnowledgeSortKey;
  children: ReactNode;
  className?: string;
}) {
  const active = sortBy === sk;
  return (
    <th className={cn("pb-2 font-medium text-muted-foreground", className)}>
      <button
        type="button"
        className={cn(
          "flex max-w-full items-center gap-1 truncate text-left hover:text-foreground",
          active && "text-foreground",
        )}
        onClick={() => setSortBy(sk)}
      >
        <span className="truncate">{children}</span>
        {active ? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-70" /> : null}
      </button>
    </th>
  );
}

export function KnowledgeTableView({ items }: KnowledgeTableViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const selectItem = useKnowledgeStore((s) => s.selectItem);
  const sortBy = useKnowledgeStore((s) => s.sortBy);
  const setSortBy = useKnowledgeStore((s) => s.setSortBy);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const searchQuery = useKnowledgeStore((s) => s.searchQuery);

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <KnowledgeSortHead sortBy={sortBy} setSortBy={setSortBy} sk="contentType" className="w-[100px]">
                  {ui.tableType}
                </KnowledgeSortHead>
                <KnowledgeSortHead sortBy={sortBy} setSortBy={setSortBy} sk="titleAZ" className="min-w-[140px]">
                  {ui.tableTitle}
                </KnowledgeSortHead>
                <th className="hidden pb-2 font-medium lg:table-cell xl:w-[120px]">
                  {ui.tableCategory}
                </th>
                <th className="hidden pb-2 font-medium xl:table-cell xl:min-w-[100px]">
                  {ui.tableCollection}
                </th>
                <th className="hidden pb-2 font-medium lg:table-cell">{ui.tableTags}</th>
                <th className="hidden pb-2 font-medium 2xl:table-cell">{ui.tableSource}</th>
                <th className="hidden pb-2 font-medium lg:table-cell xl:max-w-[200px]">
                  {ui.tableAiSummary}
                </th>
                <KnowledgeSortHead sortBy={sortBy} setSortBy={setSortBy} sk="latest" className="w-[100px] whitespace-nowrap">
                  {ui.tableAdded}
                </KnowledgeSortHead>
                <KnowledgeSortHead sortBy={sortBy} setSortBy={setSortBy} sk="updated" className="w-[100px] whitespace-nowrap">
                  {ui.tableUpdated}
                </KnowledgeSortHead>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const displayContentType = getKnowledgeDisplayContentType(item);
                const colors = typeColors[displayContentType];
                const allTags = [...item.aiTags, ...item.manualTags];
                const collections = collectionNamesForItem(item, smartCollections);
                const relevance = searchQuery.trim()
                  ? scoreKnowledgeItem(item, searchQuery, smartCollections)
                  : null;
                const relevanceReason =
                  relevance?.reasons[0] ??
                  relevance?.matchedConcepts[0] ??
                  relevance?.matchedKeywords[0] ??
                  null;
                return (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40"
                    onClick={() => selectItem(item.id)}
                  >
                    <td className="py-2 align-top">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          colors.bg,
                          colors.text,
                          colors.border,
                          colors.darkBg,
                          colors.darkText,
                        )}
                      >
                        {colors.icon} {ui.typeLabels[displayContentType]}
                      </Badge>
                    </td>
                    <td className="py-2 align-top font-medium">
                      <span className="line-clamp-2">{item.title}</span>
                      {relevance ? (
                        <div className="mt-1 max-w-[280px] rounded-md border border-primary/15 bg-primary/5 px-2 py-1 text-[10px] leading-4 text-primary">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                            <span className="tabular-nums">{relevance.normalizedScore}% match</span>
                          </div>
                          {relevanceReason ? (
                            <p className="line-clamp-1 text-primary/80">
                              {ui.inquiryAgent.matchedBecause}: {relevanceReason}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground lg:table-cell">
                      <span className="line-clamp-1" title={item.category ? getCategoryLabel(item.category) : ""}>
                        {item.category ? getCategoryLabel(item.category) : "—"}
                      </span>
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground xl:table-cell">
                      <span className="line-clamp-1" title={collections || undefined}>
                        {collections || "—"}
                      </span>
                    </td>
                    <td className="hidden py-2 align-top lg:table-cell">
                      <div className="flex max-w-[220px] flex-nowrap gap-1 overflow-hidden">
                        {allTags.slice(0, 4).map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="h-5 max-w-[100px] shrink-0 truncate text-[10px] font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                        {allTags.length > 4 ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            +{allTags.length - 4}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground 2xl:table-cell">
                      <span className="line-clamp-1">{item.sourceDomain || item.label || "—"}</span>
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground lg:table-cell xl:max-w-[220px]">
                      <span
                        className="line-clamp-2"
                        title={item.aiTldr || item.aiSummary}
                      >
                        {item.status === "processing"
                          ? `✦ ${ui.tableProcessing}`
                          : item.status === "error"
                            ? `⚠ ${ui.tableFailed}`
                            : item.aiTldr || item.aiSummary || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 align-top text-xs text-muted-foreground">
                      {formatKnowledgeDate(language, item.dateAdded)}
                    </td>
                    <td className="whitespace-nowrap py-2 align-top text-xs text-muted-foreground">
                      {formatKnowledgeDate(language, item.dateModified)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden">
        <ul className="space-y-2.5">
          {items.map((item) => {
            const relevance = searchQuery.trim()
              ? scoreKnowledgeItem(item, searchQuery, smartCollections)
              : null;
            const relevanceReason =
              relevance?.reasons[0] ??
              relevance?.matchedConcepts[0] ??
              relevance?.matchedKeywords[0] ??
              null;

            return (
              <KnowledgeMobileListItem
                key={item.id}
                item={item}
                relevance={relevance}
                relevanceReason={relevanceReason}
                onSelect={() => selectItem(item.id)}
              />
            );
          })}
        </ul>
      </div>
    </>
  );
}

function KnowledgeMobileListItem({
  item,
  relevance,
  relevanceReason,
  onSelect,
}: {
  item: KnowledgeItem;
  relevance: ReturnType<typeof scoreKnowledgeItem> | null;
  relevanceReason: string | null;
  onSelect: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const displayContentType = getKnowledgeDisplayContentType(item);
  const colors = typeColors[displayContentType];
  const allTags = [...item.aiTags, ...item.manualTags];
  const visibleTags = allTags.slice(0, 2);
  const extraTagCount = Math.max(0, allTags.length - visibleTags.length);
  const summaryPreview = getCardSummaryPreview(item);
  const metaLine = buildMobileMetaLine(item);
  const age = item.dateAdded ? formatKnowledgeRelativeAge(language, item.dateAdded) : null;
  const sourceInfo = item.sourceType ? getSourceTypeInfo(item.sourceType) : null;
  const uploadBadge =
    item.sourceType === "file_upload"
      ? getKnowledgeUploadBadgePresentation(item, ui.uploadKindLabels)
      : null;
  const badgeLabel = uploadBadge?.label ?? item.label ?? sourceInfo?.label;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <article
        role="button"
        tabIndex={0}
        aria-label={ui.formatOpenItem(item.title)}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "group grid min-w-0 cursor-pointer grid-cols-[5.75rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border/60 bg-card/95 p-2.5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 dark:bg-white/[0.045] dark:shadow-[0_12px_30px_rgba(0,0,0,0.28)] dark:hover:bg-white/[0.065]",
          item.status === "error" && "border-destructive/45",
        )}
      >
        <div className="relative h-[7.25rem] min-w-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
          {renderMobileListVisual(item)}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent"
            aria-hidden
          />
          <div className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)]">
            {uploadBadge ? (
              <SourceTypeBadge
                info={{
                  ...getSourceTypeInfo("file_upload"),
                  label: uploadBadge.label,
                  accent: {
                    ...getSourceTypeInfo("file_upload").accent,
                    iconName: uploadBadge.iconName,
                  },
                }}
                size="xs"
                appearance="onMedia"
                className="max-w-full shadow-none"
              />
            ) : item.sourceType ? (
              <SourceTypeBadge
                sourceType={item.sourceType}
                labelOverride={badgeLabel}
                size="xs"
                appearance="onMedia"
                className="max-w-full shadow-none"
              />
            ) : (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/[0.18] bg-black/45 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white shadow-sm backdrop-blur-md">
                <span className="shrink-0">{colors.icon}</span>
                <span className="min-w-0 truncate">{ui.typeLabels[displayContentType]}</span>
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 py-0.5">
          <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badgeLabel ?? ui.typeLabels[displayContentType]}
            </span>
            {age ? (
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/80">
                {age}
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-2 break-words text-[13px] font-semibold leading-snug text-foreground">
            {item.title}
          </h3>

          {item.status === "error" ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="min-w-0 truncate">
                {ui.failedAt(item.errorDetails?.step || ui.tableFailed)}
              </span>
            </p>
          ) : item.status === "processing" ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {item.processingStep || ui.aiProcessing}
            </p>
          ) : summaryPreview ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {summaryPreview}
            </p>
          ) : null}

          {relevance ? (
            <div className="mt-2 rounded-lg border border-primary/15 bg-primary/5 px-2 py-1 text-[10px] leading-4 text-primary">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                <span className="tabular-nums">{relevance.normalizedScore}% match</span>
              </div>
              {relevanceReason ? (
                <p className="line-clamp-1 text-primary/80">
                  {ui.inquiryAgent.matchedBecause}: {relevanceReason}
                </p>
              ) : null}
            </div>
          ) : null}

          {visibleTags.length > 0 ? (
            <div className="mt-2 flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
              {visibleTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-5 max-w-[45%] shrink truncate rounded-md px-1.5 text-[10px] font-normal"
                  title={tag}
                >
                  {tag}
                </Badge>
              ))}
              {extraTagCount > 0 ? (
                <span className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  +{extraTagCount}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            {metaLine ? <span className="min-w-0 truncate">{metaLine}</span> : null}
            {metaLine && item.connections && item.connections.length > 0 ? (
              <span className="shrink-0 text-muted-foreground/40" aria-hidden>
                /
              </span>
            ) : null}
            {item.connections && item.connections.length > 0 ? (
              <span className="shrink-0 tabular-nums">
                {ui.connectionsCount(item.connections.length)}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </motion.li>
  );
}

function renderMobileListVisual(item: KnowledgeItem) {
  const colors = typeColors[getKnowledgeDisplayContentType(item)];
  const visualUrl = item.screenshotUrl ?? item.thumbnailUrl;

  if (visualUrl) {
    return (
      <OptimizedThumbnailImage
        src={visualUrl}
        alt=""
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        sizes="96px"
        variant="card"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center text-2xl",
        colors.bg,
        colors.darkBg,
      )}
    >
      {colors.icon}
    </div>
  );
}

function buildMobileMetaLine(item: KnowledgeItem): string | undefined {
  const meta = item.sourceMetadata;
  const pieces: string[] = [];
  if (meta?.channel) pieces.push(meta.channel);
  else if (meta?.handle) pieces.push(`@${String(meta.handle).replace(/^@/, "")}`);
  else if (meta?.subreddit) pieces.push(meta.subreddit);
  else if (meta?.author) pieces.push(meta.author);
  else if (item.sourceDomain) pieces.push(item.sourceDomain);
  if (item.category) pieces.push(getCategoryLabel(item.category));
  return pieces.join(" / ") || undefined;
}
