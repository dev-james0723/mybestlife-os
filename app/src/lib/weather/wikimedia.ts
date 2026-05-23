/**
 * Wikimedia / Wikipedia adapter — zero-config background photo fallback.
 *
 * Why this exists
 * ---------------
 * Unsplash gives the most cinematic photos, but it requires
 * `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` to be set. Wikipedia's REST API is
 * free, CORS-friendly, and returns a representative photo for almost
 * every named city / district, so the Weather page is never reduced to a
 * flat gradient just because someone forgot to set an env var.
 *
 * Strategy
 * --------
 * 1. Try the page summary for the most specific name we have
 *    (e.g. "Tsuen Wan").
 * 2. Fall back to the broader location ("Hong Kong").
 * 3. Fall back to coordinates → Wikipedia GeoSearch → first nearby page
 *    that carries a thumbnail.
 *
 * Returns `null` on any failure so callers can chain to the CSS scene.
 */

const WP_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const WP_GEOSEARCH =
  "https://en.wikipedia.org/w/api.php?action=query&list=geosearch&format=json&origin=*&gslimit=10&gsradius=10000&gsprop=type%7Cname";
const WP_QUERY =
  "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=1600";

export type WikimediaPhoto = {
  url: string;
  credit: {
    /** Always "Wikipedia / Wikimedia Commons contributors" — Wikipedia
     *  doesn't expose photographer name through the summary endpoint, so
     *  we credit the platform per CC-BY-SA attribution guidance. */
    name: string;
    profileUrl: string;
    photoUrl: string;
  };
};

export async function fetchWikimediaBackground(params: {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}): Promise<WikimediaPhoto | null> {
  const queries = [params.city, params.region, params.country].filter(
    (q): q is string => Boolean(q && q.trim().length > 0),
  );

  for (const q of queries) {
    const photo = await trySummary(q);
    if (photo) return photo;
  }

  if (params.latitude != null && params.longitude != null) {
    const photo = await tryGeoSearch(params.latitude, params.longitude);
    if (photo) return photo;
  }

  return null;
}

async function trySummary(title: string): Promise<WikimediaPhoto | null> {
  try {
    const res = await fetch(`${WP_SUMMARY}${encodeURIComponent(title)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      type?: string;
      originalimage?: { source?: string };
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };
    // Disambiguation / "no extract" pages are not useful.
    if (data.type === "disambiguation" || data.type === "no-extract") {
      return null;
    }
    const url = data.originalimage?.source ?? data.thumbnail?.source;
    const pageUrl =
      data.content_urls?.desktop?.page ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    if (!url) return null;
    return {
      url,
      credit: {
        name: "Wikipedia",
        profileUrl: "https://en.wikipedia.org",
        photoUrl: pageUrl,
      },
    };
  } catch {
    return null;
  }
}

async function tryGeoSearch(
  lat: number,
  lon: number,
): Promise<WikimediaPhoto | null> {
  try {
    const url = `${WP_GEOSEARCH}&gscoord=${lat}%7C${lon}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { geosearch?: Array<{ title?: string; type?: string }> };
    };
    const candidates = data.query?.geosearch ?? [];
    // Prefer "city" / "isle" / "landmark" results over "event" etc.
    const ranked = candidates
      .filter((c) => c.title)
      .sort((a, b) => priority(b.type) - priority(a.type));
    // Try up to 3 candidates' lead images via the pageimages query.
    for (const c of ranked.slice(0, 3)) {
      if (!c.title) continue;
      const photo = await tryPageImages(c.title);
      if (photo) return photo;
    }
    return null;
  } catch {
    return null;
  }
}

function priority(type?: string): number {
  switch (type) {
    case "city":
    case "town":
    case "isle":
    case "landmark":
    case "adm1st":
    case "adm2nd":
    case "adm3rd":
      return 3;
    case "country":
      return 2;
    case "mountain":
    case "waterbody":
    case "forest":
      return 1;
    default:
      return 0;
  }
}

async function tryPageImages(title: string): Promise<WikimediaPhoto | null> {
  try {
    const url = `${WP_QUERY}&titles=${encodeURIComponent(title)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            original?: { source?: string };
            thumbnail?: { source?: string };
            title?: string;
          }
        >;
      };
    };
    const pages = data.query?.pages ?? {};
    const first = Object.values(pages)[0];
    const photoUrl = first?.original?.source ?? first?.thumbnail?.source;
    if (!photoUrl) return null;
    return {
      url: photoUrl,
      credit: {
        name: "Wikipedia",
        profileUrl: "https://en.wikipedia.org",
        photoUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(first?.title ?? title)}`,
      },
    };
  } catch {
    return null;
  }
}
