"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

import { JournalForm } from "@/components/journal/JournalForm";
import { UnsavedChangesDialog } from "@/components/journal/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/hooks/journal/useUnsavedChanges";
import { getJournalUiCopy } from "@/lib/i18n/journal-ui";
import { useAppStore } from "@/stores/app-store";
import type { JournalEntry } from "@/types/database";

/**
 * Journal page (Phase 2). The inline form is the first thing the user sees.
 * Phases 3 & 4 will wire AI summary/add-ons and the recent-entries +
 * trends sections; for now those slots render Phase-N placeholders.
 */
export default function JournalPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getJournalUiCopy(language), [language]);

  // Tracks whether the form has unsaved content. The page passes a
  // controlled `hasUnsavedChanges` flag to the hook; the JournalForm
  // bumps it via its onChange callbacks.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Bump on every save so we re-mount JournalForm with a fresh state when
  // the user clicks "Start new entry" from somewhere outside.
  const [formKey, setFormKey] = useState(0);
  // The latest persisted entry — Phase 3 will pass this into the AI panels.
  const [latestEntry, setLatestEntry] = useState<JournalEntry | null>(null);

  const guard = useUnsavedChanges(hasUnsavedChanges);

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
                  // Allow the navigation by resetting dirty state and
                  // re-triggering the click programmatically.
                  setHasUnsavedChanges(false);
                  setFormKey((k) => k + 1);
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
              copy={copy}
              onSaved={(entry) => {
                setLatestEntry(entry);
                setHasUnsavedChanges(false);
              }}
              onDirtyChange={setHasUnsavedChanges}
            />
          </CardContent>
        </Card>

        {/* 2. Past AI Summary. */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{copy.pastSummaryTitle}</CardTitle>
              <PhasePlaceholderBadge phase={3} />
            </div>
          </CardHeader>
          <CardContent>
            <PlaceholderBlock>
              {latestEntry
                ? `Saved entry ${latestEntry.id.slice(0, 8)}… AI summary lands in Phase 3.`
                : copy.pastSummaryEmpty}
            </PlaceholderBlock>
          </CardContent>
        </Card>

        {/* 3. AI Add-ons. */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{copy.addonsTitle}</CardTitle>
                <CardDescription>{copy.addonsDescription}</CardDescription>
              </div>
              <PhasePlaceholderBadge phase={3} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlaceholderBlock title={copy.illustrationTitle}>
                {copy.illustrationEmpty}
              </PlaceholderBlock>
              <PlaceholderBlock title={copy.audioTitle}>
                {copy.audioEmpty}
              </PlaceholderBlock>
            </div>
          </CardContent>
        </Card>

        {/* 4. Recent Entries. */}
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

        {/* 5. Weekly Mood Trends. */}
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
