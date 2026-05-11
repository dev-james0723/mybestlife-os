import { NextResponse } from "next/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { youTubeThumbnailUrlFromPageUrl } from "@/lib/knowledge/youtube";
import {
  isUrlReachable,
  searchDuckDuckGo,
} from "@/lib/search/duckduckgo-html";

type ResourceCategory =
  | "video"
  | "article"
  | "podcast"
  | "news"
  | "image"
  | "website"
  | "other";

type ResourceItem = {
  category: ResourceCategory;
  title: string;
  url: string;
  source: string;
  thumbnailUrl: string | null;
  description: string;
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const RESOURCE_CATEGORY_SET = new Set<ResourceCategory>([
  "video",
  "article",
  "podcast",
  "news",
  "image",
  "website",
  "other",
]);

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconThumbnailUrl(url: string): string | null {
  const host = domainOf(url);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

function previewThumbnailForResource(
  _category: ResourceCategory,
  url: string,
): string | null {
  const yt = youTubeThumbnailUrlFromPageUrl(url);
  if (yt) return yt;
  return faviconThumbnailUrl(url);
}

function sourceLabel(domain: string): string {
  if (domain.includes("youtube.com") || domain.includes("youtu.be"))
    return "YouTube";
  if (domain.includes("wikipedia.org")) return "Wikipedia";
  if (domain.includes("spotify.com")) return "Spotify";
  if (domain.includes("podcasts.apple.com")) return "Apple Podcasts";
  if (domain.includes("unsplash.com")) return "Unsplash";
  if (domain.includes("pexels.com")) return "Pexels";
  if (domain.includes("medium.com")) return "Medium";
  if (domain.includes("bbc.com") || domain.includes("bbc.co.uk"))
    return "BBC";
  if (domain.includes("nytimes.com")) return "NY Times";
  if (domain.includes("theguardian.com")) return "The Guardian";
  if (domain.includes("reuters.com")) return "Reuters";
  if (domain.includes("github.com")) return "GitHub";
  if (domain.includes("gitlab.com")) return "GitLab";
  const parts = domain.split(".");
  const name = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function categoryFromUrl(url: string): ResourceCategory {
  const u = url.toLowerCase();
  if (u.includes("wikipedia.org")) return "article";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "video";
  if (u.includes("vimeo.com") || u.includes("bilibili.com")) return "video";
  if (
    u.includes("spotify.com/episode") ||
    u.includes("spotify.com/show") ||
    u.includes("podcasts.apple.com") ||
    u.includes("anchor.fm") ||
    u.includes("overcast.fm") ||
    u.includes("soundcloud.com")
  ) {
    return "podcast";
  }
  if (
    u.includes("unsplash.com") ||
    u.includes("pexels.com") ||
    u.includes("pixabay.com")
  ) {
    return "image";
  }
  if (
    u.includes("reuters.com") ||
    u.includes("bbc.co.uk") ||
    u.includes("bbc.com/news") ||
    u.includes("nytimes.com") ||
    u.includes("theguardian.com") ||
    u.includes("apnews.com") ||
    u.includes("cnn.com") ||
    u.includes("wsj.com") ||
    u.includes("bloomberg.com")
  ) {
    return "news";
  }
  if (
    u.includes("github.com") ||
    u.includes("gitlab.com") ||
    u.includes("stackoverflow.com") ||
    u.includes("stackexchange.com") ||
    u.includes("npmjs.com") ||
    u.includes("pypi.org") ||
    u.includes("readthedocs.io") ||
    u.includes("developer.mozilla.org") ||
    /\.(dev|app)(\/|$)/i.test(u) ||
    u.includes("react.dev") ||
    u.includes("nextjs.org") ||
    u.includes("vuejs.org") ||
    u.includes("tailwindcss.com")
  ) {
    return "website";
  }
  if (
    u.includes("notion.so") ||
    u.includes("docs.google.com") ||
    u.includes("drive.google.com") ||
    u.includes("figma.com") ||
    u.includes("trello.com") ||
    u.includes("miro.com")
  ) {
    return "other";
  }
  return "article";
}

/** Prefer real URL signals; align with planner-task buildWebResources. */
function effectiveCategory(
  url: string,
  hint: ResourceCategory,
): ResourceCategory | null {
  const d = categoryFromUrl(url);
  if (d === "video" || d === "podcast" || d === "image") return d;

  if (d === "news") {
    if (hint === "news" || hint === "article" || hint === "website")
      return "news";
    return null;
  }

  if (d === "website" || d === "other") {
    if (hint === "video" || hint === "podcast" || hint === "image") return null;
    return d;
  }

  // d === "article"
  if (hint === "video" || hint === "podcast" || hint === "image") return null;
  if (hint === "news") return null;
  if (hint === "website") {
    if (uIncludesBlogHost(url)) return "article";
    return "website";
  }
  return "article";
}

function uIncludesBlogHost(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("medium.com") || u.includes("substack.com");
}

async function verifyYouTubeUrl(url: string): Promise<boolean> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  try {
    const res = await fetch(endpoint, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function verifyResourceUrl(
  category: ResourceCategory,
  url: string,
): Promise<boolean> {
  const domain = domainOf(url);
  if (
    category === "video" &&
    (domain.includes("youtube.com") || domain.includes("youtu.be"))
  ) {
    return verifyYouTubeUrl(url);
  }
  return isUrlReachable(url);
}

function buildResourceDescription(category: ResourceCategory): string {
  if (category === "video") return "Video from web search (verified).";
  if (category === "article") return "Article from web search (verified).";
  if (category === "podcast") return "Podcast from web search (verified).";
  if (category === "news") return "News from web search (verified).";
  if (category === "image") return "Image from web search (verified).";
  if (category === "website") return "Website / docs from web search (verified).";
  if (category === "other") return "Related resource from web search (verified).";
  return "Resource from web search (verified).";
}

type SearchPlan = { query: string; hint: ResourceCategory };

function buildProjectSearchPlan(
  projectName: string,
  aiQueries: string[],
  language: string,
): SearchPlan[] {
  const base = projectName.trim();
  const zh = language === "zh-TW" || language === "zh-CN";
  const plans: SearchPlan[] = [];

  plans.push({
    query: zh ? `${base} 官方 網站 文件` : `${base} official site documentation`,
    hint: "website",
  });

  if (aiQueries.length > 0) {
    for (const q of aiQueries.slice(0, 3)) {
      plans.push({ query: q, hint: "article" });
    }
  } else {
    plans.push({
      query: zh ? `${base} 指南 教學` : `${base} guide tutorial`,
      hint: "article",
    });
  }

  plans.push({ query: `site:youtube.com ${base}`, hint: "video" });
  plans.push({
    query: zh ? `${base} podcast spotify` : `${base} podcast spotify apple`,
    hint: "podcast",
  });
  plans.push({
    query: zh
      ? `${base} 新聞 site:bbc.com OR site:reuters.com OR site:nytimes.com`
      : `${base} news site:bbc.com OR site:reuters.com OR site:nytimes.com`,
    hint: "news",
  });
  plans.push({
    query: `site:unsplash.com ${base} OR site:pexels.com ${base}`,
    hint: "image",
  });

  if (aiQueries.length > 3) {
    plans.push({ query: aiQueries[3]!, hint: "article" });
  } else {
    plans.push({
      query: zh ? `${base} 實用 技巧` : `${base} best practices tips`,
      hint: "article",
    });
  }

  plans.push({
    query: zh ? `${base} site:github.com` : `${base} site:github.com`,
    hint: "website",
  });

  return plans;
}

function parseSearchQueriesFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as { searchQueries?: unknown }).searchQueries;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, 8);
}

function isGeminiResourceHostAllowed(hostname: string): boolean {
  const h = hostname.replace(/^www\./, "").toLowerCase();
  const roots = [
    "wikipedia.org",
    "github.com",
    "gitlab.com",
    "developer.mozilla.org",
    "react.dev",
    "nextjs.org",
    "vuejs.org",
    "tailwindcss.com",
    "podcasts.apple.com",
    "open.spotify.com",
    "spotify.com",
    "youtube.com",
    "youtu.be",
    "unsplash.com",
    "pexels.com",
    "bbc.com",
    "bbc.co.uk",
    "reuters.com",
    "medium.com",
    "dev.to",
    "stackoverflow.com",
    "npmjs.com",
    "readthedocs.io",
  ];
  return roots.some((r) => h === r || h.endsWith(`.${r}`));
}

function coerceResourceCategory(raw: unknown): ResourceCategory | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "web" || v === "site") return "website";
  if (RESOURCE_CATEGORY_SET.has(v as ResourceCategory))
    return v as ResourceCategory;
  return null;
}

