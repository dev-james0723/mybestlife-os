import { describe, expect, it } from "vitest";

import { DEFAULT_SIGNALS_PREFERENCES } from "./constants";
import type {
  LifeOsContext,
  SignalAction,
  SignalBehavior,
  SignalItem,
  SignalsFilterState,
  SignalsPreferences,
} from "./types";
import {
  rankSignals,
  scoreSignal,
  selectDailyTop3Signals,
} from "./scoring";
import { canonicalizeUrl, dedupeSignals, normalizeSignalItem } from "./normalize";
import { deriveRelevance } from "./relevance";
import { buildSignalNoteInput, buildSignalTaskInput } from "./brain-adapter";
import {
  computeWeeklyReflection,
  deriveBehavior,
  hasMeaningfulBehavior,
  summarizeMemory,
} from "./behavior";
import { capWidgetSignals } from "./widget";
import {
  prepareSignalDisplayPool,
  extractThumbnailFromRssItem,
  firstImageInHtml,
  getFallbackThumbnailForTopic,
  getYouTubeThumbnail,
  isRealThumbnail,
} from "./thumbnails";
import { pickBestImageFromHtml, upgradeThumbnailUrl } from "./thumbnail-resolution";
import { signalSourceHostname, signalSourceIconUrl } from "./source-icon-url";
import { needsArticleEnrichment } from "./article-metadata";
import {
  buildDeterministicOverview,
  isOverviewWorthyText,
} from "./overview";
import {
  activeFilterChips,
  applySignalFilters,
  countActiveFilters,
  DEFAULT_FILTER_STATE,
  isDefaultFilter,
  removeFilterChip,
} from "./filters";
import {
  createCustomTopic,
  customTopicBoostedTerms,
  customTopicInterestTerms,
  customTopicRssFeeds,
} from "./custom-topics";
import { getSignalsDemoData } from "./demo-data";

const NOW = Date.parse("2026-05-29T12:00:00.000Z");

function emptyCtx(overrides: Partial<LifeOsContext> = {}): LifeOsContext {
  return {
    followedTopics: [],
    projectTerms: [],
    goalTerms: [],
    brainTerms: [],
    taskTerms: [],
    calendarTerms: [],
    customTopicTerms: [],
    boostedTerms: [],
    interestTerms: [],
    location: null,
    ...overrides,
  };
}

function filter(overrides: Partial<SignalsFilterState> = {}): SignalsFilterState {
  return { ...DEFAULT_FILTER_STATE, ...overrides };
}

function prefs(overrides: Partial<SignalsPreferences> = {}): SignalsPreferences {
  return { ...DEFAULT_SIGNALS_PREFERENCES, ...overrides };
}

const DAY = 86_400_000;

