"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
import { UnsavedChangesDialog } from "@/components/journal/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/hooks/journal/useUnsavedChanges";
import { getJournalUiCopy } from "@/lib/i18n/journal-ui";
import { DEFAULT_AI_DEFAULTS } from "@/lib/journal/constants";
import { aiOutputSchema, type AIOutput } from "@/lib/journal/schema";
import { useAppStore } from "@/stores/app-store";
import type { JournalEntry } from "@/types/database";

export default function JournalPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getJournalUiCopy(language), [language]);

  const formRef = useRef<JournalFormHandle | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [savedEntry, setSavedEntry] = useState<JournalEntry | null>(null);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);

  const [illustration, setIllustration] = useState<IllustrationMedia | null>(null);
  const [audio, setAudio] = useState<AudioMedia | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  const guard = useUnsavedChanges(hasUnsavedChanges);

  // ----- save handlers passed to JournalForm -----
  const handleSaved = useCallback((entry: JournalEntry) => {
    setSavedEntry(entry);
    setHasUnsavedChanges(false);
    // Reset previous AI media since this is a fresh entry.
    setIllustration(null);
    setAudio(null);
    setAiOutput(null);
  }, []);

  const handleSummaryReady = useCallback((entry: JournalEntry) => {
    if (entry.aiOutput) {
      const parsed = aiOutputSchema.safeParse(entry.aiOutput);
      if (parsed.success) setAiOutput(parsed.data);
    }
    setSavedEntry(entry);
  }, []);

  // ----- start new entry -----
  const startNewEntry = useCallback(() => {
    setFormKey((k) => k + 1);
    setSavedEntry(null);
    setAiOutput(null);
    setIllustration(null);
    setAudio(null);
    setHasUnsavedChanges(false);
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
    const entry = await ensureSavedEntry();
    if (!entry) return;
    setIllustrationLoading(true);
    try {
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
      setIllustrationLoading(false);
    }
  }, [ensureSavedEntry, summaryStringForMedia, copy]);

  const generateAudio = useCallback(async () => {
    const entry = await ensureSavedEntry();
    if (!entry) return;
    setAudioLoading(true);
    try {
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
      setAudioLoading(false);
    }
  }, [ensureSavedEntry, summaryStringForMedia, copy]);

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageSubtitle}
      actions={
        <Button
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
          variant="outline"
          size="sm"
        >
          {copy.navGrateful}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 1. New Entry form — inline, always visible. */}
        <Card>
          <CardHeader>
            <CardTitle>{copy.newEntryTitle}</CardTitle>
            <CardDescription>{copy.newEntryDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <JournalForm
              key={formKey}
              ref={formRef}
              copy={copy}
              onSaved={handleSaved}
              onSummaryReady={handleSummaryReady}
              onDirtyChange={setHasUnsavedChanges}
              onReset={startNewEntry}
            />
          </CardContent>
        </Card>

        {/* 2. Past AI Summary. */}
        <Card>
          <CardHeader>
            <CardTitle>{copy.pastSummaryTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <PastAISummaryCard
              aiOutput={aiOutput}
              copy={copy}
              generating={savedEntry !== null && aiOutput === null}
            />
          </CardContent>
        </Card>

        {/* 3. AI Add-ons. */}
        <Card>
          <CardHeader>
            <CardTitle>{copy.addonsTitle}</CardTitle>
            <CardDescription>{copy.addonsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <AIAddonsPanel
              copy={copy}
              canGenerate={savedEntry !== null}
              illustration={illustration}
              audio={audio}
              onGenerateIllustration={generateIllustration}
              onGenerateAudio={generateAudio}
              illustrationLoading={illustrationLoading}
              audioLoading={audioLoading}
            />
          </CardContent>
        </Card>

        {/* 4. Recent Entries — Phase 4. */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{copy.recentEntriesTitle}</CardTitle>
                <CardDescription>{copy.recentEntriesDescription}</CardDescription>
              </div>
              <PhasePlaceholderBadge phase={4} />
            </div>
          </CardHeader>
          <CardContent>
            <PlaceholderBlock>{copy.recentEntriesEmpty}</PlaceholderBlock>
          </CardContent>
        </Card>

        {/* 5. Weekly Mood Trends — Phase 4. */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{copy.trendsTitle}</CardTitle>
                <CardDescription>{copy.trendsDescription}</CardDescription>
              </div>
              <PhasePlaceholderBadge phase={4} />
            </div>
          </CardHeader>
          <CardContent>
            <PlaceholderBlock>{copy.trendsEmpty}</PlaceholderBlock>
          </CardContent>
        </Card>
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

function PhasePlaceholderBadge({ phase }: { phase: number }) {
  return (
    <Badge variant="secondary" className="text-xs font-normal">
      Phase {phase}
    </Badge>
  );
}

function PlaceholderBlock({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
      {title && <div className="font-medium mb-1 text-foreground">{title}</div>}
      <p>{children}</p>
    </div>
  );
}
