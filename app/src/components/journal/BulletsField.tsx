"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

interface BulletsFieldProps {
  label: string;
  required?: boolean;
  values: string[];
  onChange: (next: string[]) => void;
  copy: JournalUiCopy;
  errorMessage?: string;
  placeholder?: string;
}

export function BulletsField({
  label,
  required,
  values,
  onChange,
  copy,
  errorMessage,
  placeholder,
}: BulletsFieldProps) {
  const setAt = (idx: number, next: string) => {
    const copyArr = values.slice();
    copyArr[idx] = next;
    onChange(copyArr);
  };

  const removeAt = (idx: number) => {
    if (values.length <= 1) return;
    onChange(values.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...values, ""]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">{copy.requiredMark}</span>}
      </Label>
      <div className="space-y-2">
        {values.map((v, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={v}
              onChange={(e) => setAt(idx, e.target.value)}
              placeholder={placeholder}
              aria-invalid={!!errorMessage && idx === 0 ? true : undefined}
            />
            {values.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeAt(idx)}
                aria-label={copy.removeBulletAria}
              >
                <X />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus aria-hidden />
        {copy.addBulletButton}
      </Button>
      {errorMessage && (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
