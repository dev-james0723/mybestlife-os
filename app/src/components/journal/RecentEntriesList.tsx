"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { QUADRANT_META } from "@/lib/journal/constants";
import { aiOutputSchema } from "@/lib/journal/schema";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";
import type { JournalEntry } from "@/types/database";

import { EntryDetailModal } from "./EntryDetailModal";

interface RecentEntriesListProps {
  entries: JournalEntry[];
  copy: JournalUiCopy;
  isLoading?: boolean;
}

function formatEntryDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM dd, yyyy");
  } catch {
    return iso;
  }
}

function getAiNarrative(entry: JournalEntry): string {
  if (!entry.aiOutput) return "";
  const parsed = aiOutputSchema.safeParse(entry.aiOutput);
  return parsed.success ? parsed.data.journalEntry : "";
}

export function RecentEntriesList({
  entries,
  copy,
  isLoading,
}: RecentEntriesListProps) {
  const [search, setSearch] = useState("");
  const [openEntry, setOpenEntry] = useState<JournalEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const haystack = [
        ...(e.bullets?.items ?? []),
        e.selfStory ?? "",
        e.nextTinyStep ?? "",
        e.appreciation ?? "",
        getAiNarrative(e),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, search]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={copy.recentEntriesSearchPlaceholder}
          className="rounded-xl border-border/75 bg-card/60 pl-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] dark:border-border/75 dark:bg-card/60"
          aria-label={copy.recentEntriesSearchPlaceholder}
        />
      </div>

      {isLoading && entries.length === 0 ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {copy.recentEntriesEmpty}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <EntryCard
                entry={entry}
                copy={copy}
                onClick={() => setOpenEntry(entry)}
              />
            </li>
          ))}
        </ul>
      )}

      <EntryDetailModal
        entry={openEntry}
        copy={copy}
        onClose={() => setOpenEntry(null)}
      />
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-16 animate-pulse rounded-xl border border-border/70 bg-card/45"
        />
      ))}
    </ul>
  );
}

function EntryCard({
  entry,
  copy,
  onClick,
}: {
  entry: JournalEntry;
  copy: JournalUiCopy;
  onClick: () => void;
}) {
  const meta = QUADRANT_META[entry.quadrant];
  const firstBullet = entry.bullets?.items?.[0] ?? "";
  const topicName = copy.topicName[entry.topic as keyof typeof copy.topicName] ?? entry.topic;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-xl border border-border/70 bg-card/55 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] transition-[background,border-color,transform] duration-150",
        "hover:-translate-y-px hover:border-border hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">
          {formatEntryDate(entry.entryDate)}
        </span>
        <Badge variant="secondary">{topicName}</Badge>
        <Badge
          className={cn(meta.bgSelectedClass, meta.borderClass, meta.textClass, "border")}
          variant="outline"
        >
          {copy.quadrantName[entry.quadrant]}
        </Badge>
        <Badge variant="outline">
          {entry.primaryEmotion} · {copy.intensityBadge(entry.intensity)}
        </Badge>
      </div>
      {firstBullet && (
        <p className="mt-2 line-clamp-2 text-sm text-foreground">{firstBullet}</p>
      )}
    </button>
  );
}
