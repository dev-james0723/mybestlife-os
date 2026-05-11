"use client";

import { useState } from "react";
import Link from "next/link";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { typeColors, type KnowledgeItem } from "@/types/knowledge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Camera, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { formatKnowledgeRelativeAge, getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { isKnowledgeOracleEligibleFile } from "@/lib/knowledge/file-path-utils";
import { canOpenKnowledgeLightbox } from "@/lib/knowledge/lightbox-resolve";
import { getKnowledgeUploadBadgePresentation } from "@/lib/knowledge/file-kind-presentation";
import { getSourceTypeInfo } from "@/lib/knowledge/labels";
import { KnowledgeThumbnailLightbox } from "./KnowledgeThumbnailLightbox";
import { SourceTypeBadge } from "./source/SourceTypeBadge";
import { SocialEmbed } from "./source/SocialEmbed";
import { getCardSummaryPreview } from "@/lib/knowledge/knowledge-list-utils";
import type { PreviewStatus, RenderMode } from "@/types/knowledge-source";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { retryDocumentExtractionJobAction } from "@/lib/document-brain/oracle-actions";

const TAG_VISIBLE = 3;

const mediaPill =
  "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-white/[0.18] bg-black/45 px-2 py-0.5 text-[10px] font-medium leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.16)] backdrop-blur-md";

const limeOracleBtn =
  "inline-flex h-7 items-center gap-1 rounded-lg bg-[#C8E53A] px-3 text-[11px] font-semibold text-[#0d0d0d] shadow-sm transition hover:scale-[1.02] hover:bg-[#d4ff3a]";

interface KnowledgeCardProps {
  item: KnowledgeItem;
  className?: string;
}

