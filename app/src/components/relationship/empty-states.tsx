"use client";

import { Plus, Sparkles, Users, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";

type Props = {
  /** Called when the primary CTA is clicked. */
  onAction: () => void;
};

type HubEmptyProps = {
  onAddWithAi: () => void;
  onLogInteraction: () => void;
  onAddManually: () => void;
};

/**
 * AI-first empty state for the Relationship Intelligence Hub. Leads with the
 * "Add with AI" capture path (spec §26), with logging and manual entry as
 * supporting actions.
 */
export function RelationshipEmptyState({
  onAddWithAi,
  onLogInteraction,
  onAddManually,
}: HubEmptyProps) {
  const language = useAppStore((s) => s.language);
  const copy = getRelationshipUiCopy(language);

  return (
    <EmptyShell
      icon={<Users className="h-9 w-9 text-primary" aria-hidden />}
      title={copy.hubEmptyTitle}
      description={copy.hubEmptyDescription}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onAddWithAi} size="lg">
          <Sparkles className="mr-2 h-4 w-4" />
          {copy.hubAddWithAi}
        </Button>
        <Button onClick={onLogInteraction} size="lg" variant="outline">
          <PenLine className="mr-2 h-4 w-4" />
          {copy.hubLogInteraction}
        </Button>
        <Button onClick={onAddManually} size="lg" variant="ghost">
          <Plus className="mr-2 h-4 w-4" />
          {copy.hubAddManually}
        </Button>
      </div>
    </EmptyShell>
  );
}

/**
 * Dedicated empty state for the Role Model sub-tab. Same design language.
 *
 * Phase 4: Adds a soft AI-nudge under the primary CTA. We keep both buttons
 * pointed at the same handler — the create form opens with the AI Hero at
 * the top, which is the action we're trying to surface. The secondary copy
 * does the persuasive work without adding new code paths.
 */
export function RoleModelEmptyState({ onAction }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getRelationshipUiCopy(language);

  return (
    <EmptyShell
      icon={<Sparkles className="h-9 w-9 text-primary" aria-hidden />}
      title={copy.rmEmptyTitle}
      description={copy.rmEmptyDescNoEntries}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onAction} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            {copy.rmEmptyAction}
          </Button>
          <Button onClick={onAction} size="lg" variant="outline">
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            {copy.rmEmptyTrySampleAction}
          </Button>
        </div>
        <p className="max-w-md text-pretty text-xs text-muted-foreground">
          {copy.rmEmptyTrySampleHint}
        </p>
      </div>
    </EmptyShell>
  );
}

/** Shared visual shell for the warm empty states above. */
function EmptyShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20">
      <div className="relative mb-6">
        {/* Soft brand halo behind the icon — pure token via primary alpha. */}
        <div
          aria-hidden
          className="absolute inset-0 -m-4 rounded-full bg-primary/5 blur-xl"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
          {icon}
        </div>
      </div>
      <h3 className="max-w-sm text-balance text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-7">{children}</div>
    </div>
  );
}
