"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagInput } from "./tag-input";
import { useAppStore } from "@/stores/app-store";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import {
  getQuoteCategoryLabel,
  getQuoteLibraryUiCopy,
  getQuoteToneLabel,
} from "@/lib/i18n/quote-library-ui";
import { detectQuoteLanguage } from "@/lib/quote-library/detect-language";
import {
  QUOTE_EMOTION_TONES,
  QUOTE_SOURCE_TYPES,
  type QuoteCategory,
  type QuoteEmotionTone,
  type QuoteSourceType,
} from "@/types/quote";
import { QUOTE_CATEGORY_GROUPS } from "@/lib/quote-library/categories";
import { useCreateQuote, useQuotes, useUpdateQuote } from "@/hooks/use-quotes";
import { APP_LOCALES, LOCALE_SELECT_LABELS } from "@/lib/i18n/app-locale";
import type { Quote } from "@/types/quote";

type FormState = {
  quote_text: string;
  source_author: string;
  source_context: string;
  source_url: string;
  source_type: QuoteSourceType | "";
  category: QuoteCategory | "";
  emotion_tone: QuoteEmotionTone | "";
  tags: string[];
  personal_note: string;
  is_favorite: boolean;
  language: string;
  languageManuallySet: boolean;
};

function buildInitialForm(
  editingQuote: Quote | null,
  defaultLanguage: string,
): FormState {
  if (editingQuote) {
    return {
      quote_text: editingQuote.quote_text,
      source_author: editingQuote.source_author ?? "",
      source_context: editingQuote.source_context ?? "",
      source_url: editingQuote.source_url ?? "",
      source_type: (editingQuote.source_type as QuoteSourceType | null) ?? "",
      category: (editingQuote.category as QuoteCategory | null) ?? "",
      emotion_tone:
        (editingQuote.emotion_tone as QuoteEmotionTone | null) ?? "",
      tags: editingQuote.tags ?? [],
      personal_note: editingQuote.personal_note ?? "",
      is_favorite: editingQuote.is_favorite,
      language: editingQuote.language ?? defaultLanguage,
      languageManuallySet: true,
    };
  }
  return {
    quote_text: "",
    source_author: "",
    source_context: "",
    source_url: "",
    source_type: "",
    category: "",
    emotion_tone: "",
    tags: [],
    personal_note: "",
    is_favorite: false,
    language: defaultLanguage,
    languageManuallySet: false,
  };
}

