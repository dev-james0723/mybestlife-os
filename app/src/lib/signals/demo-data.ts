/**
 * Signals — demo / sample data.
 *
 * Used as an HONEST fallback when no live provider is wired or a fetch fails.
 * Every item is flagged `isDemo: true` so the UI can show the
 * "Demo signals shown. Connect live sources…" banner and the per-card
 * "why this signal?" reads "Sample signal — connect a source."
 *
 * These are NOT presented as real current headlines: they are clearly-labeled
 * samples whose `sourceUrl` points at the real publisher's homepage (never a
 * fabricated article URL that would 404). This satisfies the product rule:
 * "never unlabeled fabricated news" (§20).
 *
 * Thumbnails on demo items are deterministic topic ABSTRACTS (`isFallback:true`,
 * no real URL) — never a stock/AI photo presented as the article's image
 * (§ "no fake thumbnails").
 *
 * Demo content lives ONLY in this file — never scattered inside React
 * components. The pool is intentionally larger than one screen so the two
 * refresh actions can ROTATE it and the change is visible (§ refresh).
 */

import { getFallbackThumbnailForTopic } from "./thumbnails";
import type {
  SignalContentType,
  SignalItem,
  SignalMediaType,
  SignalSourceTier,
  SignalVideoProvider,
} from "./types";