export function KnowledgeCard({ item, className }: KnowledgeCardProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const oracleHref = withAppLocalePrefix(language, `/knowledge-base/${item.id}/oracle`);
  const oracleEligible = isKnowledgeOracleEligibleFile(item);
  const showDocOracleRegion = oracleEligible || Boolean(item.documentBrainJob);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const selectItem = useKnowledgeStore((s) => s.selectItem);
  const legacyColors = typeColors[item.contentType];
  const isProcessing = item.status === "processing";
  const isError = item.status === "error";

  const sourceInfo = item.sourceType ? getSourceTypeInfo(item.sourceType) : null;
  const uploadBadge =
    item.sourceType === "file_upload"
      ? getKnowledgeUploadBadgePresentation(item, ui.uploadKindLabels)
      : null;
  const badgeLabel = uploadBadge?.label ?? item.label ?? sourceInfo?.label;
  const openLightbox = canOpenKnowledgeLightbox(item);
  const metaLine = buildMetaLine(item);
  const summaryPreview = getCardSummaryPreview(item);
  const allTags = [...item.aiTags, ...item.manualTags];
  const visibleTags = allTags.slice(0, TAG_VISIBLE);
  const extraTagCount = Math.max(0, allTags.length - TAG_VISIBLE);

  return (
    <>
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={isProcessing ? { opacity: [0.5, 1, 0.5] } : { opacity: 1, y: 0 }}
      transition={isProcessing ? { repeat: Infinity, duration: 1.5 } : { duration: 0.2 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group flex max-w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md",
        isError && "border-destructive/40",
        className,
      )}
      onClick={() => selectItem(item.id)}
      role="button"
      tabIndex={0}
      aria-label={ui.formatOpenItem(item.title)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectItem(item.id);
        }
      }}
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-muted">
        <div className="pointer-events-none absolute inset-0 z-0">
          {renderCardVisual({ item, isProcessing, ui, legacyColors })}
        </div>

        {openLightbox ? (
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-zoom-in bg-transparent"
            aria-label={ui.lightbox.openPreview}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
          aria-hidden
        />

        <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
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
                className="max-w-full shadow-none pointer-events-none"
              />
            ) : sourceInfo ? (
              <SourceTypeBadge
                sourceType={item.sourceType}
                labelOverride={badgeLabel}
                size="xs"
                appearance="onMedia"
                className="max-w-full shadow-none pointer-events-none"
              />
            ) : (
              <span className={cn(mediaPill, "capitalize")}>
                <span className="shrink-0 opacity-90">{legacyColors.icon}</span>
                <span className="min-w-0 truncate">{ui.typeLabels[item.contentType]}</span>
              </span>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 flex flex-wrap items-end justify-between gap-1.5">
          <div className="flex min-w-0 flex-wrap gap-1">
            {item.depthIndicator && ui.depthLabels[item.depthIndicator] ? (
              <span className={cn(mediaPill, "border-violet-200/30 bg-black/50")}>
                {ui.depthLabels[item.depthIndicator]}
              </span>
            ) : null}
          </div>
          {item.extractionStatus && item.extractionStatus !== "success" && !isProcessing ? (
            <span className={cn(mediaPill, "border-amber-200/40 bg-amber-950/75 text-amber-50")}>
              {labelForExtractionStatus(item.extractionStatus)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3 pt-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {badgeLabel ?? ui.typeLabels[item.contentType]}
        </p>

        <h3 className="line-clamp-2 min-h-0 break-words text-[13px] font-semibold leading-snug text-foreground">
          {item.title}
        </h3>

        {isError ? (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {ui.failedAt(item.errorDetails?.step || ui.processing)}
          </p>
        ) : isProcessing ? (
          <p className="text-[11px] text-muted-foreground">
            ✦{" "}
            {item.documentBrainJob?.currentStage ||
              item.processingStep ||
              ui.aiProcessing}
          </p>
        ) : summaryPreview ? (
          <p className="line-clamp-2 min-h-0 text-[11px] leading-relaxed text-muted-foreground">
            {summaryPreview}
          </p>
        ) : null}

        {visibleTags.length > 0 ? (
          <div className="flex min-h-[22px] flex-nowrap items-center gap-1 overflow-hidden pt-0.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-[38%] shrink truncate rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title={tag}
              >
                {tag}
              </span>
            ))}
            {extraTagCount > 0 ? (
              <span className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                +{extraTagCount}
              </span>
            ) : null}
          </div>
        ) : null}

        {showDocOracleRegion ? (
          <div
            className={cn(
              "rounded-xl border px-2.5 py-2 backdrop-blur-md",
              "border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] shadow-[0_6px_24px_rgba(0,0,0,0.12)]",
              "dark:border-white/15 dark:bg-white/[0.07] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="region"
            aria-label={ui.docOracle.extractionLabel}
          >
            {item.documentBrainJob ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90">
                    {ui.docOracle.extractionLabel}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums text-[#5a6d0a] dark:text-[#C8E53A]">
                    {ui.docOracle.progressPercent(item.documentBrainJob.progress)}
                  </span>
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  {ui.docOracle.jobStatus(item.documentBrainJob.status)}
                  {item.documentBrainJob.currentStage
                    ? ` · ${item.documentBrainJob.currentStage}`
                    : ""}
                </p>
              </>
            ) : oracleEligible ? (
              <p className="text-[10px] text-muted-foreground">{ui.docOracle.workspaceHintNoJob}</p>
            ) : null}

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.documentBrainJob &&
              item.documentBrainJob.status === "failed" &&
              item.documentBrainJob.retryCount < item.documentBrainJob.maxRetries ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-white/20 bg-white/10 text-[11px] hover:bg-white/15 dark:border-white/15 dark:bg-white/5"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await retryDocumentExtractionJobAction(item.documentBrainJob!.id);
                      toast.success(ui.docOracle.retryJob);
                    } catch {
                      toast.error(ui.detail.documentChatError);
                    }
                  }}
                >
                  {ui.docOracle.retryJob}
                </Button>
              ) : null}
              <Link
                href={oracleHref}
                onClick={(e) => e.stopPropagation()}
                className={cn(limeOracleBtn, "no-underline")}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {ui.docOracle.openWorkspace}
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
          {metaLine ? <span className="max-w-[55%] truncate">{metaLine}</span> : null}
          {metaLine && item.dateAdded ? (
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
          ) : null}
          {item.dateAdded ? (
            <span className="shrink-0">{formatKnowledgeRelativeAge(language, item.dateAdded)}</span>
          ) : null}
          {item.connections && item.connections.length > 0 ? (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span className="tabular-nums">{ui.connectionsCount(item.connections.length)}</span>
            </>
          ) : null}
        </div>
      </div>
    </motion.div>
    <KnowledgeThumbnailLightbox
      item={item}
      open={lightboxOpen}
      onOpenChange={setLightboxOpen}
      ui={ui.lightbox}
    />
    </>
  );
}

/**
 * Render the visual block at the top of the card. Dispatches on the
 * cascade-aware `renderMode` first (new pipeline), falling back to the
 * legacy `embedHtml` / `thumbnailStyle` logic for rows that haven't been
 * re-ingested through the cascade yet.
 *
 * Render-mode behaviors:
 *   - true_live_embed       → SocialEmbed iframe (existing path)
 *   - auto_snapshot         → screenshot image with "Snapshot" badge
 *   - user_snapshot         → screenshot image with "Saved" badge
 *   - authenticated_preview → screenshot if available, else thumbnailUrl,
 *                             with "Connected Preview" badge
 *   - metadata_preview      → thumbnailUrl image (or "na" gradient fallback)
 *   - unavailable           → tasteful empty state with title + "open original"
 *                             affordance — never a broken iframe
 */
