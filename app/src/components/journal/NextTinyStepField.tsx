"use client";

import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

const MAX_LEN = 140;

interface NextTinyStepFieldProps {
  value: string;
  onChange: (next: string) => void;
  copy: JournalUiCopy;
  errorMessage?: string;
}

export function NextTinyStepField({
  value,
  onChange,
  copy,
  errorMessage,
}: NextTinyStepFieldProps) {
  const len = value.length;
  const overLimit = len > MAX_LEN;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium">
          {copy.labelNextTinyStep}
          <span className="ml-1 text-destructive">{copy.requiredMark}</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {copy.nextTinyStepHint}
          </span>
        </Label>
        <span
          className={cn(
            "text-xs tabular-nums",
            overLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {copy.charCounter(len, MAX_LEN)}
        </span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={overLimit || !!errorMessage}
      />
      {overLimit && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="size-3.5" aria-hidden />
          {copy.nextTinyStepOverLimit}
        </p>
      )}
      {!overLimit && errorMessage && (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