type DemoSeed = {
  id: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  domain: string;
  qualityTier: SignalSourceTier;
  topic: string;
  region?: string;
  contentType: SignalContentType;
  tags: string[];
  whyItMatters: string;
  /** Base hours-ago; rotation re-derives freshness so refresh visibly reorders. */
  hoursAgo: number;
  corroborationCount?: number;
  mediaType?: SignalMediaType;
  marketTag?: string;
  ticker?: string;
  videoUrl?: string;
  videoProvider?: SignalVideoProvider;
  channelName?: string;
  duration?: string;
};

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: "demo-ai-1",
    headline: "Sample — A major lab ships a faster, cheaper open model",
    summary:
      "Sample signal illustrating how an AI model release would appear here, grounded in a real source. Connect a live source to replace this with today's actual reporting.",
    sourceName: "Ars Technica",
    sourceUrl: "https://arstechnica.com/",
    domain: "arstechnica.com",
    qualityTier: "high",
    topic: "AI",
    contentType: "developing",
    tags: ["AI", "models", "open-source"],
    whyItMatters:
      "Model cost/quality shifts ripple through every product built on top of them.",
    hoursAgo: 3,
    corroborationCount: 4,
  },
  {
    id: "demo-world-1",
    headline: "Sample — Global summit reaches a tentative climate agreement",
    summary:
      "Sample world-affairs signal. Live World Signals would show high-corroboration global stories from multiple quality outlets. Connect a source to enable real-time updates.",
    sourceName: "Reuters",
    sourceUrl: "https://www.reuters.com/",
    domain: "reuters.com",
    qualityTier: "high",
    topic: "World affairs",
    contentType: "breaking",
    tags: ["World affairs", "climate", "policy"],
    whyItMatters: "Multi-country agreements set the policy backdrop for years.",
    hoursAgo: 6,
    corroborationCount: 9,
  },
  {
    id: "demo-finance-1",
    headline: "Sample — Central bank holds rates, signals a cautious outlook",
    summary:
      "Sample finance signal. Connect a live source to see today's actual markets reporting, summarized only from the source's own text.",
    sourceName: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com/",
    domain: "bloomberg.com",
    qualityTier: "high",
    topic: "Finance",
    contentType: "analysis",
    tags: ["Finance", "markets", "rates"],
    whyItMatters: "Rate decisions move borrowing costs, currencies, and equities.",
    hoursAgo: 9,
    corroborationCount: 6,
  },
  {
    id: "demo-science-1",
    headline: "Sample — Researchers report a step forward in battery density",
    summary:
      "Sample science signal demonstrating the card layout. Real items would be summarized strictly from the publisher's snippet.",
    sourceName: "Nature",
    sourceUrl: "https://www.nature.com/",
    domain: "nature.com",
    qualityTier: "high",
    topic: "Science",
    contentType: "analysis",
    tags: ["Science", "energy", "research"],
    whyItMatters: "Energy-storage gains underpin EVs, grids, and devices.",
    hoursAgo: 14,
  },
  {
    id: "demo-startups-1",
    headline: "Sample — A developer-tools startup raises to expand its platform",
    summary:
      "Sample startups signal. The Tech layer can be powered by free sources such as the Hacker News API once enabled.",
    sourceName: "TechCrunch",
    sourceUrl: "https://techcrunch.com/",
    domain: "techcrunch.com",
    qualityTier: "medium",
    topic: "Startups",
    contentType: "developing",
    tags: ["Startups", "funding", "developer-tools"],
    whyItMatters: "Funding flows hint at where the tooling ecosystem is heading.",
    hoursAgo: 18,
  },
  {
    id: "demo-local-1",
    headline: "Sample — City transport authority adjusts weekend service",
    summary:
      "Sample local signal. Local Signals are city/region level (never fabricated district precision) and driven by your detected or chosen city.",
    sourceName: "RTHK",
    sourceUrl: "https://www.rthk.hk/",
    domain: "rthk.hk",
    qualityTier: "high",
    topic: "Local",
    region: "Hong Kong",
    contentType: "local",
    tags: ["Local", "transport"],
    whyItMatters: "Local service changes affect your day-to-day commute and plans.",
    hoursAgo: 5,
  },
  {
    id: "demo-local-2",
    headline: "Sample — Weather observatory issues a routine advisory",
    summary:
      "Sample local alert. Official safety/weather alerts are the one genuinely urgent feed Signals may refresh more often.",
    sourceName: "Hong Kong Observatory",
    sourceUrl: "https://www.hko.gov.hk/",
    domain: "hko.gov.hk",
    qualityTier: "high",
    topic: "Local",
    region: "Hong Kong",
    contentType: "local",
    tags: ["Local", "weather", "alert"],
    whyItMatters: "Official alerts are timely and verifiable — worth a glance.",
    hoursAgo: 2,
    mediaType: "alert",
  },
  {
    id: "demo-edu-1",
    headline: "Sample — Study examines how spaced practice improves recall",
    summary:
      "Sample education signal. With Brain/Notes consent on, items like this can connect to your learning topics.",
    sourceName: "BBC",
    sourceUrl: "https://www.bbc.com/",
    domain: "bbc.com",
    qualityTier: "high",
    topic: "Education",
    contentType: "analysis",
    tags: ["Education", "learning", "research"],
    whyItMatters: "Evidence-based learning methods compound over time.",
    hoursAgo: 22,
  },
  {
    id: "demo-design-1",
    headline: "Sample — A design system team open-sources its tokens toolkit",
    summary:
      "Sample design signal showing how a Personal Signal tied to your projects would surface.",
    sourceName: "The Verge",
    sourceUrl: "https://www.theverge.com/",
    domain: "theverge.com",
    qualityTier: "medium",
    topic: "Design",
    contentType: "developing",
    tags: ["Design", "tooling", "open-source"],
    whyItMatters: "Reusable design tooling speeds up product teams.",
    hoursAgo: 16,
  },
  {
    id: "demo-culture-1",
    headline: "Sample — A festival announces its cross-disciplinary lineup",
    summary:
      "Sample culture signal. Connect Projects/Calendar consent to see how event-adjacent stories are tied to your work.",
    sourceName: "The Guardian",
    sourceUrl: "https://www.theguardian.com/",
    domain: "theguardian.com",
    qualityTier: "high",
    topic: "Culture",
    contentType: "opinion",
    tags: ["Culture", "music", "events"],
    whyItMatters: "Programming trends inform how live events are curated.",
    hoursAgo: 27,
  },
  // ── Extra breadth so refresh rotation visibly changes the set ──
  {
    id: "demo-ai-2",
    headline: "Sample — Open-weights coding model tops a public benchmark",
    summary:
      "Sample AI signal. Benchmarks move fast; live sources would show the actual leaderboard shift summarized from the publisher's own text.",
    sourceName: "Hacker News",
    sourceUrl: "https://news.ycombinator.com/",
    domain: "news.ycombinator.com",
    qualityTier: "medium",
    topic: "AI",
    contentType: "developing",
    tags: ["AI", "coding", "benchmarks"],
    whyItMatters: "Coding-model gains directly affect developer workflows.",
    hoursAgo: 4,
    corroborationCount: 3,
  },
  {
    id: "demo-world-2",
    headline: "Sample — Trade ministers outline a new supply-chain framework",
    summary:
      "Sample world signal. Real World Signals favor multi-source corroboration over any single outlet's framing.",
    sourceName: "Associated Press",
    sourceUrl: "https://apnews.com/",
    domain: "apnews.com",
    qualityTier: "high",
    topic: "World affairs",
    contentType: "global",
    tags: ["World affairs", "trade", "policy"],
    whyItMatters: "Supply-chain rules shape prices and availability downstream.",
    hoursAgo: 11,
    corroborationCount: 7,
  },
  {
    id: "demo-health-1",
    headline: "Sample — Large study revisits everyday sleep guidance",
    summary:
      "Sample health signal. Health items are summarized conservatively and never offered as medical advice.",
    sourceName: "BBC",
    sourceUrl: "https://www.bbc.com/",
    domain: "bbc.com",
    qualityTier: "high",
    topic: "Health",
    contentType: "analysis",
    tags: ["Health", "sleep", "research"],
    whyItMatters: "Everyday-habit evidence is high-leverage and broadly relevant.",
    hoursAgo: 30,
  },
  {
    id: "demo-business-1",
    headline: "Sample — A cloud provider reorganizes around AI infrastructure",
    summary:
      "Sample business signal showing how strategy stories surface. Connect a live source for today's actual reporting.",
    sourceName: "Financial Times",
    sourceUrl: "https://www.ft.com/",
    domain: "ft.com",
    qualityTier: "high",
    topic: "Business",
    contentType: "analysis",
    tags: ["Business", "cloud", "AI"],
    whyItMatters: "Where infrastructure money flows shapes the next tooling cycle.",
    hoursAgo: 20,
  },
  // ── Markets (source-grounded NEWS only — never fabricated quotes/prices) ──
  {
    id: "demo-market-1",
    headline: "Sample — Chip suppliers rally as AI demand outlook firms up",
    summary:
      "Sample markets signal. Markets Signals carry source-grounded NEWS only — headlines, earnings, index moves — never fabricated live prices or financial advice.",
    sourceName: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com/markets",
    domain: "bloomberg.com",
    qualityTier: "high",
    topic: "Markets",
    contentType: "analysis",
    tags: ["Markets", "semiconductors", "AI"],
    whyItMatters: "Chip demand is a leading indicator for the broader AI buildout.",
    hoursAgo: 7,
    mediaType: "market",
    marketTag: "Equities",
    ticker: "SOX",
    corroborationCount: 5,
  },
  {
    id: "demo-market-2",
    headline: "Sample — Markets steady ahead of the inflation print",
    summary:
      "Sample macro signal. We summarize the source's framing of the setup — we never predict the number or give advice.",
    sourceName: "Reuters",
    sourceUrl: "https://www.reuters.com/markets/",
    domain: "reuters.com",
    qualityTier: "high",
    topic: "Markets",
    contentType: "developing",
    tags: ["Markets", "macro", "inflation"],
    whyItMatters: "Inflation data resets rate expectations across asset classes.",
    hoursAgo: 1,
    mediaType: "market",
    marketTag: "Macro",
    corroborationCount: 6,
  },
  // ── Video (real channel homepages; demo videos use topic-abstract thumbnails) ──
  {
    id: "demo-video-1",
    headline: "Sample — A two-minute explainer on a new AI research result",
    summary:
      "Sample video signal. Live video comes from selected YouTube channel RSS feeds with the real YouTube thumbnail; we never fabricate video content.",
    sourceName: "Two Minute Papers",
    sourceUrl: "https://www.youtube.com/@TwoMinutePapers",
    domain: "youtube.com",
    qualityTier: "medium",
    topic: "AI",
    contentType: "analysis",
    tags: ["AI", "video", "research"],
    whyItMatters: "Short explainers are an efficient way to track research momentum.",
    hoursAgo: 8,
    mediaType: "video",
    videoProvider: "youtube",
    videoUrl: "https://www.youtube.com/@TwoMinutePapers",
    channelName: "Two Minute Papers",
    duration: "5:12",
  },
  {
    id: "demo-video-2",
    headline: "Sample — A walkthrough of a new web framework release",
    summary:
      "Sample video signal demonstrating the play overlay and channel chip. Connect video sources to populate this from real channel feeds.",
    sourceName: "Fireship",
    sourceUrl: "https://www.youtube.com/@Fireship",
    domain: "youtube.com",
    qualityTier: "medium",
    topic: "Technology",
    contentType: "developing",
    tags: ["Technology", "video", "web"],
    whyItMatters: "Framework releases change how product teams ship.",
    hoursAgo: 13,
    mediaType: "video",
    videoProvider: "youtube",
    videoUrl: "https://www.youtube.com/@Fireship",
    channelName: "Fireship",
    duration: "8:40",
  },
];

