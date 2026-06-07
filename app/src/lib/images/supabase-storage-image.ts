const SUPABASE_PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";
const SUPABASE_RENDER_IMAGE_PREFIX = "/storage/v1/render/image/public/";

function publicSupabaseHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

export function isSupabasePublicStorageUrl(src: string | undefined | null): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return false;
  const hostname = publicSupabaseHostname();
  if (!hostname) return false;

  try {
    const url = new URL(src);
    return url.hostname === hostname && url.pathname.startsWith(SUPABASE_PUBLIC_OBJECT_PREFIX);
  } catch {
    return false;
  }
}

export function toSupabasePublicStorageTransformUrl(
  src: string,
  options: { width: number; quality?: number },
): string {
  const hostname = publicSupabaseHostname();
  if (!hostname) return src;

  try {
    const url = new URL(src);
    if (url.hostname !== hostname || !url.pathname.startsWith(SUPABASE_PUBLIC_OBJECT_PREFIX)) {
      return src;
    }

    const objectPath = url.pathname.slice(SUPABASE_PUBLIC_OBJECT_PREFIX.length);
    url.pathname = `${SUPABASE_RENDER_IMAGE_PREFIX}${objectPath}`;
    url.searchParams.set("width", String(options.width));
    url.searchParams.set("quality", String(options.quality ?? 70));
    return url.toString();
  } catch {
    return src;
  }
}

export function isSvgImageUrl(src: string): boolean {
  const lower = src.toLowerCase();
  return lower.startsWith("data:image/svg") || lower.includes(".svg");
}

export function isNextOptimizedRemoteThumbnailUrl(src: string | undefined | null): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return false;

  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;

    if (url.hostname === "i.ytimg.com" || url.hostname === "img.youtube.com") {
      return url.pathname.startsWith("/vi/") || url.pathname.startsWith("/vi_webp/");
    }

    if (url.hostname === "avatars.githubusercontent.com") return true;

    return false;
  } catch {
    return false;
  }
}
