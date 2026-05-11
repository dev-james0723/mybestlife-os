"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface CoverPageEditorProps {
  copy: CareerVaultCopy;
  include: boolean;
  onIncludeChange: (v: boolean) => void;
  title: string;
  onTitleChange: (v: string) => void;
  subtitle: string;
  onSubtitleChange: (v: string) => void;
  recipient: string;
  onRecipientChange: (v: string) => void;
}

export function CoverPageEditor({
  copy,
  include,
  onIncludeChange,
  title,
  onTitleChange,
  subtitle,
  onSubtitleChange,
  recipient,
  onRecipientChange,
}: CoverPageEditorProps) {
  const w = copy.bundles.wizard;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="bundle-cover-toggle"
            checked={include}
            onCheckedChange={(v) => onIncludeChange(v === true)}
          />
          <Label htmlFor="bundle-cover-toggle" className="cursor-pointer">
            {w.includeCoverToggle}
          </Label>
        </div>

        <div className="space-y-1">
          <Label>{w.coverTitleLabel}</Label>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={w.coverTitlePlaceholder}
            disabled={!include}
          />
        </div>
        <div className="space-y-1">
          <Label>{w.coverSubtitleLabel}</Label>
          <Input
            value={subtitle}
            onChange={(e) => onSubtitleChange(e.target.value)}
            placeholder={w.coverSubtitlePlaceholder}
            disabled={!include}
          />
        </div>
        <div className="space-y-1">
          <Label>{w.coverRecipientLabel}</Label>
          <Input
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            placeholder={w.coverRecipientPlaceholder}
            disabled={!include}
          />
        </div>
      </div>

      <aside className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {w.coverPreviewHeading}
        </p>
        <div
          className="rounded-md border bg-white p-4 text-[9px] shadow-sm dark:bg-neutral-900 dark:text-white"
          style={{ aspectRatio: "8.5 / 11" }}
        >
          <div className="h-0.5 w-full bg-foreground" />
          <div className="mt-4 text-base font-semibold leading-tight text-foreground">
            {include ? title || "—" : ""}
          </div>
          {include && subtitle ? (
            <div className="mt-2 text-xs text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
          {include && recipient ? (
            <div className="mt-3 text-[10px] text-muted-foreground">
              Prepared for: {recipient}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
