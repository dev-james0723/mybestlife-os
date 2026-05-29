"use client";

import { useState } from "react";
import { Plus, Star, Trash2, VolumeX, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCustomTopic } from "@/lib/signals/custom-topics";
import type {
  CustomSignalTopic,
  SignalsPreferences,
  SignalTopicPriority,
} from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

const PRIORITIES: SignalTopicPriority[] = ["low", "normal", "high"];

function csv(list: string[] | undefined): string {
  return (list ?? []).join(", ");
}
function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function parseLines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Custom-topics manager (§ custom topics). Add/rename/remove, edit keywords,
 * preferred sources and RSS feeds, set priority, toggle Top-3 eligibility, and
 * mute. Persisted via the prefs `update` (localStorage MVP → Supabase later).
 */
export function CustomTopicsManager({
  prefs,
  update,
  copy,
}: {
  prefs: SignalsPreferences;
  update: (patch: Partial<SignalsPreferences>) => void;
  copy: SignalsUiCopy;
}) {
  const c = copy.customTopics;
  const [name, setName] = useState("");
  const topics = prefs.customTopics;

  const commit = (nextTopics: CustomSignalTopic[]) => update({ customTopics: nextTopics });

  const addTopic = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    commit([...topics, createCustomTopic(trimmed)]);
    setName("");
  };

  const patchTopic = (id: string, patch: Partial<CustomSignalTopic>) => {
    commit(
      topics.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
    );
  };

  const removeTopic = (id: string) => commit(topics.filter((t) => t.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={c.namePlaceholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTopic();
            }
          }}
          className="flex-1"
        />
        <Button size="sm" onClick={addTopic} disabled={!name.trim()}>
          <Plus />
          {c.add}
        </Button>
      </div>

      {topics.length === 0 ? (
        <p className="text-xs text-muted-foreground">{c.empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className={cn(
                "space-y-2.5 rounded-xl border border-border/50 bg-card/40 p-3",
                topic.muted && "opacity-70",
              )}
            >
              <div className="flex items-center gap-2">
                <Input
                  value={topic.name}
                  onChange={(e) => patchTopic(topic.id, { name: e.target.value })}
                  className="h-8 flex-1 font-medium"
                  aria-label={c.rename}
                />
                {topic.muted && (
                  <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {c.mutedBadge}
                  </span>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => patchTopic(topic.id, { muted: !topic.muted })}
                  aria-label={topic.muted ? c.unmute : c.mute}
                  title={topic.muted ? c.unmute : c.mute}
                >
                  {topic.muted ? <Volume2 /> : <VolumeX />}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => removeTopic(topic.id)}
                  aria-label={c.remove}
                  title={c.remove}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>

              <Field label={c.keywords}>
                <Input
                  defaultValue={csv(topic.keywords)}
                  onBlur={(e) => patchTopic(topic.id, { keywords: parseCsv(e.target.value) })}
                  placeholder={c.keywordsPlaceholder}
                  className="h-8"
                />
              </Field>

              <Field label={c.sources}>
                <Input
                  defaultValue={csv(topic.sources)}
                  onBlur={(e) => patchTopic(topic.id, { sources: parseCsv(e.target.value) })}
                  placeholder={c.sourcesPlaceholder}
                  className="h-8"
                />
              </Field>

              <Field label={c.feeds}>
                <Input
                  defaultValue={csv(topic.rssFeeds)}
                  onBlur={(e) => patchTopic(topic.id, { rssFeeds: parseLines(e.target.value) })}
                  placeholder={c.feedsPlaceholder}
                  className="h-8"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{c.priority}</span>
                  <Select
                    value={topic.priority}
                    onValueChange={(v) =>
                      v && patchTopic(topic.id, { priority: v as SignalTopicPriority })
                    }
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {c.priorityLabels[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
                  <Checkbox
                    checked={topic.includeInTop3}
                    onCheckedChange={(checked) =>
                      patchTopic(topic.id, { includeInTop3: checked === true })
                    }
                  />
                  <Star className="h-3 w-3 text-amber-500" />
                  {c.includeInTop3}
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
