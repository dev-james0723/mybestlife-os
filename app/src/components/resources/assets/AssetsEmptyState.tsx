"use client";

import { Package } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

type AssetsEmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
};

/** Use the same empty-state presentation as Projects. */
export function AssetsEmptyState({ title, description, ctaLabel, onCtaClick }: AssetsEmptyStateProps) {
  return (
    <EmptyState
      icon={Package}
      title={title}
      description={description}
      action={ctaLabel && onCtaClick ? { label: ctaLabel, onClick: onCtaClick } : undefined}
    />
  );
}
