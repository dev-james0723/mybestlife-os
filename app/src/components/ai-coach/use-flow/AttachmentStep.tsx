"use client";

import Link from "next/link";
import { Paperclip, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";
import { CAREER_VAULT_CATEGORY_EMOJI } from "@/lib/career-vault/constants";
import type { VaultFile } from "@/types/ai-coach";
import { formatFileSize } from "@/lib/career-vault/utils";

interface Props {
  copy: AICoachCopy;
  filterCategories: string[];
  allFiles: VaultFile[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  vaultHref: string;
}

export function AttachmentStep({
  copy,
  filterCategories,
  allFiles,
  selectedIds,
  onToggle,
  vaultHref,
}: Props) {
  const relevant = filterCategories.length
    ? allFiles.filter((f) => filterCategories.includes(f.category))
    : allFiles;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Paperclip className="h-4 w-4" />
          {copy.flow.attachments.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {copy.flow.attachments.description}
        </p>
      </div>

      {relevant.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {copy.flow.attachments.noFilesInCategory}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            render={<Link href={vaultHref} />}
          >
            {copy.flow.attachments.goToVault}
          </Button>
        </div>
      ) : (
        <ul className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
          {relevant.map((f) => {
            const checked = selectedIds.has(f.id);
            return (
              <li key={f.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    checked
                      ? "border-foreground/30 bg-accent/40"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(f.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {f.filename}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span aria-hidden>
                        {CAREER_VAULT_CATEGORY_EMOJI[f.category]}
                      </span>
                      <span>{f.category.replace("_", " ")}</span>
                      <span aria-hidden>·</span>
                      <span>{formatFileSize(f.file_size)}</span>
                    </p>
                  </div>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="text-right text-xs text-muted-foreground">
        <Badge variant="secondary" className="font-normal">
          {copy.flow.attachments.selectedCount(selectedIds.size)}
        </Badge>
      </div>
    </div>
  );
}