function action(overrides: Partial<SignalAction> = {}): SignalAction {
  return {
    signalId: overrides.signalId ?? Math.random().toString(36).slice(2),
    kind: "save",
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

function behaviorWith(overrides: Partial<SignalBehavior> = {}): SignalBehavior {
  return {
    topicAffinity: {},
    sourceAffinity: {},
    negativitySensitivity: 0,
    politicalSensitivity: 0,
    shallowSensitivity: 0,
    suppressedIds: [],
    savedTerms: [],
    ...overrides,
  };
}

function makeSignal(overrides: Partial<SignalItem> = {}): SignalItem {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    headline: "A calm, factual update on the topic",
    summary: "Source snippet.",
    source: { name: "Reuters", url: "https://reuters.com", domain: "reuters.com", qualityTier: "high" },
    sourceUrl: "https://reuters.com/article",
    publishedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
    topic: "World affairs",
    contentType: "analysis",
    tags: ["World affairs"],
    whyItMatters: "Context.",
    relevanceBasis: "global_importance",
    ...overrides,
  };
}

describe("scoring — deterministic & honest", () => {
  it("is reproducible and never negative", () => {
    const s = makeSignal();
    const a = scoreSignal(s, prefs(), emptyCtx(), NOW);
    const b = scoreSignal(s, prefs(), emptyCtx(), NOW);
    expect(a.total).toBe(b.total);
    expect(a.total).toBeGreaterThanOrEqual(0);
  });

  it("drops hidden topics and muted sources", () => {
    const visible = makeSignal({ id: "keep", topic: "AI" });
    const hiddenTopic = makeSignal({ id: "hide", topic: "Sports" });
    const muted = makeSignal({
      id: "mute",
      source: { name: "X", url: "https://x.com", domain: "x.com", qualityTier: "unknown" },
    });
    const ranked = rankSignals(
      [visible, hiddenTopic, muted],
      prefs({ hiddenTopics: ["Sports"], mutedSources: ["x.com"] }),
      emptyCtx(),
      NOW,
    );
    const ids = ranked.map((s) => s.id);
    expect(ids).toContain("keep");
    expect(ids).not.toContain("hide");
    expect(ids).not.toContain("mute");
  });
});

describe("selectDailyTop3Signals — diversity guardrails", () => {
  it("returns at most 3 with no repeated topic", () => {
    const pool = [
      makeSignal({ id: "ai1", topic: "AI", source: { name: "A", url: "https://a.com", domain: "a.com", qualityTier: "high" } }),
      makeSignal({ id: "ai2", topic: "AI", source: { name: "B", url: "https://b.com", domain: "b.com", qualityTier: "high" } }),
      makeSignal({ id: "fin", topic: "Finance", source: { name: "C", url: "https://c.com", domain: "c.com", qualityTier: "high" } }),
      makeSignal({ id: "wld", topic: "World affairs", source: { name: "D", url: "https://d.com", domain: "d.com", qualityTier: "high" } }),
    ];
    const top3 = selectDailyTop3Signals(pool, prefs(), emptyCtx(), { now: NOW, date: new Date(NOW) });
    expect(top3.length).toBeLessThanOrEqual(3);
    const topics = top3.map((s) => s.topic.toLowerCase());
    expect(new Set(topics).size).toBe(topics.length);
  });
});

describe("normalize + dedupe — source-grounded", () => {
  it("rejects items without a real URL", () => {
    expect(normalizeSignalItem({ providerId: "t", title: "No URL", url: "" })).toBeNull();
    expect(normalizeSignalItem({ providerId: "t", title: "", url: "https://e.com/x" })).toBeNull();
  });

  it("derives a single-source signal with corroborationCount 1", () => {
    const item = normalizeSignalItem({
      providerId: "t",
      title: "Real headline here",
      url: "https://reuters.com/world/story",
      snippet: "A factual snippet.",
      sourceName: "Reuters",
      topic: "World affairs",
    });
    expect(item).not.toBeNull();
    expect(item?.isDemo).toBe(false);
    expect(item?.source.domain).toBe("reuters.com");
    expect(item?.corroborationCount).toBe(1);
  });

  it("collapses the same story across sources and counts corroboration", () => {
    const headline = "Major summit reaches a historic agreement";
    const a = makeSignal({ id: "a", headline, source: { name: "AP", url: "https://apnews.com", domain: "apnews.com", qualityTier: "high" } });
    const b = makeSignal({ id: "b", headline, source: { name: "Blog", url: "https://blog.io", domain: "blog.io", qualityTier: "unknown" } });
    const deduped = dedupeSignals([a, b]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.corroborationCount).toBe(2);
    expect(deduped[0]?.source.qualityTier).toBe("high");
  });

  it("strips tracking params from URLs", () => {
    expect(canonicalizeUrl("https://e.com/x?utm_source=a&b=1")).toBe("https://e.com/x?b=1");
  });
});

describe("deriveRelevance — truthful basis only", () => {
  it("labels demo data as demo", () => {
    const s = makeSignal({ isDemo: true });
    expect(deriveRelevance(s, prefs(), emptyCtx(), "top3").basis).toBe("demo");
  });

  it("uses topic_match when only a followed topic ties", () => {
    const s = makeSignal({ topic: "AI", headline: "A new AI model launches" });
    const { basis, term } = deriveRelevance(
      s,
      prefs({ followedTopics: ["AI"] }),
      emptyCtx({ followedTopics: ["ai"], interestTerms: ["ai"] }),
      "world",
    );
    expect(basis).toBe("topic_match");
    expect(term).toBeDefined();
  });

  it("falls back to global_importance with no personal tie", () => {
    const s = makeSignal();
    expect(deriveRelevance(s, prefs(), emptyCtx(), "world").basis).toBe("global_importance");
  });
});

describe("brain note + widget cap", () => {
  it("builds a note that preserves the source URL and tags", () => {
    const s = makeSignal({ headline: "Headline", topic: "AI", tags: ["AI", "models"] });
    const note = buildSignalNoteInput(s);
    expect(note.title).toBe("Headline");
    expect(note.content).toContain(s.sourceUrl);
    expect(note.tags).toContain("signal");
    expect(note.tags).toContain("AI");
  });

  it("caps the dashboard widget to 3 items", () => {
    const many = Array.from({ length: 6 }, (_, i) => makeSignal({ id: `s${i}` }));
    expect(capWidgetSignals(many)).toHaveLength(3);
  });
});

describe("source icon — favicon from publisher domain", () => {
  it("builds a Google s2 favicon URL from source.domain", () => {
    const url = signalSourceIconUrl({
      name: "BBC News",
      url: "https://bbc.com",
      domain: "bbc.co.uk",
    });
    expect(url).toContain("bbc.co.uk");
    expect(url).toContain("google.com/s2/favicons");
  });

  it("parses hostname from source.url when domain is missing", () => {
    expect(
      signalSourceHostname({
        name: "NYT",
        url: "https://www.nytimes.com/section/world",
      }),
    ).toBe("nytimes.com");
  });
});

describe("thumbnail resolution — high-res URL upgrades", () => {
  it("upgrades BBC 240px preset to 976px", () => {
    const low =
      "https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/67d2/live/38648570.jpg";
    expect(upgradeThumbnailUrl(low)).toContain("/ace/standard/976/");
  });

  it("bumps Guardian width query to 1200", () => {
    const low =
      "https://i.guim.co.uk/img/media/abc/master/5758.jpg?width=460&quality=85";
    const hi = upgradeThumbnailUrl(low);
    expect(hi).toContain("width=1200");
  });

  it("picks the largest <img> from description HTML", () => {
    const html = `
      <img src="https://i.guim.co.uk/x.jpg?width=140" />
      <img src="https://i.guim.co.uk/y.jpg?width=700" />
    `;
    expect(pickBestImageFromHtml(html)).toContain("width=1200");
    expect(pickBestImageFromHtml(html)).toContain("y.jpg");
  });
});

describe("thumbnails — priority chain & honest fallback (§ no fake thumbnails)", () => {
  it("prefers media:content over every other candidate", () => {
    const t = extractThumbnailFromRssItem({
      mediaContentUrl: "https://cdn.example.com/a.jpg",
      mediaThumbnailUrl: "https://cdn.example.com/b.jpg",
      ogImageUrl: "https://cdn.example.com/c.jpg",
    });
    expect(t?.url).toBe("https://cdn.example.com/a.jpg");
    expect(t?.source).toBe("rss");
  });

  it("falls through to og:image, then twitter, then youtube, in order", () => {
    expect(
      extractThumbnailFromRssItem({ ogImageUrl: "https://x/og.jpg" })?.source,
    ).toBe("open_graph");
    expect(
      extractThumbnailFromRssItem({ twitterImageUrl: "https://x/tw.jpg" })?.source,
    ).toBe("open_graph");
    const yt = extractThumbnailFromRssItem({ youtubeVideoId: "abc123" });
    expect(yt?.source).toBe("youtube");
    expect(yt?.url).toContain("abc123");
  });

  it("ignores non-image enclosures and bad URLs, then scans description html", () => {
    expect(
      extractThumbnailFromRssItem({ enclosureUrl: "https://x/a.mp3", enclosureType: "audio/mpeg" }),
    ).toBeUndefined();
    const fromHtml = extractThumbnailFromRssItem({
      descriptionHtml: '<p>hi</p><img src="https://x/inline.jpg" />',
    });
    expect(fromHtml?.url).toBe("https://x/inline.jpg");
  });

  it("returns undefined when there is no real image (caller paints a fallback)", () => {
    expect(extractThumbnailFromRssItem({ alt: "no image here" })).toBeUndefined();
    expect(firstImageInHtml("<p>no img</p>")).toBeUndefined();
  });

  it("labels topic fallbacks as fallback with NO url", () => {
    const fb = getFallbackThumbnailForTopic("AI");
    expect(fb.isFallback).toBe(true);
    expect(fb.url).toBeUndefined();
    expect(fb.source).toBe("fallback");
    expect(isRealThumbnail(fb)).toBe(false);
    expect(getFallbackThumbnailForTopic("AI").dominantColor).toBe(
      getFallbackThumbnailForTopic("AI").dominantColor,
    );
  });

  it("treats a real youtube thumbnail as real", () => {
    expect(isRealThumbnail(getYouTubeThumbnail("xyz"))).toBe(true);
  });

  it("drops items without real thumbnails", () => {
    const withImg = makeSignal({
      id: "a",
      thumbnail: { url: "https://cdn/x.jpg", source: "rss" },
    });
    const noImg = makeSignal({ id: "b", thumbnail: { isFallback: true, source: "fallback" } });
    expect(prepareSignalDisplayPool([withImg, noImg])).toHaveLength(1);
  });

  it("drops duplicate image URLs instead of showing placeholders", () => {
    const real = { url: "https://cdn/x.jpg", source: "rss" as const };
    const a = makeSignal({ id: "a", thumbnail: { ...real } });
    const b = makeSignal({ id: "b", thumbnail: { ...real } });
    expect(prepareSignalDisplayPool([a, b])).toHaveLength(1);
  });
});

describe("filters — deterministic faceted application", () => {
  const video = makeSignal({ id: "v", mediaType: "video", topic: "AI" });
  const market = makeSignal({ id: "m", mediaType: "market", topic: "Markets" });
  const article = makeSignal({ id: "a", mediaType: "article", topic: "World affairs" });
  const pool = [video, market, article];

  it("the default filter is a no-op and reports zero active facets", () => {
    expect(isDefaultFilter(DEFAULT_FILTER_STATE)).toBe(true);
    expect(countActiveFilters(DEFAULT_FILTER_STATE)).toBe(0);
    expect(applySignalFilters(pool, DEFAULT_FILTER_STATE, { prefs: prefs() })).toHaveLength(3);
  });

  it("filters by signal type (video / markets)", () => {
    expect(
      applySignalFilters(pool, filter({ type: "video" }), { prefs: prefs() }).map((s) => s.id),
    ).toEqual(["v"]);
    expect(
      applySignalFilters(pool, filter({ type: "markets" }), { prefs: prefs() }).map((s) => s.id),
    ).toEqual(["m"]);
  });

  it("filters by media type set", () => {
    const out = applySignalFilters(pool, filter({ mediaTypes: ["article"] }), { prefs: prefs() });
    expect(out.map((s) => s.id)).toEqual(["a"]);
  });

  it("excludes muted sources by default and hides dismissed items", () => {
    const muted = makeSignal({
      id: "mute",
      source: { name: "X", url: "https://x.io", domain: "x.io", qualityTier: "unknown" },
    });
    const withMuted = applySignalFilters([muted, article], filter(), {
      prefs: prefs({ mutedSources: ["x.io"] }),
    });
    expect(withMuted.map((s) => s.id)).not.toContain("mute");
    const withDismissed = applySignalFilters([article], filter(), {
      prefs: prefs(),
      dismissedIds: new Set(["a"]),
    });
    expect(withDismissed).toHaveLength(0);
  });

  it("produces removable active chips and clears them", () => {
    const f = filter({ type: "video", time: "today" });
    const chips = activeFilterChips(f);
    expect(chips.length).toBe(2);
    const cleared = chips.reduce((acc, chip) => removeFilterChip(acc, chip), f);
    expect(isDefaultFilter(cleared)).toBe(true);
  });
});

describe("custom topics — influence ranking + term derivation", () => {
  it("boosts items that match a Top-3-eligible custom topic", () => {
    const s = makeSignal({ headline: "Breakthrough in humanoid robotics", topic: "Technology" });
    const base = scoreSignal(s, prefs(), emptyCtx({ interestTerms: ["robotics"] }), NOW);
    const boosted = scoreSignal(
      s,
      prefs(),
      emptyCtx({ interestTerms: ["robotics"], boostedTerms: ["robotics"] }),
      NOW,
    );
    expect(boosted.total).toBeGreaterThan(base.total);
  });

  it("derives interest, boosted, and feed terms from custom topics", () => {
    const robotics = createCustomTopic("Robotics", { includeInTop3: true });
    const muted = createCustomTopic("Crypto", { muted: true });
    const feed = createCustomTopic("Indie", {
      rssFeeds: ["https://example.com/feed.xml", "not-a-url"],
    });
    const topics = [robotics, muted, feed];
    expect(customTopicInterestTerms(topics)).toContain("robotics");
    expect(customTopicInterestTerms(topics)).not.toContain("crypto"); // muted excluded
    expect(customTopicBoostedTerms(topics)).toContain("robotics");
    expect(customTopicRssFeeds(topics)).toEqual(["https://example.com/feed.xml"]);
  });
});

describe("demo rotation — deterministic but visibly changing (§ refresh)", () => {
  it("is reproducible for a given seed", () => {
    const a = getSignalsDemoData(2).map((s) => s.id);
    const b = getSignalsDemoData(2).map((s) => s.id);
    expect(a).toEqual(b);
  });

  it("reorders the ranked Top 3 across refresh seeds", () => {
    const top = (seed: number) =>
      selectDailyTop3Signals(getSignalsDemoData(seed), prefs(), emptyCtx(), {
        now: NOW,
        date: new Date(NOW),
      }).map((s) => s.id);
    const seeds = [0, 1, 2, 3, 4].map((s) => top(s).join(","));
    // At least two distinct Top-3 orderings across five refreshes.
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});

describe("overview — deterministic fallback", () => {
  it("uses source snippet when present", () => {
    const { text, grounded } = buildDeterministicOverview(
      { summary: "A long enough source description about the policy change in detail.", headline: "Title" },
      "en",
    );
    expect(grounded).toBe(true);
    expect(text).toContain("policy change");
  });

  it("falls back to headline when snippet is placeholder", () => {
    const { text, grounded } = buildDeterministicOverview(
      {
        summary: "Summary limited — open the source for detail.",
        headline: "Taiwan's MediaTek says it supports both TSMC and Intel",
      },
      "en",
    );
    expect(grounded).toBe(false);
    expect(text).toContain("MediaTek");
  });

  it("treats enriched snippets as overview-worthy", () => {
    expect(isOverviewWorthyText("Summary limited — open the source for detail.")).toBe(false);
    expect(
      isOverviewWorthyText(
        "The chipmaker outlined its dual-foundry strategy in a briefing to investors on Friday.",
      ),
    ).toBe(true);
  });
});

describe("article-metadata — enrichment eligibility", () => {
  it("flags items missing thumb or real snippet", () => {
    expect(
      needsArticleEnrichment({
        summary: "Summary limited — open the source for detail.",
        thumbnail: { isFallback: true, source: "fallback" },
      }),
    ).toBe(true);
    expect(
      needsArticleEnrichment({
        summary:
          "A sufficiently long real article description from the publisher page that explains what happened and why it matters to readers today.",
        thumbnail: { url: "https://cdn.example.com/a.jpg", source: "open_graph" },
      }),
    ).toBe(false);
  });
});

describe("behavior — deterministic reading-behavior derivation (§11/§17)", () => {
  it("lifts topic affinity from saves and exposes saved terms", () => {
    const b = deriveBehavior([action({ kind: "save", topic: "AI" })], NOW);
    expect(b.topicAffinity["ai"]).toBeGreaterThanOrEqual(0.4);
    expect(b.savedTerms).toContain("ai");
    expect(hasMeaningfulBehavior(b)).toBe(true);
  });

  it("cools a topic from less_like_this", () => {
    const b = deriveBehavior([action({ kind: "less_like_this", topic: "Sports" })], NOW);
    expect(b.topicAffinity["sports"]).toBeLessThan(0);
  });

  it("collects hard suppressions from already_known / not_relevant", () => {
    const b = deriveBehavior(
      [
        action({ kind: "already_known", signalId: "x" }),
        action({ kind: "not_relevant", signalId: "y", topic: "Crime" }),
      ],
      NOW,
    );
    expect(b.suppressedIds).toEqual(expect.arrayContaining(["x", "y"]));
  });

  it("saturates content sensitivities and hard-mutes a source domain", () => {
    const b = deriveBehavior(
      [
        action({ kind: "too_political" }),
        action({ kind: "too_political" }),
        action({ kind: "mute_source", domain: "x.io" }),
      ],
      NOW,
    );
    expect(b.politicalSensitivity).toBeGreaterThan(0);
    expect(b.sourceAffinity["x.io"]).toBe(-1);
  });

  it("is empty + not meaningful for no actions", () => {
    expect(hasMeaningfulBehavior(deriveBehavior([], NOW))).toBe(false);
    expect(hasMeaningfulBehavior(undefined)).toBe(false);
  });
});

describe("behavior → scoring + relevance (consented)", () => {
  it("a positive topic affinity raises a signal's score", () => {
    const s = makeSignal({ topic: "AI", headline: "An AI model update" });
    const behavior = deriveBehavior([action({ kind: "save", topic: "AI" })], NOW);
    const base = scoreSignal(s, prefs(), emptyCtx(), NOW);
    const withBehavior = scoreSignal(s, prefs(), emptyCtx({ behavior }), NOW);
    expect(withBehavior.total).toBeGreaterThan(base.total);
  });

  it("rankSignals drops behavior-suppressed ids (explicit user command)", () => {
    const keep = makeSignal({ id: "keep" });
    const drop = makeSignal({ id: "drop" });
    const behavior = behaviorWith({ suppressedIds: ["drop"] });
    const ranked = rankSignals([keep, drop], prefs(), emptyCtx({ behavior }), NOW);
    const ids = ranked.map((s) => s.id);
    expect(ids).toContain("keep");
    expect(ids).not.toContain("drop");
  });

  it("relevance reports a 'behavior' basis for an actively engaged topic", () => {
    const s = makeSignal({ topic: "AI", headline: "An AI model update" });
    const behavior = deriveBehavior(
      [action({ kind: "save", topic: "AI" }), action({ kind: "more_like_this", topic: "AI" })],
      NOW,
    );
    expect(deriveRelevance(s, prefs(), emptyCtx({ behavior }), "world").basis).toBe("behavior");
  });
});

describe("signal memory + weekly reflection (§17/§21)", () => {
  it("summarizes liked/cooled topics and counts honestly", () => {
    const mem = summarizeMemory(
      [
        action({ kind: "save", topic: "AI" }),
        action({ kind: "dismiss", topic: "Sports" }),
        action({ kind: "track", topic: "Finance" }),
      ],
      { mutedSources: ["x.io"] },
      NOW,
    );
    expect(mem.totalActions).toBe(3);
    expect(mem.savedCount).toBe(1);
    expect(mem.trackedCount).toBe(1);
    expect(mem.likedTopics.map((t) => t.topic)).toContain("ai");
    expect(mem.cooledTopics.map((t) => t.topic)).toContain("sports");
    expect(mem.mutedSources).toEqual(["x.io"]);
  });

  it("weekly reflection counts only this week's actions", () => {
    const refl = computeWeeklyReflection(
      [
        action({ kind: "save", topic: "AI", createdAt: new Date(NOW - 30 * DAY).toISOString() }),
        action({ kind: "save", topic: "AI" }),
        action({ kind: "track", topic: "Finance" }),
      ],
      NOW,
    );
    expect(refl.saved).toBe(1);
    expect(refl.tracked).toBe(1);
    expect(refl.hasActivity).toBe(true);
    expect(refl.topTopics.some((t) => t.topic === "AI")).toBe(true);
  });
});

describe("task write-path — source-grounded, never a placeholder", () => {
  it("builds a task that keeps provenance + tags", () => {
    const s = makeSignal({ headline: "Headline", topic: "AI", sourceUrl: "https://reuters.com/a" });
    const task = buildSignalTaskInput(s);
    expect(task.title).toContain("Headline");
    expect(task.source).toBe("signals");
    expect(task.source_url).toBe(s.sourceUrl);
    expect(task.tags).toContain("signal");
    expect(task.tags).toContain("AI");
    expect(task.priority).toBe("medium");
  });
});
