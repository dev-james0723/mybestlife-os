"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImageIcon, MessageCircle } from "lucide-react";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";
import {
  displayPageTypeLabel,
  getPageDescription,
  getPageTagsForCard,
  getPageTitle,
  inferPageTypeBadge,
} from "@/components/document-oracle/docOraclePageHelpers";
import { knowledgeFilesApiHref } from "@/components/document-oracle/docOraclePaths";
import { cn } from "@/lib/utils";

function thumbnailHref(page: DocOraclePageRow): string | null {
  const u = page.rendered_image_url?.trim();
  if (u) return u;
  const p = page.rendered_image_path?.trim();
  if (p) return knowledgeFilesApiHref(p);
  return null;
}

function excerptFallback(page: DocOraclePageRow): string {
  const raw = (page.raw_text || page.markdown || "").trim();
  const t = raw.replace(/\s+/g, " ").slice(0, 140);
  return t.length ? `${t}${raw.length > 140 ? "…" : ""}` : `Page ${page.page_number}`;
}

export function DocOraclePageCard(props: {
  page: DocOraclePageRow;
  filePath: string | null | undefined;
  /** Prefer this prop; `onOpen` is an accepted alias. */
  onOpenDetail?: (p: DocOraclePageRow) => void;
  onOpen?: (p: DocOraclePageRow) => void;
  onOpenSourcePage?: (pageNum: number) => void;
  onAskAiPage?: (p: DocOraclePageRow) => void;
}) {
  const { page, filePath, onOpenDetail, onOpen, onOpenSourcePage, onAskAiPage } = props;
  const openDetail = onOpenDetail ?? onOpen;
  const [thumbFailed, setThumbFailed] = useState(false);
  const title = useMemo(() => getPageTitle(page), [page]);
  const description = useMemo(() => getPageDescription(page), [page]);
  const badge = useMemo(() => inferPageTypeBadge(page), [page]);
  const { tags, overflow } = useMemo(() => getPageTagsForCard(page, badge), [page, badge]);
  const thumbSrc = useMemo(() => thumbnailHref(page), [page]);

  useEffect(() => {
    setThumbFailed(false);
  }, [page.id, page.rendered_image_path, page.rendered_image_url]);

  const showThumb = Boolean(thumbSrc) && !thumbFailed;

  return (
    <article
      className={cn(
        "group flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/60 shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition hover:border-white/[0.14] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)]",
      )}
    >
      <button
        type="button"
        onClick={() => openDetail?.(page)}
        className="flex min-h-0 flex-1 flex-col text-left"
        aria-label={`Open details for ${title}`}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 bg-neutral-100">
          {showThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc!}
              alt=""
              className="h-full w-full object-contain object-center"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col justify-between p-4 text-neutral-800">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">p.{page.page_number}</p>
              <p className="line-clamp-5 text-[12px] leading-snug text-neutral-700">{excerptFallback(page)}</p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 border-t border-white/[0.06] bg-black/35 px-3.5 py-3 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              p.{page.page_number}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground/90">
              {displayPageTypeLabel(badge)}
            </span>
            <span className="ml-auto flex items-center gap-1">
              {page.has_visual_assets ? (
                <span className="text-muted-foreground/80" title="Contains visuals">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                </span>
              ) : null}
            </span>
          </div>
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">{title}</h3>
          <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>
          {tags.length ? (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
              {overflow > 0 ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
                  +{overflow}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>

      <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] bg-black/45 px-3 py-2">
        {filePath && onOpenSourcePage ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSourcePage(page.page_number);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition hover:bg-white/[0.09] hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Source
          </button>
        ) : null}
        {onAskAiPage ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskAiPage(page);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition hover:bg-white/[0.09] hover:text-foreground"
          >
            <MessageCircle className="h-3 w-3" aria-hidden />
            Ask Doc Oracle
          </button>
        ) : null}
      </div>
    </article>
  );
}
