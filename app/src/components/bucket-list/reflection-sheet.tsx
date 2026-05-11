"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import {
  useBucketItem,
  useCreateBucketReflection,
} from "@/hooks/use-bucket-list";
import { useReflectionSummary } from "@/hooks/use-bucket-ai";
import {
  BUCKET_REFLECTION_MOODS,
  type BucketReflectionMood,
  type BucketReflectionPhoto,
} from "@/types/bucket-list";

export function ReflectionSheet() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const bucketId = useBucketListStore((s) => s.reflectionSheetBucketId);
  const close = useBucketListStore((s) => s.closeReflectionSheet);
  const bucket = useBucketItem(bucketId);

  const createReflection = useCreateBucketReflection();
  const reflectionSummary = useReflectionSummary();

  const [reflection, setReflection] = useState("");
  const [mood, setMood] = useState<BucketReflectionMood>("grateful");
  const [photoUrlDraft, setPhotoUrlDraft] = useState("");
  const [photos, setPhotos] = useState<BucketReflectionPhoto[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Reset form state synchronously when the target bucket changes, without a
  // setState-in-effect. `activeBucket` becomes the identity key for the form.
  const [activeBucket, setActiveBucket] = useState<string | null>(bucketId);
  if (bucketId !== activeBucket) {
    setActiveBucket(bucketId);
    setReflection("");
    setMood("grateful");
    setPhotoUrlDraft("");
    setPhotos([]);
    setAiSummary(null);
  }

  async function handleGenerateSummary() {
    if (!bucket.data) return;
    try {
      const res = await reflectionSummary.mutateAsync({
        dreamTitle: bucket.data.title,
        reflection,
        mood,
      });
      setAiSummary(res.summary);
    } catch {
      // toast shown by hook elsewhere if needed
    }
  }

  async function handleSave() {
    if (!bucket.data) return;
    await createReflection.mutateAsync({
      bucket_item_id: bucket.data.id,
      reflection_text: reflection.trim() || null,
      ai_summary: aiSummary,
      mood,
      photo_gallery: photos,
    });
    close();
  }

  function addPhoto() {
    const url = photoUrlDraft.trim();
    if (!url) return;
    setPhotos((prev) => [...prev, { url, caption: null, taken_at: null }]);
    setPhotoUrlDraft("");
  }

  return (
    <Sheet open={Boolean(bucketId)} onOpenChange={(v) => !v && close()}>
      <SheetContent
        side="right"
        className="flex w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{copy.reflectTitle}</SheetTitle>
          <SheetDescription>{copy.reflectDescription}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <Label>{copy.reflectPrompt}</Label>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={7}
                placeholder="The moments that stayed with you, the small things, the unexpected…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{copy.reflectMoodLabel}</Label>
                <Select
                  value={mood}
                  onValueChange={(v) =>
                    setMood((v as BucketReflectionMood) ?? "grateful")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKET_REFLECTION_MOODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reflection.trim().length < 20 || reflectionSummary.isPending}
                  onClick={handleGenerateSummary}
                >
                  {reflectionSummary.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {copy.reflectGenerateSummary}
                </Button>
              </div>
            </div>

            {aiSummary ? (
              <div className="rounded-lg border bg-lime-400/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-300">
                  AI summary
                </p>
                <p className="mt-1 text-sm">{aiSummary}</p>
              </div>
            ) : null}

            <div>
              <Label>{copy.reflectAddPhoto}</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://…"
                  value={photoUrlDraft}
                  onChange={(e) => setPhotoUrlDraft(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={addPhoto}>
                  Add
                </Button>
              </div>
              {photos.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {photos.map((p, i) => (
                    <li key={`${p.url}-${i}`} className="truncate">
                      {p.url}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-3">
          <Button variant="ghost" onClick={close}>
            {copy.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={createReflection.isPending}
            className="bg-lime-400 text-black hover:bg-lime-300"
          >
            {createReflection.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {copy.reflectSave}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