/** Number of distinct demo items (exposed for tests + rotation math). */
export const DEMO_POOL_SIZE = DEMO_SEEDS.length;

function seedToItem(seed: DemoSeed, ageHours: number, now: number, nowIso: string): SignalItem {
  return {
    id: seed.id,
    headline: seed.headline,
    summary: seed.summary,
    source: {
      name: seed.sourceName,
      url: seed.sourceUrl,
      domain: seed.domain,
      qualityTier: seed.qualityTier,
    },
    sourceUrl: seed.sourceUrl,
    publishedAt: new Date(now - ageHours * 60 * 60 * 1000).toISOString(),
    lastCheckedAt: nowIso,
    topic: seed.topic,
    region: seed.region,
    contentType: seed.contentType,
    tags: seed.tags,
    whyItMatters: seed.whyItMatters,
    relevanceBasis: "demo",
    isDemo: true,
    corroborationCount: seed.corroborationCount,
    mediaType: seed.mediaType ?? "article",
    // Demo thumbnails are HONEST topic abstracts, never a real photo of "the article".
    thumbnail: getFallbackThumbnailForTopic(seed.topic),
    marketTag: seed.marketTag,
    ticker: seed.ticker,
    videoUrl: seed.videoUrl,
    videoProvider: seed.videoProvider,
    channelName: seed.channelName,
    duration: seed.duration,
    transcriptAvailable: false,
  };
}

/**
 * Returns demo signals with fresh relative timestamps. The optional
 * `rotateSeed` deterministically rotates which items are "freshest" so the two
 * refresh actions produce a VISIBLY different ordering/Top-3 each time, while
 * staying reproducible for a given seed (§ refresh, no fabricated novelty —
 * just a different slice of the same labeled sample pool).
 */
export function getSignalsDemoData(rotateSeed = 0): SignalItem[] {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const n = DEMO_SEEDS.length;
  const offset = ((Math.trunc(rotateSeed) % n) + n) % n;
  return DEMO_SEEDS.map((seed, idx) => {
    // Rotate the freshness ranking by the seed: the item at rotated position 0
    // becomes the freshest, so ranking (freshness-weighted) reorders visibly.
    const rotatedRank = (idx + offset) % n;
    const ageHours = 1 + rotatedRank * 1.4;
    return seedToItem(seed, ageHours, now, nowIso);
  });
}
