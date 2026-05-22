"use client";

import { useMemo } from "react";
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

import { getJournalUiCopy } from "@/lib/i18n/journal-ui";
import { useAppStore } from "@/stores/app-store";

/**
 * Phase 1 skeleton: page mounts at `/{locale}/journal` and renders the full
 * top-to-bottom section order from the layout spec. The "+ New entry"
 * button, FAB, and empty-state CTA from the legacy page are intentionally
 * gone — the inline form (rendered as a placeholder Card for now) is the
 * first thing the user sees.
 */
export default function JournalPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getJournalUiCopy(language), [language]);

  return (
    <PageShell
      title={copy.pageTitle}
      description={copy.pageSubtitle}
      actions={
        <Button
          render={<Link href="/grateful-things" />}
          variant="outline"
          size="sm"
        >
          {copy.navGrateful}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 1. New Entry form card — inline, always visible. */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{copy.newEntryTitle}</CardTitle>
                <CardDescription>{copy.newEntryDescription}</CardDescription>
              </div>
              <PhasePlaceholderBadge phase={2} />
            </div>
          </CardHeader>
          <CardContent>
            <PlaceholderBlock>
              The structured-entry form (4-quadrant emotion picker, topic
              extras, needs, next tiny step…) lands in Phase 2.
            </PlaceholderBlock>
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
            <PlaceholderBlock>{copy.pastSummaryEmpty}</PlaceholderBlock>
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
