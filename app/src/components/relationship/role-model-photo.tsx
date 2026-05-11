"use client";

/**
 * RoleModelPhoto — picks the right rendering strategy for a role-model photo.
 *
 *   - Supabase-hosted URLs (in our `role-model-photos` bucket): use
 *     `next/image` (with `fill`) so we get automatic resizing, modern
 *     formats (AVIF/WebP), and lazy-loading.
 *   - Any other URL the user pasted (Wikipedia thumbnail, third-party CDN,
 *     etc.): plain `<img>`. We can't whitelist every hostname in
 *     `next.config.ts`, and `<img>` works everywhere.
 *   - No URL: render nothing — the parent `<Avatar>` already shows its
 *     fallback (initials or icon).
 *
 * The component can live inside an `<Avatar>` or any regular rectangular
 * container. It does NOT render its own frame or border radius.
 *
 * If the optimized `next/image` request fails (broken object, network), we
 * silently degrade to letting the `<AvatarFallback>` show through by
 * rendering nothing — the same behavior as `<AvatarImage>`'s built-in
 * onError handling.
 */

import Image from "next/image";
import { useState } from "react";
import { isRoleModelStorageUrl } from "@/lib/role-models/photo-storage";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  /** Approximate rendered size in CSS pixels — feeds `next/image`'s `sizes`. */
  pixelSize?: number;
  /** Optional alt; usually empty since these sit inside named contexts. */
  alt?: string;
  className?: string;
  /**
   * Tailwind-friendly object-position for portraits (e.g. `object-[center_22%]`).
   * Defaults to geometric center; faces are often higher — callers can bias up.
   */
  objectPositionClassName?: string;
};

export function RoleModelPhoto({
  src,
  pixelSize = 80,
  alt = "",
  className,
  objectPositionClassName = "object-center",
}: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) return null;

  if (isRoleModelStorageUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${Math.max(pixelSize, 64)}px`}
        // Avatar is small + already shown above the fold once the panel is
        // open, so eager loading reduces perceived latency for the user's
        // first interaction.
        priority={false}
        className={cn(
          "object-cover",
          objectPositionClassName,
          // The parent Avatar root is `relative`; `fill` requires a
          // positioned ancestor — Avatar already provides this.
          className,
        )}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "h-full w-full object-cover",
        objectPositionClassName,
        className,
      )}
      onError={() => setErrored(true)}
    />
  );
}
