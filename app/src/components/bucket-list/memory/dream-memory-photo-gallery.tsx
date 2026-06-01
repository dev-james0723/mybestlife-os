"use client";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketReflectionPhoto } from "@/types/bucket-list";

/** Photo wall for a completed dream's memory photos. */
export function DreamMemoryPhotoGallery({
  photos,
  copy,
}: {
  photos: BucketReflectionPhoto[];
  copy: BucketListUiCopy;
}) {
  if (photos.length === 0) return null;
  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">{copy.memoryPhotosHeading}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p, i) => (
          <figure key={`${p.url}-${i}`} className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element -- memory photo from our bucket / user URL */}
            <img
              src={p.url}
              alt={p.caption ?? "Memory"}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
            {p.caption ? (
              <figcaption className="px-2 py-1 text-[11px] text-muted-foreground">
                {p.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