export function AddQuoteSheet() {
  const isOpen = useQuoteLibraryStore((s) => s.isAddSheetOpen);
  const editingId = useQuoteLibraryStore((s) => s.editingId);
  const closeSheet = useQuoteLibraryStore((s) => s.closeSheet);
  const { data: quotes } = useQuotes();
  const language = useAppStore((s) => s.language);

  const editingQuote = useMemo(
    () => (editingId ? quotes?.find((q) => q.id === editingId) ?? null : null),
    [editingId, quotes],
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) closeSheet();
  };

  // Remount the inner form whenever we switch between add/edit so we don't
  // need a `useEffect` to reset state — keeps React 19 strict mode happy and
  // avoids the `set-state-in-effect` cascade.
  const formKey = isOpen ? `${editingQuote?.id ?? "new"}:${language}` : "closed";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        size="2xl"
        className="max-h-[min(90vh,860px)] overflow-y-auto"
      >
        <QuoteFormBody
          key={formKey}
          editingQuote={editingQuote}
          onDone={closeSheet}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuoteFormBody({
  editingQuote,
  onDone,
}: {
  editingQuote: Quote | null;
  onDone: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();

  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(editingQuote, language),
  );

  const handleQuoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setForm((prev) => ({
      ...prev,
      quote_text: next,
      language: prev.languageManuallySet
        ? prev.language
        : detectQuoteLanguage(next),
    }));
  };

  const selectValue = useCallback(
    (value: string | null, key: keyof FormState) => {
      setForm((prev) => ({
        ...prev,
        [key]: value ?? "",
      }));
    },
    [],
  );

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;
  const canSubmit =
    form.quote_text.trim().length > 0 &&
    form.quote_text.trim().length <= 4000 &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = {
      quote_text: form.quote_text.trim(),
      source_author: form.source_author.trim() || null,
      source_context: form.source_context.trim() || null,
      source_url: form.source_url.trim() || null,
      source_type: form.source_type || null,
      category: form.category || null,
      emotion_tone: form.emotion_tone || null,
      tags: form.tags,
      personal_note: form.personal_note.trim() || null,
      is_favorite: form.is_favorite,
      language: form.language,
    };

    try {
      if (editingQuote) {
        await updateMutation.mutateAsync({ id: editingQuote.id, data: payload });
      } else {
        await createMutation.mutateAsync({ ...payload, source_module: "manual" });
      }
      onDone();
    } catch {
      toast.error(copy.errorGeneric);
    }
  };

  const title = editingQuote ? copy.editSheetTitle : copy.addSheetTitle;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

        <div className="grid gap-4 pt-1 sm:gap-5">
          <div className="space-y-2">
            <Label htmlFor="quote-text">{copy.labelQuote}</Label>
            <Textarea
              id="quote-text"
              value={form.quote_text}
              onChange={handleQuoteChange}
              placeholder={copy.placeholderQuote}
              rows={5}
              className="min-h-[132px] rounded-xl font-serif text-lg leading-relaxed"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-author">{copy.labelAuthor}</Label>
              <Input
                id="quote-author"
                value={form.source_author}
                onChange={(e) =>
                  setForm((p) => ({ ...p, source_author: e.target.value }))
                }
                placeholder={copy.placeholderAuthor}
                className="h-[44px] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-context">{copy.labelContext}</Label>
              <Input
                id="quote-context"
                value={form.source_context}
                onChange={(e) =>
                  setForm((p) => ({ ...p, source_context: e.target.value }))
                }
                placeholder={copy.placeholderContext}
                className="h-[44px] rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-url">{copy.labelUrl}</Label>
              <Input
                id="quote-url"
                type="url"
                value={form.source_url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, source_url: e.target.value }))
                }
                placeholder={copy.placeholderUrl}
                className="h-[44px] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.labelSourceType}</Label>
              <Select
                value={form.source_type || undefined}
                onValueChange={(v) => selectValue(v, "source_type")}
              >
                <SelectTrigger className="h-[44px] min-h-[44px] rounded-xl">
                  <SelectValue placeholder={copy.filterAny} />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{copy.labelCategory}</Label>
              <Select
                value={form.category || undefined}
                onValueChange={(v) => selectValue(v, "category")}
              >
                <SelectTrigger className="h-[44px] min-h-[44px] rounded-xl">
                  <SelectValue placeholder={copy.filterAny} />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_CATEGORY_GROUPS.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>
                        {copy.categoryGroupLabels[group.id]}
                      </SelectLabel>
                      {group.categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {getQuoteCategoryLabel(language, c)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy.labelTone}</Label>
              <Select
                value={form.emotion_tone || undefined}
                onValueChange={(v) => selectValue(v, "emotion_tone")}
              >
                <SelectTrigger className="h-[44px] min-h-[44px] rounded-xl">
                  <SelectValue placeholder={copy.filterAny} />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_EMOTION_TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {getQuoteToneLabel(language, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{copy.labelTags}</Label>
            <TagInput
              value={form.tags}
              onChange={(tags) => setForm((p) => ({ ...p, tags }))}
              placeholder={copy.placeholderTags}
              ariaLabel={copy.labelTags}
            />
            <p className="text-xs text-muted-foreground">{copy.helperTags}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-note">{copy.labelPersonalNote}</Label>
            <Textarea
              id="quote-note"
              value={form.personal_note}
              onChange={(e) =>
                setForm((p) => ({ ...p, personal_note: e.target.value }))
              }
              placeholder={copy.placeholderPersonalNote}
              rows={3}
              className="min-h-[96px] rounded-xl"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{copy.labelLanguage}</Label>
              <Select
                value={form.language}
                onValueChange={(v) =>
                  v &&
                  setForm((p) => ({
                    ...p,
                    language: v,
                    languageManuallySet: true,
                  }))
                }
              >
                <SelectTrigger className="h-[44px] min-h-[44px] rounded-xl">
                  <SelectValue placeholder={copy.languageAuto} />
                </SelectTrigger>
                <SelectContent>
                  {APP_LOCALES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LOCALE_SELECT_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl text-sm">
                <Checkbox
                  checked={form.is_favorite}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, is_favorite: v === true }))
                  }
                />
                {copy.labelMarkFavorite}
              </label>
            </div>
          </div>
        </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isSubmitting}
          className="h-[44px] min-h-[44px] rounded-xl px-4"
        >
          {copy.buttonCancel}
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="h-[44px] min-h-[44px] rounded-xl px-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {copy.buttonSaving}
            </>
          ) : editingQuote ? (
            copy.buttonUpdate
          ) : (
            copy.buttonSave
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
