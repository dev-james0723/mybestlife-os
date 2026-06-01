"use client";

import { useState } from "react";
import { Info, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateBucketReflection } from "@/hooks/use-bucket-list";
import { useMemoryReflection } from "@/hooks/use-bucket-ai";
import { DreamImageUploader } from "../images/dream-image-uploader";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import {
  BUCKET_REFLECTION_MOODS,
  type BucketDreamMemory,
  type BucketItem,
  type BucketReflectionMood,
  type BucketReflectionPhoto,
} from "@/types/bucket-list";

/**
 * The "Capture the memory" flow for a completed (or any) dream. Builds on the
 * existing reflection system: reflection text, mood, "what changed in me",
 * memory photos (uploaded to the Phase 2 bucket), an AI-shaped structured
 * memory (interpretation only), then saved onto a bucket_reflections row.
 * Nothing is required — "Skip for now" closes without writing.
 */
export function RealizedDreamReflectionWizard({
  item,
  copy,
  onClose,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
  onClose: () => void;
}) {
  const createReflection = useCreateBucketReflection();
  const generateMemory = useMemoryReflection();

  const [reflection, setReflection] = useState("");
  const [mood, setMood] = useState<BucketReflectionMood>("grateful");
  const [changedMe, setChangedMe] = useState("");
  const [photoUrlDraft, setPhotoUrlDraft] = useState("");
  const [photos, setPhotos] = useState<BucketReflectionPhoto[]>([]);
  const [memory, setMemory] = useState<BucketDreamMemory | null>(null);

  const canGenerate =
    (reflection.trim().length >= 12 || changedMe.trim().length >= 12) &&
    !generateMemory.isPending;
  const canSave =
    Boolean(reflection.trim() || changedMe.trim() || photos.length || memory) &&
    !createReflection.isPending;

  function addPhotoUrl() {
    const url = photoUrlDraft.trim();
    if (!url) return;
    setPhotos((prev) => [...prev, { url, caption: null, taken_at: null }]);
    setPhotoUrlDraft("");
  }

  async function handleGenerate() {
    try {
      const result = await generateMemory.mutateAsync({
        bucketItemId: item.id,
        reflectionText: reflection,
        mood,
        changedMe,
      });
      setMemory(result);
    } catch {
      // toast handled in the hook
    }
  }

  async function handleSave() {
    await createReflection.mutateAsync({
      bucket_item_id: item.id,
      reflection_text: reflection.trim() || null,
      mood,
      photo_gallery: photos,
      changed_me: changedMe.trim() || null,
      ai_summary: memory?.summary ?? null,
      ai_memory: memory,
    });
    onClose();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {copy.memoryCaptureDescription}
        </p>

        <div>
          <Label>{copy.reflectPrompt}</Label>
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={5}
            placeholder="The moments that stayed with you, the small things, the unexpected…"
          />
        </div>

        <div>
          <Label>{copy.memoryChangedLabel}</Label>
          <Textarea
            value={changedMe}
            onChange={(e) => setChangedMe(e.target.value)}
            rows={3}
            placeholder={copy.memoryChangedPlaceholder}
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
          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {generateMemory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generateMemory.isPending ? copy.memoryGenerating : copy.memoryGenerate}
            </Button>
          </div>
        </div>

        {memory ? (
          <div className="space-y-2 rounded-lg border border-lime-400/30 bg-lime-400/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-500">
              {copy.memoryPreviewTitle}
            </p>
            <p className="text-sm font-medium">{memory.summary}</p>
            <MemoryRow label={copy.memoryWhatHappened} value={memory.whatHappened} />
            <MemoryRow label={copy.memoryWhyMattered} value={memory.whyItMattered} />
            <MemoryRow label={copy.memoryWhatChanged} value={memory.whatChanged} />
            <MemoryRow label={copy.memoryWhatLearned} value={memory.whatLearned} />
            <MemoryRow label={copy.memoryLifeChapter} value={memory.lifeChapter} />
            <MemoryRow label={copy.memoryWhatUnlocked} value={memory.whatUnlocked} />
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" />
              {copy.memoryInterpretNote}
            </p>
          </div>
        ) : null}

        <div>
          <Label>{copy.memoryPhotosHeading}</Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://…"
              value={photoUrlDraft}
              onChange={(e) => setPhotoUrlDraft(e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={addPhotoUrl}>
              {copy.reflectAddPhoto}
            </Button>
            <DreamImageUploader
              bucketItemId={item.id}
              imageType="memory_photo"
              label={copy.memoryUploadPhoto}
              copy={copy}
              onUploaded={(rec) =>
                setPhotos((prev) => [
                  ...prev,
                  { url: rec.image_url, caption: null, taken_at: null },
                ])
              }
            />
          </div>
          {photos.length > 0 ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- memory photo from our bucket / user URL
                <img
                  key={`${p.url}-${i}`}
                  src={p.url}
                  alt="Memory"
                  className="h-20 w-full rounded-md object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t px-6 py-3">
        <Button variant="ghost" onClick={onClose}>
          {copy.memorySkip}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="bg-lime-400 text-black hover:bg-lime-300"
        >
          {createReflection.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {copy.memorySave}
        </Button>
      </div>
    </div>
  );
}

function MemoryRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13px]">
      <span className="font-medium text-foreground">{label}: </span>
      <span className="text-muted-foreground">{value}</span>
    </p>
  );
}
