"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Topic } from "@/lib/journal/constants";
import {
  TOPIC_CONFIG,
  type TopicExtraField,
} from "@/lib/journal/topic-config";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

import { JournalSlider } from "./JournalSlider";

type ExtraValue = string | number | string[];

interface TopicExtrasFormProps {
  topic: Topic;
  values: Record<string, ExtraValue>;
  onChange: (next: Record<string, ExtraValue>) => void;
  copy: JournalUiCopy;
  disabled?: boolean;
}

export function TopicExtrasForm({
  topic,
  values,
  onChange,
  copy,
  disabled,
}: TopicExtrasFormProps) {
  const cfg = TOPIC_CONFIG[topic];
  if (cfg.extras.length === 0) return null;

  const topicLabels = copy.topicCopy[topic] as Record<string, string>;

  const setValue = (key: string, v: ExtraValue) => {
    onChange({ ...values, [key]: v });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]">
      {cfg.extras.map((field) => (
        <ExtraFieldRenderer
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(v) => setValue(field.key, v)}
          label={topicLabels[field.key] ?? field.key}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function ExtraFieldRenderer({
  field,
  value,
  onChange,
  label,
  disabled,
}: {
  field: TopicExtraField;
  value: ExtraValue | undefined;
  onChange: (v: ExtraValue) => void;
  label: string;
  disabled?: boolean;
}) {
  if (field.type === "text") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    );
  }

  if (field.type === "slider") {
    const numeric =
      typeof value === "number" ? value : Math.round((field.min + field.max) / 2);
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <JournalSlider
          label={label}
          value={numeric}
          onChange={onChange}
          min={field.min}
          max={field.max}
          valueSuffix={`/${field.max}`}
          disabled={disabled}
        />
      </div>
    );
  }

  // array
  const items = Array.isArray(value) ? value : [];
  const setItem = (idx: number, v: string) => {
    const next = items.slice();
    next[idx] = v;
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, ""]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">— none yet —</p>
        )}
        {items.map((v, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={v}
              onChange={(e) => setItem(idx, e.target.value)}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(idx)}
              disabled={disabled}
              aria-label="Remove"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
      >
        <Plus aria-hidden />
        Add
      </Button>
    </div>
  );
}