async function fetchGeminiCuratedResources(
  projectName: string,
  language: string,
  apiKey: string,
): Promise<ResourceItem[]> {
  const isZh = language === "zh-TW" || language === "zh-CN";
  const systemInstruction = `You output ONLY valid JSON. No markdown fences.

Return shape:
{"resources":[{"category":"website"|"article"|"news"|"video"|"podcast"|"image"|"other","title":string,"url":string}]}

Rules:
- Suggest 6 resources with **distinct categories** when possible for the project topic.
- Every "url" must be https and must use hosts you trust to exist (Wikipedia, GitHub, MDN, official *.dev docs, BBC/Reuters news, Spotify/Apple podcasts, Unsplash, YouTube channels or watch URLs you are sure exist).
- For Wikipedia, use the correct /wiki/ title with underscores instead of spaces.
- ${isZh ? "Include at least one Chinese Wikipedia (zh.wikipedia.org) link when relevant." : "Prefer en.wikipedia.org when relevant."}
- Never invent obscure paths on domains you are unsure about.
- Do not duplicate URLs.`;

  const userText = `Project name: "${projectName.replace(/"/g, "'")}"`;

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText,
    });
    const parsed = JSON.parse(text) as { resources?: unknown };
    const rawList = parsed.resources;
    if (!Array.isArray(rawList)) return [];

    const out: ResourceItem[] = [];
    for (const row of rawList) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const url = typeof r.url === "string" ? r.url.trim() : "";
      const title = typeof r.title === "string" ? r.title.trim() : "";
      let category = coerceResourceCategory(r.category);
      if (!url || !title || !url.startsWith("https://")) continue;
      let host: string;
      try {
        host = new URL(url).hostname;
      } catch {
        continue;
      }
      if (!isGeminiResourceHostAllowed(host)) continue;
      const fromUrl = categoryFromUrl(url);
      if (!category) category = fromUrl;
      if (fromUrl === "video" || fromUrl === "podcast" || fromUrl === "image")
        category = fromUrl;

      const verified = await verifyResourceUrl(category, url);
      if (!verified) continue;

      out.push({
        category,
        title,
        url,
        source: sourceLabel(host),
        thumbnailUrl: previewThumbnailForResource(category, url),
        description: buildResourceDescription(category),
      });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

