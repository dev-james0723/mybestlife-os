"use client";

import { useMemo } from "react";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGenerateCoverImage } from "@/hooks/use-bucket-ai";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

/** Keyword → realistic photo concepts. Concepts are image ideas, not facts. */
const CONCEPT_RULES: { patterns: RegExp[]; concepts: string[] }[] = [
  { patterns: [/iceland|aurora|northern light/i], concepts: ["Northern Lights over snow", "blue glacier cave", "black sand beach"] },
  { patterns: [/kyoto/i], concepts: ["Kyoto old street at dusk", "cherry blossoms by a temple", "traditional onsen"] },
  { patterns: [/tokyo/i], concepts: ["Tokyo skyline at night", "neon Shibuya street", "Mt. Fuji from afar"] },
  { patterns: [/japan|日本|sakura/i], concepts: ["Mt. Fuji and sakura", "Kyoto temple", "quiet onsen town"] },
  { patterns: [/paris/i], concepts: ["Paris rooftops at golden hour", "grand museum interior", "cozy Parisian cafe"] },
  { patterns: [/bali|maldives|beach|island|tropical/i], concepts: ["turquoise lagoon", "palm beach at sunset", "overwater villa"] },
  { patterns: [/everest|alps|mountain|summit|hike|climb/i], concepts: ["alpine summit at sunrise", "mountain trail with valley view", "tent under the stars"] },
  { patterns: [/safari|africa|serengeti/i], concepts: ["savanna at golden hour", "wildlife on the plains", "acacia silhouette sunset"] },
];

const GENERIC_CONCEPTS = [
  "iconic landmark",
  "city skyline at golden hour",
  "local street life",
  "natural landscape",
];

function conceptsFor(item: BucketItem): string[] {
  const text = [
    item.title,
    item.destination_name ?? "",
    item.destination_city ?? "",
    item.destination_country ?? "",
    ...item.category_tags,
  ]
    .join(" ")
    .toLowerCase();
  for (const rule of CONCEPT_RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.concepts;
  }
  return GENERIC_CONCEPTS;
}

/**
 * Suggests realistic cover-image concepts for a travel dream and generates them
 * via the Phase 2 cover system (always labeled as an AI-generated visual).
 */
export function DestinationImageSuggestions({
  item,
  copy,
  onUploadOwn,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
  onUploadOwn: () => void;
}) {
  const concepts = useMemo(() => conceptsFor(item), [item]);
  const generate = useGenerateCoverImage();

  const destLabel =
    item.destination_name || item.destination_city || item.destination_country || item.title;

  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-fuchsia-500" />
        {copy.destImageHeading}
      </h3>
      <p className="mb-3 text-[12px] text-muted-foreground">{copy.destImageHint}</p>
      <div className="flex flex-wrap gap-2">
        {concepts.map((concept) => (
          <Button
            key={concept}
            size="sm"
            variant="outline"
            disabled={generate.isPending}
            onClick={() =>
              generate.mutate({
                bucketItemId: item.id,
                title: item.title,
                type: item.type,
                destination: `${destLabel} — ${concept}`,
                style: "realistic_travel",
                setAsCover: true,
              })
            }
          >
            {generate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {concept}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onUploadOwn}>
          <ImagePlus className="h-3.5 w-3.5" />
          {copy.destImageUploadOwn}
        </Button>
      </div>
    </section>
  );
}
