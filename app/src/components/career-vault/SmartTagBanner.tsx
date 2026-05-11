"use client";

import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { SmartTagSuggestion } from "@/types/career-vault";

type SmartTagBannerProps = {
  copy: CareerVaultCopy;
  loading?: boolean;
  suggestion?: SmartTagSuggestion | null;
  onDismiss?: () => void;
  onApplyAll?: () => void;
  /** When true, the "apply all" button is hidden (user already accepted). */
  applied?: boolean;
};

/**
 * Upload-flow banner that surfaces the AI-suggested metadata. It has three
 * visual states:
 *   - loading:   shimmering "Analysing…" pill while the edge fn is in flight
 *   - ready:     suggestion body with per-field hints and an Apply-all button
 *   - applied:   condensed confirmation
 */
export function SmartTagBanner({
  copy,
  loading,
  suggestion,
  onDismiss,
  onApplyAll,
  applied,
}: SmartTagBannerProps) {
  const localeSlug = useLocaleSlug();
  const settingsHref = withLocalePrefix(localeSlug, "/settings/ai-preferences");

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-sm">
        <Sparkles className="h-4 w-4 animate-pulse text-violet-500" />
        <span className="text-muted-foreground">{copy.smartTags.analyzing}</span>
      </div>
    );
  }

  if (!suggestion) return null;

  const confidence = Math.round(
    Math.max(0, Math.min(1, suggestion.confidenceScore)) * 100,
  );

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-violet-500" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {applied ? copy.smartTags.applied : copy.smartTags.bannerTitle}
            </span>
            <Badge
              variant="secondary"
              className="bg-violet-500/15 font-normal text-violet-700 dark:text-violet-300"
            >
              {copy.smartTags.confidence(confidence)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {copy.smartTags.bannerDescription}
          </p>

          <div className="flex flex-wrap gap-1 pt-1">
            {suggestion.suggestedCategory ? (
              <Badge variant="secondary" className="font-normal">
                {copy.upload.categoryLabel}: {copy.categories[suggestion.suggestedCategory]}
              </Badge>
            ) : null}
            {suggestion.suggestedTags.map((t) => (
              <Badge key={t} variant="secondary" className="font-normal">
                #{t}
              </Badge>
            ))}
          </div>
          {suggestion.suggestedDescription ? (
            <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
              “{suggestion.suggestedDescription}”
            </p>
          ) : null}

          <p className="mt-1 text-[11px] text-muted-foreground">
            {copy.smartTags.privacyDisclaimer}{" "}
            <Link
              href={settingsHref}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {copy.smartTags.settingsLink}
            </Link>
          </p>

          {!applied ? (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {onApplyAll ? (
                <Button size="sm" onClick={onApplyAll}>
                  {copy.smartTags.acceptAll}
                </Button>
              ) : null}
              {onDismiss ? (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  {copy.smartTags.dismiss}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copy.smartTags.dismiss}
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