function mergeResourcesByUrl(
  primary: ResourceItem[],
  extra: ResourceItem[],
  max: number,
): ResourceItem[] {
  const seen = new Set<string>();
  const merged: ResourceItem[] = [];
  for (const it of [...primary, ...extra]) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    merged.push(it);
    if (merged.length >= max) break;
  }
  return merged;
}

async function fetchResourcesFromDuckDuckGo(
  projectName: string,
  language: string,
  aiQueries: string[],
): Promise<ResourceItem[]> {
  const plan = buildProjectSearchPlan(projectName, aiQueries, language);
  const searchResults = await Promise.allSettled(
    plan.map(async ({ query, hint }) => {
      const hits = await searchDuckDuckGo(query, { maxHits: 8 });
      return { hits, hint, query };
    }),
  );

  type Candidate = {
    category: ResourceCategory;
    title: string;
    url: string;
    snippet: string;
    source: string;
  };

  const candidates: Candidate[] = [];
  const seenUrl = new Set<string>();
  const bucket: Partial<Record<ResourceCategory, number>> = {};

  for (const result of searchResults) {
    if (result.status !== "fulfilled") continue;
    const { hits, hint } = result.value;
    for (const hit of hits) {
      if (/duckduckgo\.com/i.test(hit.url)) continue;
      if (seenUrl.has(hit.url)) continue;

      const category = effectiveCategory(hit.url, hint);
      if (!category) continue;

      const current = bucket[category] ?? 0;
      if (current >= 2) continue;

      seenUrl.add(hit.url);
      bucket[category] = current + 1;

      const domain = domainOf(hit.url);
      candidates.push({
        category,
        title: hit.title,
        url: hit.url,
        snippet: hit.snippet,
        source: sourceLabel(domain),
      });
      if (candidates.length >= 18) break;
    }
    if (candidates.length >= 18) break;
  }

  const validated: ResourceItem[] = [];
  const chunkSize = 5;
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const slice = candidates.slice(i, i + chunkSize);
    const flags = await Promise.all(
      slice.map((c) => verifyResourceUrl(c.category, c.url)),
    );
    for (let j = 0; j < slice.length; j++) {
      if (!flags[j]) continue;
      const c = slice[j]!;
      validated.push({
        category: c.category,
        title: c.title,
        url: c.url,
        source: c.source,
        thumbnailUrl: previewThumbnailForResource(c.category, c.url),
        description:
          c.snippet.trim() || buildResourceDescription(c.category),
      });
      if (validated.length >= 8) return validated;
    }
  }

  return validated;
}

