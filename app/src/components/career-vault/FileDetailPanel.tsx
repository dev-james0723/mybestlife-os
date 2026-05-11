"use client";

import { useMemo, useState } from "react";
import { Star, X as XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CAREER_VAULT_CATEGORIES,
  CAREER_VAULT_CATEGORY_EMOJI,
} from "@/lib/career-vault/constants";
import {
  formatFileSize,
  sanitizeFilename,
} from "@/lib/career-vault/utils";
import type {
  CareerVaultCategory,
  CareerVaultFile,
} from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { useUpdateVaultFile } from "@/hooks/use-career-vault";

interface FileDetailPanelProps {
  file: CareerVaultFile;
  copy: CareerVaultCopy;
  className?: string;
}

export function FileDetailPanel({
  file,
  copy,
  className,
}: FileDetailPanelProps) {
  const update = useUpdateVaultFile();

  const [filename, setFilename] = useState(file.filename);
  const [category, setCategory] = useState<CareerVaultCategory>(file.category);
  const [tagsInput, setTagsInput] = useState(file.tags.join(", "));
  const [description, setDescription] = useState(file.description ?? "");
  const [isStarred, setIsStarred] = useState(file.is_starred);
  const [isMaster, setIsMaster] = useState(file.is_master);

  const parsedTags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [tagsInput]);

  const dirty = useMemo(() => {
    const cleanFilename = sanitizeFilename(filename);
    const cleanDescription = description.trim() || null;
    const currentDescription = file.description ?? null;
    return (
      cleanFilename !== file.filename ||
      category !== file.category ||
      JSON.stringify(parsedTags) !== JSON.stringify(file.tags) ||
      cleanDescription !== currentDescription ||
      isStarred !== file.is_starred ||
      isMaster !== file.is_master
    );
  }, [
    filename,
    category,
    parsedTags,
    description,
    isStarred,
    isMaster,
    file,
  ]);

  const handleSave = async () => {
    if (!dirty) return;
    await update.mutateAsync({
      id: file.id,
      updates: {
        filename: sanitizeFilename(filename) || file.filename,
        category,
        tags: parsedTags,
        description: description.trim() || null,
        is_starred: isStarred,
        is_master: isMaster,
      },
    });
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {isStarred ? (
          <Badge className="bg-amber-500 text-white">
            <Star className="mr-1 h-3 w-3 fill-current" />
            {copy.detail.starred}
          </Badge>
        ) : null}
        {isMaster ? (
          <Badge className="bg-violet-500 text-white">
            {copy.detail.master}
          </Badge>
        ) : null}
      </div>

      <section className="space-y-2">
        <Label htmlFor="cv-detail-filename">{copy.detail.filenameLabel}</Label>
        <Input
          id="cv-detail-filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          maxLength={180}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="cv-detail-category">{copy.detail.categoryLabel}</Label>
        <Select
          value={category}
          onValueChange={(v) => v && setCategory(v as CareerVaultCategory)}
        >
          <SelectTrigger id="cv-detail-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAREER_VAULT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="mr-1.5" aria-hidden>
                  {CAREER_VAULT_CATEGORY_EMOJI[c]}
                </span>
                {copy.categories[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="cv-detail-tags">{copy.detail.tagsLabel}</Label>
          <span className="text-[11px] text-muted-foreground">
            {copy.upload.tagsHint}
          </span>
        </div>
        <Input
          id="cv-detail-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={copy.upload.tagsPlaceholder}
          maxLength={200}
        />
        {parsedTags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {parsedTags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 font-normal">
                #{t}
                <button
                  type="button"
                  aria-label={`Remove tag ${t}`}
                  onClick={() =>
                    setTagsInput(
                      parsedTags.filter((x) => x !== t).join(", "),
                    )
                  }
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <Label htmlFor="cv-detail-desc">{copy.detail.descriptionLabel}</Label>
        <Textarea
          id="cv-detail-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={copy.upload.descriptionPlaceholder}
          rows={4}
          maxLength={500}
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {description.length} / 500
        </p>
      </section>

      <section className="space-y-2.5 rounded-lg bg-muted/40 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isStarred}
            onCheckedChange={(v) => setIsStarred(v === true)}
          />
          <span>{copy.upload.starLabel}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <Checkbox
            checked={isMaster}
            onCheckedChange={(v) => setIsMaster(v === true)}
            className="mt-0.5"
          />
          <span className="flex flex-col">
            <span>{copy.upload.masterLabel}</span>
            <span className="text-[11px] text-muted-foreground">
              {copy.upload.masterHint}
            </span>
          </span>
        </label>
      </section>

      <Separator />

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <InfoRow label={copy.detail.fileType} value={shortMime(file.mime_type)} />
        <InfoRow label={copy.detail.fileSize} value={formatFileSize(file.file_size)} />
        <InfoRow label={copy.detail.createdAt} value={formatDate(file.created_at)} />
        <InfoRow label={copy.detail.updatedAt} value={formatDate(file.updated_at)} />
      </dl>

      <Button
        onClick={handleSave}
        disabled={!dirty || update.isPending}
        className="w-full"
      >
        {update.isPending ? copy.actions.saving : copy.actions.save}
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function shortMime(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/msword") return "DOC";
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "DOCX";
  if (mime === "image/jpeg") return "JPG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "text/markdown") return "Markdown";
  if (mime === "text/plain") return "Text";
  return mime;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
