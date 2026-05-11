"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAREER_VAULT_CATEGORIES,
  CAREER_VAULT_CATEGORY_EMOJI,
} from "@/lib/career-vault/constants";
import { formatFileSize, isImageMime } from "@/lib/career-vault/utils";
import { requestSmartTagSuggestion } from "@/lib/career-vault/ai-analysis";
import type {
  CareerVaultCategory,
  SmartTagSuggestion,
} from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { useUploadVaultFile } from "@/hooks/use-career-vault";
import { useAIPreferences } from "@/hooks/use-ai-preferences";
import { FileUploadZone } from "./FileUploadZone";
import { FileTypeIcon } from "./FileTypeIcon";
import { SmartTagBanner } from "./SmartTagBanner";
import { TagAutocomplete } from "./TagAutocomplete";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CareerVaultCopy;
  initialCategory?: CareerVaultCategory;
}

export function UploadModal({
  open,
  onOpenChange,
  copy,
  initialCategory,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<CareerVaultCategory>(
    initialCategory ?? "resume",
  );
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Smart-tag state. `suggestion` is the raw AI payload once returned; we keep
  // it around to render the banner and to mark AI-origin tags in the chip
  // autocomplete. `aiAnalyzing` drives the pulsing "Analyzing…" state.
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<SmartTagSuggestion | null>(null);
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const analyzeTokenRef = useRef(0);

  const upload = useUploadVaultFile();
  const aiPrefs = useAIPreferences();
  const aiEnabled = aiPrefs.data?.allow_ai_analysis ?? true;

  const resetForm = () => {
    setFile(null);
    setTags([]);
    setDescription("");
    setIsStarred(false);
    setIsMaster(false);
    setSuggestion(null);
    setSuggestionApplied(false);
    setSuggestionDismissed(false);
    setAiAnalyzing(false);
    // Invalidate any in-flight analyze call so its late response is dropped.
    analyzeTokenRef.current += 1;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  // React-sanctioned "adjust state on prop change" pattern: setState during
  // render when we detect an open transition. Cheaper than an effect and
  // avoids the set-state-in-effect lint rule.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open && initialCategory) {
      setCategory(initialCategory);
    }
  }

  useEffect(() => {
    if (open) return;
    // Small delay so the closing animation doesn't flash an empty state.
    const t = window.setTimeout(resetForm, 200);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const aiSuggestedTags = useMemo(
    () => (suggestion?.suggestedTags ?? []).slice(0, 5),
    [suggestion],
  );

  const handleFileAccepted = (f: File) => {
    setFile(f);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (isImageMime(f.type)) {
      const u = URL.createObjectURL(f);
      previewUrlRef.current = u;
      setPreviewUrl(u);
    } else {
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }

    setSuggestion(null);
    setSuggestionApplied(false);
    setSuggestionDismissed(false);

    if (!aiEnabled) return;

    const token = ++analyzeTokenRef.current;
    setAiAnalyzing(true);
    void requestSmartTagSuggestion(f, { enabled: true })
      .then((res) => {
        if (analyzeTokenRef.current !== token) return;
        setAiAnalyzing(false);
        if (!res) return;
        setSuggestion(res);
      })
      .catch(() => {
        if (analyzeTokenRef.current !== token) return;
        setAiAnalyzing(false);
      });
  };

  const handleFileRejected = (message: string) => {
    toast.error(message);
  };

  const handleSubmit = async () => {
    if (!file) return;
    if (description.length > 500) {
      toast.error("Description must be under 500 characters.");
      return;
    }
    try {
      await upload.mutateAsync({
        file,
        metadata: {
          category,
          tags,
          description: description.trim() || undefined,
          isStarred,
          isMaster,
        },
      });
      onOpenChange(false);
    } catch {
      // Error toast is handled inside the hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.upload.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <FileUploadZone
              copy={copy}
              onFileAccepted={handleFileAccepted}
              onFileRejected={handleFileRejected}
              disabled={upload.isPending}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileTypeIcon mime={file.type} className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copy.actions.cancel}
                onClick={() => {
                  if (!upload.isPending) {
                    setFile(null);
                    if (previewUrlRef.current) {
                      URL.revokeObjectURL(previewUrlRef.current);
                      previewUrlRef.current = null;
                    }
                    setPreviewUrl(null);
                  }
                }}
                disabled={upload.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cv-category">
              {copy.upload.categoryLabel}
              <span className="ml-1 text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Select
              value={category}
              onValueChange={(v) => v && setCategory(v as CareerVaultCategory)}
              disabled={upload.isPending}
            >
              <SelectTrigger id="cv-category">
                <SelectValue placeholder={copy.upload.categoryPlaceholder} />
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
          </div>

          {file && (aiAnalyzing || (suggestion && !suggestionDismissed)) ? (
            <SmartTagBanner
              copy={copy}
              loading={aiAnalyzing}
              suggestion={suggestion}
              applied={suggestionApplied}
              onApplyAll={() => {
                if (!suggestion) return;
                if (suggestion.suggestedCategory) {
                  setCategory(suggestion.suggestedCategory);
                }
                if (suggestion.suggestedTags.length > 0) {
                  setTags((prev) => {
                    const seen = new Set(prev);
                    const merged = [...prev];
                    for (const t of suggestion.suggestedTags) {
                      if (!seen.has(t) && merged.length < 12) {
                        seen.add(t);
                        merged.push(t);
                      }
                    }
                    return merged;
                  });
                }
                if (
                  suggestion.suggestedDescription &&
                  description.trim().length === 0
                ) {
                  setDescription(suggestion.suggestedDescription);
                }
                setSuggestionApplied(true);
              }}
              onDismiss={() => setSuggestionDismissed(true)}
            />
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cv-tags">{copy.upload.tagsLabel}</Label>
              <span className="text-[11px] text-muted-foreground">
                {copy.upload.tagsHint}
              </span>
            </div>
            <TagAutocomplete
              id="cv-tags"
              copy={copy}
              value={tags}
              onChange={setTags}
              aiSuggested={aiSuggestedTags}
              disabled={upload.isPending}
              placeholder={copy.upload.tagsPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-description">
              {copy.upload.descriptionLabel}
            </Label>
            <Textarea
              id="cv-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={copy.upload.descriptionPlaceholder}
              maxLength={500}
              rows={3}
              disabled={upload.isPending}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {description.length} / 500
            </p>
          </div>

          <div className="space-y-2.5 rounded-lg bg-muted/40 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={isStarred}
                onCheckedChange={(v) => setIsStarred(v === true)}
                disabled={upload.isPending}
              />
              <span>{copy.upload.starLabel}</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                checked={isMaster}
                onCheckedChange={(v) => setIsMaster(v === true)}
                disabled={upload.isPending}
                className="mt-0.5"
              />
              <span className="flex flex-col">
                <span>{copy.upload.masterLabel}</span>
                <span className="text-[11px] text-muted-foreground">
                  {copy.upload.masterHint}
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={upload.isPending}
          >
            {copy.actions.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || upload.isPending}
          >
            {upload.isPending ? copy.upload.submitting : copy.upload.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