export async function POST(request: Request) {
  try {
    const { projectName, language } = await request.json();

    if (!projectName || typeof projectName !== "string") {
      return NextResponse.json(
        { error: "projectName is required" },
        { status: 400 },
      );
    }

    const apiKey = getGeminiServerApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }

    const langInstruction =
      language === "zh-TW" || language === "zh-CN"
        ? "Respond in Traditional Chinese (繁體中文)."
        : "Respond in English.";

    const today = new Date().toISOString().split("T")[0];

    const metadataSystemInstruction = `You are a project planning assistant. Given a project name, generate structured metadata.

${langInstruction}

Return a JSON object with:
- "description": 1-2 sentence project description
- "suggestedStatus": one of "planning","active","paused","completed","cancelled"
- "suggestedPriority": one of "low","medium","high","urgent"
- "suggestedStartDate": ISO date or null
- "suggestedEndDate": ISO date or null
- "estimatedTasks": array of 3-7 actionable task strings
- "icon": single emoji
- "tags": array of 2-4 tag strings
- "searchQueries": array of 4-10 short web-search queries in English only (keywords and phrases). These will be sent to a real search engine to find related pages. Do NOT include URLs in this array — search terms only. Make queries specific to this project topic (mix of how-to, reference, official docs, and community discussion).`;

    const userText = `Project name: "${projectName}"\nToday's date: ${today}`;

    const metadataResult = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction: metadataSystemInstruction,
      userText,
    });

    let metadata: Record<string, unknown>;
    try {
      metadata = JSON.parse(metadataResult.text) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI metadata" },
        { status: 502 },
      );
    }

    const searchQueries = parseSearchQueriesFromMetadata(metadata);
    delete metadata.searchQueries;

    const lang = typeof language === "string" ? language : "en";
    let relatedResources = await fetchResourcesFromDuckDuckGo(
      projectName,
      lang,
      searchQueries,
    );

    if (relatedResources.length < 6) {
      const curated = await fetchGeminiCuratedResources(
        projectName,
        lang,
        apiKey,
      );
      relatedResources = mergeResourcesByUrl(relatedResources, curated, 10);
    }

    return NextResponse.json({
      ...metadata,
      relatedResources,
    });
  } catch (error) {
    console.error("[generate-metadata]", error);
    return NextResponse.json(
      { error: "Failed to generate metadata" },
      { status: 500 },
    );
  }
}
