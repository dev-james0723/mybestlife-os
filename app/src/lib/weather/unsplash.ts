/**
 * Unsplash adapter for the cinematic background photo on the Weather page.
 *
 * Reads `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` (publishable; Unsplash's free
 * "demo" tier allows ~50 req/h per IP which is plenty for a page that
 * loads at most once per minute on refresh).
 *
 * Per Unsplash API terms we MUST credit the photographer + link to the
 * source photo. The returned `credit` object is rendered as a corner
 * caption on the page.
 *
 * Returns null on any failure — the UI falls back to the CSS-only animated
 * scene from `scene-mapper.ts`.
 */

const UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos";

function getAccessKey(): string | null {
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  return key && key.length > 0 ? key : null;
}

export type UnsplashPhoto = {
  url: string;
  credit: {
    name: string;
    profileUrl: string;
    photoUrl: string;
  };
};

type UnsplashSearchResponse = {
  results?: Array<{
    urls?: { regular?: string; full?: string };
    links?: { html?: string };
    user?: { name?: string; username?: string; links?: { html?: string } };
  }>;
};

/**
 * Search Unsplash for a photo matching the location + weather condition.
 * Falls back through progressively less specific queries.
 */
export async function fetchUnsplashBackground(params: {
  city?: string;
  country?: string;
  conditionCode: string;
  timeOfDay: string;
}): Promise<UnsplashPhoto | null> {
  const key = getAccessKey();
  if (!key) return null;

  const queries = buildQueryFallbacks(params);
  for (const q of queries) {
    const photo = await tryQuery(q, key);
    if (photo) return photo;
  }
  return null;
}

function buildQueryFallbacks(params: {
  city?: string;
  country?: string;
  conditionCode: string;
  timeOfDay: string;
}): string[] {
  const out: string[] = [];
  const city = params.city?.trim();
  const country = params.country?.trim();
  const tod = humanizeTimeOfDay(params.timeOfDay);

  // City-first queries only — mixing weather terms ("cloudy", "rainy")
  // into the search often returns abstract art instead of skylines.
  if (city) {
    if (tod) {
      out.push(`${city} ${tod} skyline`);
      out.push(`${city} ${tod} cityscape`);
    }
    out.push(`${city} skyline`);
    out.push(`${city} cityscape`);
    out.push(`${city} aerial view`);
    out.push(`${city} landmark`);
    out.push(`${city} downtown`);
  }
  if (country && country.length > 2) {
    out.push(`${country} city skyline`);
    out.push(`${country} capital skyline`);
  }
  return out;
}

function humanizeTimeOfDay(t: string): string {
  switch (t) {
    case "dawn":
      return "sunrise";
    case "morning":
      return "morning";
    case "midday":
      return "midday";
    case "afternoon":
      return "afternoon";
    case "evening":
      return "evening";
    case "night":
      return "night";
    default:
      return "";
  }
}

async function tryQuery(query: string, key: string): Promise<UnsplashPhoto | null> {
  const url = new URL(UNSPLASH_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("per_page", "5");
  url.searchParams.set("content_filter", "high");
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as UnsplashSearchResponse;
    const first = data.results?.[0];
    const photoUrl = first?.urls?.regular ?? first?.urls?.full;
    const credit = first?.user;
    const photoLink = first?.links?.html;
    if (!photoUrl || !credit?.name || !credit.links?.html || !photoLink) {
      return null;
    }
    return {
      url: photoUrl,
      credit: {
        name: credit.name,
        profileUrl: credit.links.html,
        photoUrl: photoLink,
      },
    };
  } catch {
    return null;
  }
}
