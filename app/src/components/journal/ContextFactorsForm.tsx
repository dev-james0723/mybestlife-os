"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ENVIRONMENT_OPTIONS,
  PHYSICAL_STATE_OPTIONS,
  SUBSTANCE_OPTIONS,
} from "@/lib/journal/constants";
import type { ContextFactors } from "@/lib/journal/schema";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

import { ChipMultiSelect } from "./ChipMultiSelect";
import { JournalSlider } from "./JournalSlider";

interface ContextFactorsFormProps {
  value: ContextFactors;
  onChange: (next: ContextFactors) => void;
  copy: JournalUiCopy;
}

export function ContextFactorsForm({
  value,
  onChange,
  copy,
}: ContextFactorsFormProps) {
  const set = <K extends keyof ContextFactors>(
    key: K,
    v: ContextFactors[K],
  ) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-5 rounded-md border border-border/60 bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {copy.contextFactors.sleepQuality}
          </Label>
          <JournalSlider
            label={copy.contextFactors.sleepQuality}
            value={typeof value.sleepQuality === "number" ? value.sleepQuality : 5}
            onChange={(n) => set("sleepQuality", n)}
            min={0}
            max={10}
            valueSuffix="/10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {copy.contextFactors.socialLoad}
          </Label>
          <JournalSlider
            label={copy.contextFactors.socialLoad}
            value={typeof value.socialLoad === "number" ? value.socialLoad : 5}
            onChange={(n) => set("socialLoad", n)}
            min={0}
            max={10}
            valueSuffix="/10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {copy.contextFactors.workLoad}
          </Label>
          <JournalSlider
            label={copy.contextFactors.workLoad}
            value={typeof value.workLoad === "number" ? value.workLoad : 5}
            onChange={(n) => set("workLoad", n)}
            min={0}
            max={10}
            valueSuffix="/10"
          />
        </div>
      </div>

      <ChipMultiSelect
        label={copy.contextFactors.physicalState}
        options={PHYSICAL_STATE_OPTIONS}
        values={value.physicalState ?? []}
        onChange={(v) => set("physicalState", v)}
      />
      <ChipMultiSelect
        label={copy.contextFactors.environment}
        options={ENVIRONMENT_OPTIONS}
        values={value.environment ?? []}
        onChange={(v) => set("environment", v)}
      />
      <ChipMultiSelect
        label={copy.contextFactors.substances}
        options={SUBSTANCE_OPTIONS}
        values={value.substances ?? []}
        onChange={(v) => set("substances", v)}
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium">{copy.contextFactors.note}</Label>
        <Textarea
          value={value.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}
