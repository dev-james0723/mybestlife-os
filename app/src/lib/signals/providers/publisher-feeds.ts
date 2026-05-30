/**
 * Publisher RSS providers — image-rich feeds from major outlets.
 *
 * Google News RSS carries NO thumbnails and blocks reliable OG scraping, so
 * world/topic/local Signals use publisher feeds that embed real `media:*` or
 * `<img>` images in the feed XML (BBC, Guardian, Ars, Wired, NYT, SCMP, …).
 */

import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";
import { fetchRssXml, parseRssXml } from "./parse-rss";

type FeedSeed = {
  url: string;
  sourceName: string;
  topic: string;
  contentType: RawSignalItem["contentType"];
  region?: string;
};

const PROVIDER_ID = "publisher-rss";

/** Global/world — all verified to include lead images in the feed XML. */
const WORLD_FEEDS: FeedSeed[] = [
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    sourceName: "BBC News",
    topic: "World affairs",
    contentType: "global",
  },
  {
    url: "https://www.theguardian.com/world/rss",
    sourceName: "The Guardian",
    topic: "World affairs",
    contentType: "global",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    sourceName: "The New York Times",
    topic: "World affairs",
    contentType: "global",
  },
];

/** Topic → curated image-rich feeds (extend as needed). */
const TOPIC_FEEDS: Record<string, FeedSeed[]> = {
  AI: [
    {
      url: "https://www.wired.com/feed/tag/ai/latest/rss",
      sourceName: "Wired",
      topic: "AI",
      contentType: "analysis",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
      sourceName: "Ars Technica",
      topic: "AI",
      contentType: "analysis",
    },
  ],
  Technology: [
    {
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      sourceName: "BBC News",
      topic: "Technology",
      contentType: "analysis",
    },
    {
      url: "https://www.theguardian.com/technology/rss",
      sourceName: "The Guardian",
      topic: "Technology",
      contentType: "analysis",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/index",
      sourceName: "Ars Technica",
      topic: "Technology",
      contentType: "analysis",
    },
  ],
  Business: [
    {
      url: "https://feeds.bbci.co.uk/news/business/rss.xml",
      sourceName: "BBC News",
      topic: "Business",
      contentType: "analysis",
    },
    {
      url: "https://www.theguardian.com/business/rss",
      sourceName: "The Guardian",
      topic: "Business",
      contentType: "analysis",
    },
  ],
  Finance: [
    {
      url: "https://www.theguardian.com/business/rss",
      sourceName: "The Guardian",
      topic: "Finance",
      contentType: "analysis",
    },
    {
      url: "https://feeds.bbci.co.uk/news/business/rss.xml",
      sourceName: "BBC News",
      topic: "Finance",
      contentType: "analysis",
    },
  ],
  Markets: [
    {
      url: "https://www.theguardian.com/business/rss",
      sourceName: "The Guardian",
      topic: "Markets",
      contentType: "analysis",
    },
    {
      url: "https://feeds.bbci.co.uk/news/business/rss.xml",
      sourceName: "BBC News",
      topic: "Markets",
      contentType: "analysis",
    },
  ],
  Startups: [
    {
      url: "https://www.wired.com/feed/rss",
      sourceName: "Wired",
      topic: "Startups",
      contentType: "analysis",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/index",
      sourceName: "Ars Technica",
      topic: "Startups",
      contentType: "analysis",
    },
  ],
  "World affairs": WORLD_FEEDS,
  Science: [
    {
      url: "https://www.theguardian.com/science/rss",
      sourceName: "The Guardian",
      topic: "Science",
      contentType: "analysis",
    },
    {
      url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      sourceName: "BBC News",
      topic: "Science",
      contentType: "analysis",
    },
  ],
  Climate: [
    {
      url: "https://www.theguardian.com/environment/rss",
      sourceName: "The Guardian",
      topic: "Climate",
      contentType: "analysis",
    },
    {
      url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      sourceName: "BBC News",
      topic: "Climate",
      contentType: "analysis",
    },
  ],
  Health: [
    {
      url: "https://www.theguardian.com/society/health/rss",
      sourceName: "The Guardian",
      topic: "Health",
      contentType: "analysis",
    },
    {
      url: "https://feeds.bbci.co.uk/news/health/rss.xml",
      sourceName: "BBC News",
      topic: "Health",
      contentType: "analysis",
    },
  ],
  Law: [
    {
      url: "https://www.theguardian.com/law/rss",
      sourceName: "The Guardian",
      topic: "Law",
      contentType: "analysis",
    },
  ],
  Education: [
    {
      url: "https://www.theguardian.com/education/rss",
      sourceName: "The Guardian",
      topic: "Education",
      contentType: "analysis",
    },
  ],
  Music: [
    {
      url: "https://www.theguardian.com/music/rss",
      sourceName: "The Guardian",
      topic: "Music",
      contentType: "analysis",
    },
  ],
  Arts: [
    {
      url: "https://www.theguardian.com/artanddesign/rss",
      sourceName: "The Guardian",
      topic: "Arts",
      contentType: "analysis",
    },
  ],
  Design: [
    {
      url: "https://www.theguardian.com/artanddesign/rss",
      sourceName: "The Guardian",
      topic: "Design",
      contentType: "analysis",
    },
  ],
  Culture: [
    {
      url: "https://www.theguardian.com/culture/rss",
      sourceName: "The Guardian",
      topic: "Culture",
      contentType: "analysis",
    },
  ],
  Travel: [
    {
      url: "https://www.theguardian.com/travel/rss",
      sourceName: "The Guardian",
      topic: "Travel",
      contentType: "analysis",
    },
  ],
};

