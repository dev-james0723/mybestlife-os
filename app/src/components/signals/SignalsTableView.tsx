"use client";

import { useState } from "react";
import type { Locale } from "date-fns";
import { Bookmark, BookmarkCheck, ExternalLink, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { formatRelative, SourceIcon } from "./signal-chrome";
import { SignalThumbnail } from "./SignalThumbnail";
import { type SignalCardHandlers } from "./SignalsSection";
import { SignalsCaughtUp } from "./SignalsStates";

const PAGE = 25;

/** Table view — thumbnail, headline, source, topic, region, relevance, time, actions. */
export function SignalsTableView({
  items,
  copy,
  dateLocale,
  handlers,
}: {
  items: SignalItem[];
  copy: SignalsUiCopy;
  dateLocale: Locale;
  handlers: SignalCardHandlers;
}) {
  const [count, setCount] = useState(PAGE);
  // Reset paging when the result set changes — adjust state during render
  // (React's recommended pattern) instead of a setState-only effect.
  const [seenLen, setSeenLen] = useState(items.length);
  if (items.length !== seenLen) {
    setSeenLen(items.length);
    setCount(PAGE);
  }
  const visible = items.slice(0, count);
  const hasMore = items.length > visible.length;

  return (
    <div className="space-y-4">
      <GlassPanel variant="strong" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-semibold" colSpan={2}>
                  {copy.sections.worldTitle}
                </th>
                <th className="px-3 py-2.5 font-semibold">{copy.filters.groups.source}</th>
                <th className="px-3 py-2.5 font-semibold">{copy.filters.groups.topic}</th>
                <th className="px-3 py-2.5 font-semibold">{copy.filters.groups.region}</th>
                <th className="px-3 py-2.5 font-semibold">{copy.filters.groups.relevance}</th>
                <th className="px-3 py-2.5 font-semibold">{copy.filters.groups.time}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{copy.card.openSource}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((signal) => {
                const saved = handlers.savedIds.has(signal.id);
                const saving = handlers.savingId === signal.id;
                const href =
                  signal.mediaType === "video"
                    ? signal.videoUrl ?? signal.sourceUrl
                    : signal.sourceUrl;
                return (
                  <tr
                    key={signal.id}
                    className="border-b border-border/30 align-middle transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="w-14 py-2 pl-3 pr-0">
                      <SignalThumbnail
                        signal={signal}
                        copy={copy}
                        rounded="rounded-md"
                        className="size-11"
                      />
                    </td>
                    <td className="max-w-[280px] px-3 py-2">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handlers.onOpen(signal)}
                        className="line-clamp-2 font-medium text-foreground hover:underline"
                      >
                        {signal.headline}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <SourceIcon source={signal.source} size={14} />
                        {signal.source.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{signal.topic}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {signal.region ?? copy.filters.region.global}
                    </td>
                    <td className="max-w-[220px] px-3 py-2">
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {signal.whyRelevantToUser ?? signal.whyItMatters}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {formatRelative(signal.publishedAt, dateLocale)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handlers.onSave(signal)}
                          disabled={saving || saved}
                          aria-label={saved ? copy.card.saved : copy.card.save}
                          title={saved ? copy.card.saved : copy.card.save}
                        >
                          {saving ? (
                            <Loader2 className="animate-spin" />
                          ) : saved ? (
                            <BookmarkCheck />
                          ) : (
                            <Bookmark />
                          )}
                        </Button>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handlers.onOpen(signal)}
                          aria-label={copy.card.openSource}
                          title={copy.card.openSource}
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          )}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setCount((c) => c + PAGE)}>
            {copy.states.showMore}
          </Button>
        </div>
      ) : (
        <SignalsCaughtUp copy={copy} />
      )}
    </div>
  );
}
