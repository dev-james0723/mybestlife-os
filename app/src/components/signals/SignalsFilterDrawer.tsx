"use client";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEDIA_TYPE_ORDER,
  REGION_FACET_ORDER,
  RELEVANCE_FACET_ORDER,
  SOURCE_FACET_ORDER,
  TIME_FACET_ORDER,
  customTopicFilterOptions,
} from "@/lib/signals/filters";
import { SIGNAL_TOPIC_IDS, type SignalTopicId } from "@/lib/signals/constants";
import type {
  SignalMediaType,
  SignalRegionFacet,
  SignalRelevanceFacet,
  SignalSourceFacet,
  SignalsFilterState,
  SignalsPreferences,
  SignalTimeFacet,
} from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Advanced filter drawer (§ filters): topic (built-in + custom), media, region,
 * source, time, sort-by, and the exclude-muted toggle. All facets are pure and
 * deterministic — applied client-side over the already-ranked pool.
 */
export function SignalsFilterDrawer({
  open,
  onOpenChange,
  filter,
  onChange,
  onClear,
  prefs,
  copy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: SignalsFilterState;
  onChange: (next: SignalsFilterState) => void;
  onClear: () => void;
  prefs: SignalsPreferences;
  copy: SignalsUiCopy;
}) {
  const customTopics = customTopicFilterOptions(prefs.customTopics);
  const toggleTopic = (name: string) =>
    onChange({
      ...filter,
      topics: filter.topics.includes(name)
        ? filter.topics.filter((t) => t !== name)
        : [...filter.topics, name],
    });
  const toggleMedia = (m: SignalMediaType) =>
    onChange({
      ...filter,
      mediaTypes: filter.mediaTypes.includes(m)
        ? filter.mediaTypes.filter((x) => x !== m)
        : [...filter.mediaTypes, m],
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/40">
          <SheetTitle>{copy.filters.title}</SheetTitle>
          <SheetDescription>{copy.pageSubtitle}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <Group label={copy.filters.groups.relevance}>
            <Select
              value={filter.relevance}
              onValueChange={(v) =>
                v && onChange({ ...filter, relevance: v as SignalRelevanceFacet })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELEVANCE_FACET_ORDER.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.filters.relevance[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Group>

          <Group label={copy.filters.groups.topic}>
            <div className="flex flex-wrap gap-1.5">
              {customTopics.map((name) => (
                <Toggle
                  key={`custom:${name}`}
                  label={name}
                  active={filter.topics.includes(name)}
                  onClick={() => toggleTopic(name)}
                />
              ))}
              {SIGNAL_TOPIC_IDS.map((id: SignalTopicId) => (
                <Toggle
                  key={id}
                  label={copy.topicLabels[id]}
                  active={filter.topics.includes(id)}
                  onClick={() => toggleTopic(id)}
                />
              ))}
            </div>
          </Group>

          <Group label={copy.filters.groups.media}>
            <div className="flex flex-wrap gap-1.5">
              {MEDIA_TYPE_ORDER.map((m) => (
                <Toggle
                  key={m}
                  label={copy.filters.media[m]}
                  active={filter.mediaTypes.includes(m)}
                  onClick={() => toggleMedia(m)}
                />
              ))}
            </div>
          </Group>

          <Group label={copy.filters.groups.region}>
            <Select
              value={filter.region}
              onValueChange={(v) => v && onChange({ ...filter, region: v as SignalRegionFacet })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGION_FACET_ORDER.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.filters.region[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Group>

          <Group label={copy.filters.groups.source}>
            <Select
              value={filter.source}
              onValueChange={(v) => v && onChange({ ...filter, source: v as SignalSourceFacet })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FACET_ORDER.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.filters.source[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Group>

          <Group label={copy.filters.groups.time}>
            <Select
              value={filter.time}
              onValueChange={(v) => v && onChange({ ...filter, time: v as SignalTimeFacet })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FACET_ORDER.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.filters.time[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Group>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5">
            <Checkbox
              checked={filter.excludeMuted}
              onCheckedChange={(checked) => onChange({ ...filter, excludeMuted: checked === true })}
            />
            <span className="text-sm text-foreground">{copy.filters.excludeMuted}</span>
          </label>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border/40">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClear}>
            {copy.filters.clearAll}
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onOpenChange(false)}>
            {copy.filters.apply}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
