"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenText,
  Heart,
  LineChart,
  List,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/shared/page-shell";
import {
  OSControl,
  OSFrostedPanel,
  OSGlassPanel,
  OSSolidPanel,
} from "@/components/ui/os-primitives";

import {
  JournalForm,
  type JournalFormHandle,
} from "@/components/journal/JournalForm";
import { PastAISummaryCard } from "@/components/journal/PastAISummaryCard";
import {
  AIAddonsPanel,
  type AudioMedia,
  type IllustrationMedia,
} from "@/components/journal/AIAddonsPanel";
import { MoodTrendsChart } from "@/components/journal/MoodTrendsChart";
import { RecentEntriesList } from "@/components/journal/RecentEntriesList";
import { UnsavedChangesDialog } from "@/components/journal/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/hooks/journal/useUnsavedChanges";
import { useRecentJournalEntries } from "@/hooks/use-journal";
import { getJournalUiCopy } from "@/lib/i18n/journal-ui";
import { DEFAULT_AI_DEFAULTS } from "@/lib/journal/constants";
import { aiOutputSchema, type AIOutput } from "@/lib/journal/schema";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import type { JournalEntry } from "@/types/database";

type SummaryStatus = "idle" | "generating" | "ready" | "failed";

function JournalPanelHeader({
  id,
  icon: Icon,
  title,
  description,
  primary = false,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  primary?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={
          primary
            ? "flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]"
            : "flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]"
        }
        aria-hidden
      >
        <Icon className={primary ? "size-5" : "size-4"} />
      </div>
      <div className="min-w-0 space-y-1">
        <h2
          id={id}
          className={
            primary
              ? "font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              : "font-heading text-base font-semibold tracking-tight text-foreground"
          }
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getJournalUiCopy(language), [language]);

  const formRef = useRef<JournalFormHandle | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [savedEntry, setSavedEntry] = useState<JournalEntry | null>(null);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>("idle");

  const [illustration, setIllustration] = useState<IllustrationMedia | null>(null);
  const [audio, setAudio] = useState<AudioMedia | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const illustrationRequestActive = useRef(false);
  const audioRequestActive = useRef(false);

  const guard = useUnsavedChanges(hasUnsavedChanges);

  const {
    data: recentEntries,
    isLoading: recentLoading,
    refetch: refetchRecentEntries,
  } = useRecentJournalEntries();

  // ----- save handlers passed to JournalForm -----
  const handleSaved = useCallback((entry: JournalEntry) => {
    setSavedEntry(entry);
    setHasUnsavedChanges(false);
    // Reset previous AI media since this is a fresh entry.
    setIllustration(null);
    setAudio(null);
    setAiOutput(null);
    setSummaryStatus("generating");
    void refetchRecentEntries();
  }, [refetchRecentEntries]);

  const handleSummaryReady = useCallback((entry: JournalEntry) => {
    if (entry.aiOutput) {
      const parsed = aiOutputSchema.safeParse(entry.aiOutput);
      if (parsed.success) {
        setAiOutput(parsed.data);
        setSummaryStatus("ready");
      } else {
        setSummaryStatus("failed");
      }
    } else {
      setSummaryStatus("failed");
    }
    setSavedEntry(entry);
    void refetchRecentEntries();
  }, [refetchRecentEntries]);

  const handleSummaryFailed = useCallback(() => {
    setSummaryStatus("failed");
  }, []);

  // ----- start new entry -----
  const startNewEntry = useCallback(() => {
    setFormKey((k) => k + 1);
    setSavedEntry(null);
    setAiOutput(null);
    setIllustration(null);
    setAudio(null);
    setHasUnsavedChanges(false);
    setSummaryStatus("idle");
  }, []);

  // ----- AI Add-ons handlers -----

  // Builds the request payload from the saved entry. Returns null if there's
  // no saved entry yet (caller must auto-save first).
  const summaryStringForMedia = useMemo(
    () => aiOutput?.journalEntry,
    [aiOutput],
  );

  const ensureSavedEntry = useCallback(async (): Promise<JournalEntry | null> => {
    if (savedEntry) return savedEntry;
    const inserted = await formRef.current?.saveNow();
    return inserted ?? null;
  }, [savedEntry]);

  const generateIllustration = useCallback(async () => {
    if (illustrationRequestActive.current) return;
    illustrationRequestActive.current = true;
    setIllustrationLoading(true);
    try {
      const entry = await ensureSavedEntry();
      if (!entry) return;
      const res = await fetch("/api/journal/illustration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
          quadrant: entry.quadrant,
          primaryEmotion: entry.primaryEmotion,
          intensity: entry.intensity,
          bullets: entry.bullets.items,
          needs: entry.needs.items,
          aiSummary: summaryStringForMedia,
          stylePreset: DEFAULT_AI_DEFAULTS.stylePreset,
          aspectRatio: DEFAULT_AI_DEFAULTS.aspectRatio,
          literalVsSymbolic: DEFAULT_AI_DEFAULTS.literalVsSymbolicSlider,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
        image?: IllustrationMedia;
      };
      if (!res.ok || !body.imageUrl) {
        toast.error(copy.toastIllustrationFailed);
        return;
      }
      setIllustration(
        body.image ?? { url: body.imageUrl },
      );
      toast.success(copy.toastIllustrationSuccess);
    } catch {
      toast.error(copy.toastIllustrationFailed);
    } finally {
      illustrationRequestActive.current = false;
      setIllustrationLoading(false);
    }
  }, [ensureSavedEntry, summaryStringForMedia, copy]);

  const generateAudio = useCallback(async () => {
    if (audioRequestActive.current) return;
    audioRequestActive.current = true;
    setAudioLoading(true);
    try {
      const entry = await ensureSavedEntry();
      if (!entry) return;
      const res = await fetch("/api/journal/audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
          topic: entry.topic,
          quadrant: entry.quadrant,
          primaryEmotion: entry.primaryEmotion,
          secondaryEmotion: entry.secondaryEmotion ?? undefined,
          intensity: entry.intensity,
          bullets: entry.bullets.items,
          selfStory: entry.selfStory ?? undefined,
          needs: entry.needs.items,
          nextTinyStep: entry.nextTinyStep,
          aiSummary: summaryStringForMedia,
          voice: DEFAULT_AI_DEFAULTS.voice,
          speed: DEFAULT_AI_DEFAULTS.speed,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        audioUrl?: string;
        script?: string;
        audio?: AudioMedia;
      };
      if (!res.ok || !body.audioUrl || !body.script) {
        toast.error(copy.toastAudioFailed);
        return;
      }
      setAudio(
        body.audio ?? { url: body.audioUrl, transcript: body.script },
      );
      toast.success(copy.toastAudioSuccess);
    } catch {
      toast.error(copy.toastAudioFailed);
    } finally {
      audioRequestActive.current = false;
      setAudioLoading(false);
    }
  }, [ensureSavedEntry, summaryStringForMedia, copy]);

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageSubtitle}
      actions={
        <OSControl
          render={
            <Link
              href="/grateful-things"
              onClick={(e) => {
                if (!hasUnsavedChanges) return;
                e.preventDefault();
                guard.confirmNavigate(() => {
                  setHasUnsavedChanges(false);
                  window.location.href = "/grateful-things";
                });
              }}
            />
          }
          size="sm"
        >
          <Heart aria-hidden />
          {copy.navGrateful}
        </OSControl>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(21rem,0.7fr)] xl:items-start">
          {/* The writing flow is the visual anchor of the page. */}
          <OSGlassPanel
            as="section"
            aria-labelledby="journal-new-entry-title"
            className="min-w-0 p-4 sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-primary/10 blur-3xl"
            />
            <div className="relative">
              <JournalPanelHeader
                id="journal-new-entry-title"
                icon={BookOpenText}
                title={copy.newEntryTitle}
                description={copy.newEntryDescription}
                primary
              />
              <div className="mt-5 border-t border-border/65 pt-5">
                <JournalForm
                  key={formKey}
                  ref={formRef}
                  copy={copy}
                  onSaved={handleSaved}
                  onSummaryReady={handleSummaryReady}
                  onSummaryFailed={handleSummaryFailed}
                  onDirtyChange={setHasUnsavedChanges}
                  onReset={startNewEntry}
                  resetDisabled={illustrationLoading || audioLoading}
                />
              </div>
            </div>
          </OSGlassPanel>

          {/* Generated reflection and optional media belong to one companion rail. */}
          <aside
            className={cn(
              "min-w-0 space-y-5",
              !savedEntry &&
                !aiOutput &&
                !illustration &&
                !audio &&
                "xl:sticky xl:top-20 xl:self-start",
            )}
          >
            <OSSolidPanel
              as="section"
              aria-labelledby="journal-summary-title"
              className="space-y-4 p-4 sm:p-5"
            >
              <JournalPanelHeader
                id="journal-summary-title"
                icon={Sparkles}
                title={copy.pastSummaryTitle}
              />
              <div className="border-t border-border/60 pt-4">
                <PastAISummaryCard
                  aiOutput={aiOutput}
                  copy={copy}
                  generating={summaryStatus === "generating"}
                  failed={summaryStatus === "failed"}
                />
              </div>
            </OSSolidPanel>

            <OSFrostedPanel
              as="section"
              aria-labelledby="journal-addons-title"
              className="space-y-4 p-4 sm:p-5"
            >
              <JournalPanelHeader
                id="journal-addons-title"
                icon={Wand2}
                title={copy.addonsTitle}
                description={copy.addonsDescription}
              />
              <AIAddonsPanel
                copy={copy}
                canGenerate={
                  savedEntry !== null && summaryStatus !== "generating"
                }
                waitingForSummary={summaryStatus === "generating"}
                illustration={illustration}
                audio={audio}
                onGenerateIllustration={generateIllustration}
                onGenerateAudio={generateAudio}
                illustrationLoading={illustrationLoading}
                audioLoading={audioLoading}
              />
            </OSFrostedPanel>
          </aside>
        </div>

        {/* History and trends are secondary reference surfaces. */}
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
          <OSFrostedPanel
            as="section"
            aria-labelledby="journal-recent-title"
            className="min-w-0 space-y-4 p-4 sm:p-5"
          >
            <JournalPanelHeader
              id="journal-recent-title"
              icon={List}
              title={copy.recentEntriesTitle}
              description={copy.recentEntriesDescription}
            />
            <RecentEntriesList
              entries={recentEntries ?? []}
              copy={copy}
              isLoading={recentLoading}
            />
          </OSFrostedPanel>

          <OSSolidPanel
            as="section"
            aria-labelledby="journal-trends-title"
            className="min-w-0 space-y-4 p-4 sm:p-5"
          >
            <JournalPanelHeader
              id="journal-trends-title"
              icon={LineChart}
              title={copy.trendsTitle}
              description={copy.trendsDescription}
            />
            <MoodTrendsChart entries={recentEntries ?? []} copy={copy} />
          </OSSolidPanel>
        </div>
      </div>

      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onCancel={guard.cancel}
        onConfirm={guard.confirm}
        copy={copy}
      />
    </PageShell>
  );
}
