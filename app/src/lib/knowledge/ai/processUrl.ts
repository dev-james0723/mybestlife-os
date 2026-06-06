import { contentTypeForUrlHint, type ContentType } from "@/types/knowledge";
import { extractArticleBody } from "./extractContent";

export type UrlMetadata = {
  title: string;
  description: string;
  bodyText: string;
  ogImage: string | null;
  domain: string;
  contentType: ContentType;
};

export async function processUrl(url: string): Promise<UrlMetadata> {
  const parsed = new URL(url);
  const domain = parsed.hostname.replace(/^www\./, "");
  const contentType = contentTypeForUrlHint(url);

  let title = domain;
  let description = "";
  let bodyText = "";
  let ogImage: string | null = null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MyLifeOS-Bot/1.0" },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const html = await res.text();
      title = extractMeta(html, "og:title") || extractTitle(html) || domain;
      description =
        extractMeta(html, "og:description") ||
        extractMeta(html, "description") ||
        "";
      ogImage = extractMeta(html, "og:image") || null;

      if (ogImage && !ogImage.startsWith("http")) {
        ogImage = new URL(ogImage, url).href;
      }

      bodyText = extractArticleBody(html);
    }
  } catch {
    // Fetch failed — use domain as title
  }

  return { title, description, bodyText, ogImage, domain, contentType };
}

function extractTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return (
    match?.[1]
      ?.trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">") ?? ""
  );
}

function extractMeta(html: string, name: string): string {
  const ogPattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const match = ogPattern.exec(html);
  if (match) return match[1].trim();

  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`,
    "i",
  );
  const match2 = reversed.exec(html);
  return match2?.[1]?.trim() ?? "";
}
