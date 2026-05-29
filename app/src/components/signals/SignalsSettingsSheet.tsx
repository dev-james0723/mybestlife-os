"use client";

import { RotateCcw, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  SIGNAL_CONSENT_KEYS,
  SIGNAL_TOPIC_IDS,
  type SignalConsentKey,
} from "@/lib/signals/constants";
import type {
  SignalsFeedIntensity,
  SignalsGallerySpeed,
  SignalsPreferences,
  SignalsTone,
  SignalsViewMode,
} from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { CustomTopicsManager } from "./CustomTopicsManager";

const FEED_INTENSITIES: SignalsFeedIntensity[] = ["top3", "light", "balanced", "deep"];
const TONES: SignalsTone[] = [
  "calm",
  "executive",
  "analytical",
  "local-first",
  "global-first",
  "career-focused",
  "learning-focused",
];
const VIEW_MODES: SignalsViewMode[] = ["editorial", "grid", "table", "compact", "gallery"];
const GALLERY_SPEEDS: SignalsGallerySpeed[] = ["slow", "normal", "fast"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: SignalsUiCopy;
  prefs: SignalsPreferences;
  update: (patch: Partial<SignalsPreferences>) => void;
  reset: () => void;
};

export function SignalsSettingsSheet({
  open,
  onOpenChange,
  copy,
  prefs,
  update,
  reset,
}: Props) {
  const toggleTopic = (topic: string) => {
    const following = prefs.followedTopics.includes(topic);
    update({
      followedTopics: following
        ? prefs.followedTopics.filter((t) => t !== topic)
        : [...prefs.followedTopics, topic],
      hiddenTopics: prefs.hiddenTopics.filter((t) => t !== topic),
    });
  };

  const unmute = (source: string) => {
    update({ mutedSources: prefs.mutedSources.filter((s) => s !== source) });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/40">
          <SheetTitle>{copy.settings.title}</SheetTitle>
          <SheetDescription>{copy.settings.description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Followed topics */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              {copy.settings.followedTopics}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {SIGNAL_TOPIC_IDS.map((topic) => {
                const selected = prefs.followedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {copy.topicLabels[topic]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Feed intensity */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              {copy.settings.feedIntensity}
            </h3>
            <Select
              value={prefs.feedIntensity}
              onValueChange={(v) => v && update({ feedIntensity: v as SignalsFeedIntensity })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEED_INTENSITIES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.feedIntensityLabels[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Tone */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{copy.settings.tone}</h3>
            <Select
              value={prefs.tone}
              onValueChange={(v) => v && update({ tone: v as SignalsTone })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.toneLabels[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* View mode */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{copy.views.label}</h3>
            <Select
              value={prefs.viewMode}
              onValueChange={(v) => v && update({ viewMode: v as SignalsViewMode })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_MODES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {copy.views.modes[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Sections: Markets + Video (opt-in) */}
          <section className="space-y-1.5">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30">
              <Checkbox
                checked={prefs.marketsEnabled}
                onCheckedChange={(checked) => update({ marketsEnabled: checked === true })}
              />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{copy.markets.enable}</span>
                <span className="block text-xs text-muted-foreground">{copy.markets.disclaimer}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30">
              <Checkbox
                checked={prefs.videoEnabled}
                onCheckedChange={(checked) => update({ videoEnabled: checked === true })}
              />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{copy.video.enable}</span>
                <span className="block text-xs text-muted-foreground">{copy.video.subtitle}</span>
              </span>
            </label>
          </section>

          {/* Auto-rotate gallery */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{copy.gallery.title}</h3>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30">
              <Checkbox
                checked={prefs.gallery.enabled}
                onCheckedChange={(checked) =>
                  update({ gallery: { ...prefs.gallery, enabled: checked === true } })
                }
              />
              <span className="text-sm text-foreground">{copy.gallery.enable}</span>
            </label>
            {prefs.gallery.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{copy.gallery.speed}</span>
                <Select
                  value={prefs.gallery.speed}
                  onValueChange={(v) =>
                    v && update({ gallery: { ...prefs.gallery, speed: v as SignalsGallerySpeed } })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GALLERY_SPEEDS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {copy.gallery.speedLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/80">{copy.gallery.reducedMotionNote}</p>
          </section>

          {/* Custom topics */}
          <section className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">{copy.customTopics.title}</h3>
              <p className="text-xs text-muted-foreground">{copy.customTopics.subtitle}</p>
            </div>
            <CustomTopicsManager prefs={prefs} update={update} copy={copy} />
          </section>

          {/* Life OS data usage */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{copy.settings.dataUsage}</h3>
            <div className="space-y-1.5">
              {SIGNAL_CONSENT_KEYS.map((key: SignalConsentKey) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30"
                >
                  <Checkbox
                    checked={prefs[key]}
                    onCheckedChange={(checked) => update({ [key]: checked === true })}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">
                      {copy.consentLabels[key].label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {copy.consentLabels[key].hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Muted sources */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              {copy.settings.mutedSources}
            </h3>
            {prefs.mutedSources.length === 0 ? (
              <p className="text-xs text-muted-foreground">{copy.settings.mutedSourcesEmpty}</p>
            ) : (
              <ul className="space-y-1">
                {prefs.mutedSources.map((source) => (
                  <li
                    key={source}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-1.5 text-sm"
                  >
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <VolumeX className="h-3.5 w-3.5" />
                      {source}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => unmute(source)}>
                      {copy.card.moreLikeThis}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Reset */}
          <section className="border-t border-border/40 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-destructive hover:text-destructive"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {copy.settings.resetPersonalization}
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
