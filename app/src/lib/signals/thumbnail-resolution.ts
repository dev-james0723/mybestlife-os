/**
 * Upgrade publisher thumbnail URLs to higher-resolution variants.
 * RSS feeds often ship tiny presets (e.g. BBC 240px, Guardian width=140).
 */

import { isHttpUrl } from "./thumbnails";

function decodeUrlEntities(url: string): string {
  return url.replace(/&amp;/g, "&").trim();
}

/** Target width for card / gallery hero images. */
export const THUMBNAIL_TARGET_WIDTH = 1200;

/**
 * Rewrite known CDN URL patterns to a larger asset. Same image, honest source —
 * never invents a different photo.
 */
export function upgradeThumbnailUrl(url: string): string {
  if (!isHttpUrl(url)) return url;
  let out = decodeUrlEntities(url);

  // BBC iChef — feeds ship /standard/240/; 976 is the usual large preset.
  if (/ichef\.bbci\.co\.uk/i.test(out)) {
    out = out
      .replace(/\/ace\/standard\/\d+\//i, "/ace/standard/976/")
      .replace(/\/ace\/wide\/\d+\//i, "/ace/wide/976/")
      .replace(/\/news\/\d+\//i, "/news/976/");
  }

  // The Guardian — pick larger width= query (master asset is the same file).
  if (/i\.guim\.co\.uk/i.test(out)) {
    try {
      const u = new URL(out);
      const current = Number(u.searchParams.get("width") ?? "0");
      if (current < THUMBNAIL_TARGET_WIDTH) {
        u.searchParams.set("width", String(THUMBNAIL_TARGET_WIDTH));
      }
      u.searchParams.set("quality", "90");
      if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
      if (!u.searchParams.has("fit")) u.searchParams.set("fit", "max");
      out = u.toString();
    } catch {
      // keep original
    }
  }

  // NYT static images
  if (/\.nyt\.com/i.test(out)) {
    out = out
      .replace(/articleThumb/gi, "articleLarge")
      .replace(/thumbLarge/gi, "articleLarge")
      .replace(/-thumbWide\./gi, "-superJumbo.")
      .replace(/-videoSixteenByNineJumbo160\./gi, "-superJumbo.");
  }

  // Fox News image CDN (path segment WxH)
  if (/foxnews\.com/i.test(out) && /\/\d{2,3}\/\d{2,3}\//.test(out)) {
    out = out.replace(/\/(\d{2,3})\/(\d{2,3})\//, "/1280/720/");
  }

  // SCMP — larger style preset when present
  if (/cdn\.i-scmp\.com/i.test(out)) {
    out = out.replace(/styles\/\d+x\d+/i, "styles/1920x1080");
  }

  // WordPress / generic ?w= / ?resize=
  try {
    const u = new URL(out);
    const w = u.searchParams.get("w");
    if (w && Number(w) > 0 && Number(w) < THUMBNAIL_TARGET_WIDTH) {
      u.searchParams.set("w", String(THUMBNAIL_TARGET_WIDTH));
      out = u.toString();
    }
    const resize = u.searchParams.get("resize");
    if (resize && /^\d+,\d+$/.test(resize)) {
      u.searchParams.set("resize", `${THUMBNAIL_TARGET_WIDTH},675`);
      out = u.toString();
    }
  } catch {
    // not a parseable URL
  }

  // Ars / WordPress uploads — ensure no tiny -150x150 style suffix
  out = out.replace(/-\d{2,3}x\d{2,3}(\.(jpg|jpeg|png|webp))/i, "$1");

  return out;
}

/** Score an image URL by apparent pixel width (query, path, or master asset). */
function scoreImageUrl(url: string): number {
  let score = 0;
  const widthQ = /[?&]width=(\d+)/i.exec(url);
  if (widthQ) score += Number(widthQ[1]);
  const wxh = /\/(\d{3,4})x(\d{3,4})\//.exec(url);
  if (wxh) score += Number(wxh[1]);
  if (/\/master\//i.test(url)) score += 900;
  if (/superJumbo|articleLarge|976|1920|1280/i.test(url)) score += 500;
  return score;
}

/**
 * When RSS description HTML lists several `<img>` sizes, pick the largest
 * (Guardian often embeds width=140, 460, 700 in one block).
 */
export function pickBestImageFromHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = decodeUrlEntities(m[1]);
    if (isHttpUrl(raw)) urls.push(raw);
  }
  if (urls.length === 0) return undefined;
  urls.sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a));
  return upgradeThumbnailUrl(urls[0]);
}
