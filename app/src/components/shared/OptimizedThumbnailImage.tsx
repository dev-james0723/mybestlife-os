"use client";

import Image, { type ImageLoaderProps } from "next/image";
import {
  KNOWLEDGE_CARD_IMAGE_TRANSFORM,
  KNOWLEDGE_DETAIL_IMAGE_TRANSFORM,
  type KnowledgeFileImageTransform,
  isKnowledgeFilesProxyUrl,
  knowledgeFilesProxyUrlWithTransform,
} from "@/lib/knowledge/storage-thumbnail-url";
import {
  isNextOptimizedRemoteThumbnailUrl,
  isSupabasePublicStorageUrl,
  isSvgImageUrl,
  toSupabasePublicStorageTransformUrl,
} from "@/lib/images/supabase-storage-image";

type ThumbnailVariant = "card" | "detail";

const variantTransforms: Record<ThumbnailVariant, Required<KnowledgeFileImageTransform>> = {
  card: KNOWLEDGE_CARD_IMAGE_TRANSFORM,
  detail: KNOWLEDGE_DETAIL_IMAGE_TRANSFORM,
};

const variantQualities: Record<ThumbnailVariant, number> = {
  card: 70,
  detail: 72,
};

function supabaseStorageImageLoader({ src, width, quality }: ImageLoaderProps): string {
  return toSupabasePublicStorageTransformUrl(src, {
    width,
    quality: quality ?? variantQualities.card,
  });
}

export function OptimizedThumbnailImage({
  src,
  alt,
  className,
  sizes,
  variant = "card",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  variant?: ThumbnailVariant;
  priority?: boolean;
}) {
  const trimmed = src.trim();
  const loading = priority ? "eager" : "lazy";

  if (isKnowledgeFilesProxyUrl(trimmed)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Private Storage proxy needs browser cookies; Next image optimizer does not forward auth headers.
      <img
        src={knowledgeFilesProxyUrlWithTransform(trimmed, variantTransforms[variant])}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
      />
    );
  }

  if (isSupabasePublicStorageUrl(trimmed) && !isSvgImageUrl(trimmed)) {
    return (
      <Image
        loader={supabaseStorageImageLoader}
        src={trimmed}
        alt={alt}
        fill
        sizes={sizes}
        quality={variantQualities[variant]}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className={className}
      />
    );
  }

  if (isNextOptimizedRemoteThumbnailUrl(trimmed) && !isSvgImageUrl(trimmed)) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        fill
        sizes={sizes}
        quality={variantQualities[variant]}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- External thumbnails may come from arbitrary providers not configured for next/image.
    <img
      src={trimmed}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