const DEFAULT_TOPIC_FEEDS: FeedSeed[] = [
  {
    url: "https://www.wired.com/feed/rss",
    sourceName: "Wired",
    topic: "Technology",
    contentType: "analysis",
  },
];

function localFeedsFor(req: SignalProviderRequest): FeedSeed[] {
  const cc = (req.location?.countryCode ?? "").toUpperCase();
  const city = (req.location?.city ?? "").toLowerCase();
  const region = req.location?.region ?? req.location?.city;

  if (cc === "HK" || city.includes("hong kong") || city.includes("香港")) {
    return [
      {
        url: "https://www.scmp.com/rss/91/feed",
        sourceName: "South China Morning Post",
        topic: "Local",
        contentType: "local",
        region: region ?? "Hong Kong",
      },
      {
        url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
        sourceName: "BBC News",
        topic: "Local",
        contentType: "local",
        region: region ?? "Hong Kong",
      },
    ];
  }

  if (cc === "GB" || city.includes("london")) {
    return [
      {
        url: "https://feeds.bbci.co.uk/news/england/rss.xml",
        sourceName: "BBC News",
        topic: "Local",
        contentType: "local",
        region: region ?? "United Kingdom",
      },
    ];
  }

  if (cc === "US" || cc === "CA") {
    return [
      {
        url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml",
        sourceName: "The New York Times",
        topic: "Local",
        contentType: "local",
        region: region ?? "United States",
      },
      {
        url: "https://moxie.foxnews.com/google-publisher/latest.xml",
        sourceName: "Fox News",
        topic: "Local",
        contentType: "local",
        region: region ?? "United States",
      },
    ];
  }

  return [
    {
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      sourceName: "BBC News",
      topic: "Local",
      contentType: "local",
      region: region ?? "Regional",
    },
  ];
}

async function fetchFeeds(
  feeds: FeedSeed[],
  req: SignalProviderRequest,
  perFeed: number,
): Promise<RawSignalItem[]> {
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const xml = await fetchRssXml(feed.url, req.signal);
      return parseRssXml(
        xml,
        {
          topic: feed.topic,
          region: feed.region,
          contentType: feed.contentType,
          providerId: PROVIDER_ID,
          sourceName: feed.sourceName,
        },
        perFeed,
      );
    }),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export const publisherWorldProvider: SignalProvider = {
  id: "publisher-world",
  label: "Publisher RSS (World)",
  sections: ["world", "top3"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const perFeed = Math.max(8, Math.ceil((req.limit ?? 24) / WORLD_FEEDS.length));
    return fetchFeeds(WORLD_FEEDS, req, perFeed);
  },
};

export const publisherTopicProvider: SignalProvider = {
  id: "publisher-topic",
  label: "Publisher RSS (Topics)",
  sections: ["world", "personal", "top3"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const topics = (req.topics ?? []).filter((t) => t && t !== "Local").slice(0, 4);
    if (topics.length === 0) return [];

    const feedSet = new Map<string, FeedSeed>();
    for (const topic of topics) {
      const feeds = TOPIC_FEEDS[topic] ?? DEFAULT_TOPIC_FEEDS;
      for (const f of feeds) {
        feedSet.set(f.url, { ...f, topic });
      }
    }
    const feeds = [...feedSet.values()].slice(0, 8);
    const perFeed = Math.max(6, Math.ceil((req.limit ?? 24) / feeds.length));
    return fetchFeeds(feeds, req, perFeed);
  },
};

export const publisherLocalProvider: SignalProvider = {
  id: "publisher-local",
  label: "Publisher RSS (Local)",
  sections: ["local"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const city = req.location?.city;
    if (!city) return [];
    const feeds = localFeedsFor(req);
    const perFeed = Math.max(6, Math.ceil((req.limit ?? 12) / feeds.length));
    return fetchFeeds(feeds, req, perFeed);
  },
};

/** Reusable by markets provider — business/finance image-rich feeds. */
export async function fetchPublisherBusinessFeeds(
  req: SignalProviderRequest,
  limit = 12,
): Promise<RawSignalItem[]> {
  const feeds = TOPIC_FEEDS.Markets ?? TOPIC_FEEDS.Business;
  const perFeed = Math.max(2, Math.ceil(limit / feeds.length));
  return fetchFeeds(feeds, req, perFeed);
}
