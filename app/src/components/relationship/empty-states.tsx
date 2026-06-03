"use client";

import { Plus, Sparkles, Users, PenLine } from "lucide-react";
import {
  OSActionRow,
  OSControl,
  OSGlassPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
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
      <OSActionRow className="justify-center sm:justify-center">
        <OSPrimaryAction onClick={onAddWithAi}>
          <Sparkles className="mr-2 h-4 w-4" />
          {copy.hubAddWithAi}
        </OSPrimaryAction>
        <OSControl onClick={onLogInteraction}>
          <PenLine className="mr-2 h-4 w-4" />
          {copy.hubLogInteraction}
        </OSControl>
        <OSControl onClick={onAddManually} variant="ghost">
          <Plus className="mr-2 h-4 w-4" />
          {copy.hubAddManually}
        </OSControl>
      </OSActionRow>
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
        <OSActionRow className="justify-center sm:justify-center">
          <OSPrimaryAction onClick={onAction}>
            <Plus className="mr-2 h-4 w-4" />
            {copy.rmEmptyAction}
          </OSPrimaryAction>
          <OSControl onClick={onAction} className="hidden sm:inline-flex">
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            {copy.rmEmptyTrySampleAction}
          </OSControl>
        </OSActionRow>
        <p className="hidden max-w-md text-pretty text-xs text-muted-foreground sm:block">
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
    <OSGlassPanel className="flex flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-16">
      <div className="relative mb-4 sm:mb-6">
        {/* Soft brand halo behind the icon — pure token via primary alpha. */}
        <div
          aria-hidden
          className="absolute inset-0 -m-4 rounded-full bg-primary/5 blur-xl"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/72 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200 sm:h-20 sm:w-20">
          {icon}
        </div>
      </div>
      <h3 className="max-w-sm text-balance text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-pretty text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-5 sm:mt-7">{children}</div>
    </OSGlassPanel>
  );
}