function renderCardVisual(args: {
  item: KnowledgeItem;
  isProcessing: boolean;
  ui: ReturnType<typeof getKnowledgeUiCopy>;
  legacyColors: (typeof typeColors)[keyof typeof typeColors];
}) {
  const { item, isProcessing, ui, legacyColors } = args;

  if (isProcessing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <span className="text-[10px] text-muted-foreground">
          ✦ {item.processingStep || ui.processing}
        </span>
      </div>
    );
  }

  const mode = item.renderMode;

  // True live embed: render iframe (X / Reddit / YouTube / Threads).
  if (mode === "true_live_embed" && item.embedHtml) {
    return (
      <SocialEmbed
        item={item}
        unavailableLabel=""
        compact
        className="h-full rounded-none border-0 bg-muted [&_iframe]:pointer-events-none"
      />
    );
  }

  // Snapshot or authenticated preview: prefer screenshot, fall back to thumb.
  if (
    mode === "auto_snapshot" ||
    mode === "user_snapshot" ||
    mode === "authenticated_preview"
  ) {
    const visualUrl = item.screenshotUrl ?? item.thumbnailUrl;
    if (visualUrl) {
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={visualUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {/* Subtle "Snapshot" / "Connected Preview" / "Saved" pill, top-right. */}
          <RenderModeBadge mode={mode} />
        </>
      );
    }
    // No visual yet (e.g. snapshot still being captured) — show a friendly
    // capturing state instead of a broken iframe.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-muted to-muted/70">
        <Camera className="h-5 w-5 text-muted-foreground/60" aria-hidden />
        <span className="text-[10px] text-muted-foreground">
          {mode === "user_snapshot" ? "Saved snapshot" : "Capturing snapshot…"}
        </span>
      </div>
    );
  }

  // Unavailable: never show a broken iframe — tasteful empty state.
  if (mode === "unavailable") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-muted to-muted/70 p-3 text-center">
        <ExternalLink className="h-5 w-5 text-muted-foreground/60" aria-hidden />
        <p className="line-clamp-2 text-[11px] font-medium text-muted-foreground">
          {item.sourceDomain ?? "Source unavailable"}
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          {previewStatusLabel(item.previewStatus) ?? "Tap to view options"}
        </p>
      </div>
    );
  }

  // Metadata preview: standard thumbnail or "na" gradient.
  if (mode === "metadata_preview") {
    if (item.thumbnailUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      );
    }
    return (
      <div className="flex h-full flex-col justify-end bg-gradient-to-b from-muted to-muted/80 p-3">
        <p className="line-clamp-2 text-left text-sm font-semibold leading-snug text-foreground">
          {item.title}
        </p>
      </div>
    );
  }

  // ── Legacy fallback (rows not yet re-ingested through the cascade) ──
  if (item.category === "social_media" && item.embedHtml) {
    return (
      <SocialEmbed
        item={item}
        unavailableLabel=""
        compact
        className="h-full rounded-none border-0 bg-muted [&_iframe]:pointer-events-none"
      />
    );
  }
  // Prefer explicit thumbnail URL even when style is "na" (e.g. uploaded photo uses file as preview).
  if (item.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbnailUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  if (item.thumbnailStyle === "na") {
    return (
      <div className="flex h-full flex-col justify-end bg-gradient-to-b from-muted to-muted/80 p-3">
        <p className="line-clamp-2 text-left text-sm font-semibold leading-snug text-foreground">
          {item.title}
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center text-2xl",
        legacyColors.bg,
        legacyColors.darkBg,
      )}
    >
      {legacyColors.icon}
    </div>
  );
}

function RenderModeBadge({ mode }: { mode: RenderMode }) {
  const label = renderModeBadgeLabel(mode);
  if (!label) return null;
  return (
    <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white shadow backdrop-blur-md">
      {label}
    </span>
  );
}

function renderModeBadgeLabel(mode: RenderMode): string | null {
  switch (mode) {
    case "true_live_embed":
      return "Live";
    case "authenticated_preview":
      return "Connected";
    case "auto_snapshot":
      return "Snapshot";
    case "user_snapshot":
      return "Saved";
    case "metadata_preview":
      return null; // no badge needed — looks like a normal article card
    case "unavailable":
      return "Unavailable";
  }
}

function previewStatusLabel(s: PreviewStatus | undefined): string | null {
  if (!s) return null;
  switch (s) {
    case "login_required":
      return "Login required";
    case "private_or_restricted":
      return "Private or restricted";
    case "age_restricted":
      return "Age restricted";
    case "geo_restricted":
      return "Geo restricted";
    case "deleted_or_unavailable":
      return "Removed";
    case "rate_limited":
      return "Rate limited";
    case "api_permission_missing":
      return "Connection missing";
    case "app_review_required":
      return "App review pending";
    case "screenshot_failed":
      return "Snapshot failed";
    case "unsupported_url":
      return "Unsupported";
    default:
      return null;
  }
}

function buildMetaLine(item: KnowledgeItem): string | undefined {
  const meta = item.sourceMetadata;
  const pieces: string[] = [];
  if (meta?.channel) pieces.push(meta.channel);
  else if (meta?.handle) pieces.push(`@${String(meta.handle).replace(/^@/, "")}`);
  else if (meta?.subreddit) pieces.push(meta.subreddit);
  else if (meta?.author) pieces.push(meta.author);
  else if (item.sourceDomain) pieces.push(item.sourceDomain);
  return pieces.join(" · ") || undefined;
}

function labelForExtractionStatus(
  status: NonNullable<KnowledgeItem["extractionStatus"]>,
): string {
  switch (status) {
    case "partial":
      return "Partial";
    case "failed":
      return "Extraction failed";
    case "blocked":
      return "Blocked";
    case "requires_auth":
      return "Auth required";
    case "unsupported":
      return "Unsupported";
    default:
      return "";
  }
}
