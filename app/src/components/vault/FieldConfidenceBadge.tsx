"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfidenceLevel, FieldSource } from "@/types/vault-smart-autofill";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";

type Props = {
  field: string;
  confidence?: ConfidenceLevel;
  source?: FieldSource;
};

const VARIANT: Record<
  ConfidenceLevel,
  "default" | "secondary" | "outline" | "destructive"
> = {
  high: "default",
  medium: "secondary",
  low: "outline",
  user_confirmed: "default",
  needs_user_confirmation: "destructive",
};

export function FieldConfidenceBadge({ field, confidence, source }: Props) {
  if (!confidence) return null;
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language).confidence;

  const label = copy.levels[confidence] ?? confidence;
  const sourceLabel =
    source?.source_url != null
      ? copy.sourceLink
      : source?.source_type
        ? copy.sourceTypes[source.source_type] ?? source.source_type
        : null;

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-default border-0 bg-transparent p-0 shadow-none">
        <Badge variant={VARIANT[confidence]} className="h-5 px-1.5 text-[10px] font-normal">
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p>{copy.fieldHint(field)}</p>
        {sourceLabel ? <p className="mt-1 text-muted-foreground">{sourceLabel}</p> : null}
        {source?.source_url ? (
          <p className="mt-1 truncate text-primary">{source.source_url}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
