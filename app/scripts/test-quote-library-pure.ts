/**
 * Lightweight test runner for pure Quote Library modules:
 *   - src/lib/quote-library/filter.ts
 *   - src/lib/quote-library/daily-quote.ts
 *   - src/lib/quote-library/detect-language.ts
 *
 * Follows the same pattern as `scripts/test-bio-lab-pure.ts`:
 * `node --experimental-strip-types` runs the TS directly because these
 * modules only have `import type` runtime dependencies.
 *
 * Usage (from app/):
 *   node --experimental-strip-types scripts/test-quote-library-pure.ts
 */

import assert from "node:assert/strict";

import {
  buildMembershipMap,
  filterQuotes,
  sortQuotes,
} from "../src/lib/quote-library/filter.ts";
import { pickDailyQuote } from "../src/lib/quote-library/daily-quote.ts";
import { detectQuoteLanguage } from "../src/lib/quote-library/detect-language.ts";
import type { Quote } from "../src/types/quote.ts";

// ============================================================
// Tiny test harness
// ============================================================

type TestCase = { name: string; fn: () => void | Promise<void> };
const tests: TestCase[] = [];
const test = (name: string, fn: () => void | Promise<void>) => {
  tests.push({ name, fn });
};

async function run(): Promise<number> {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`  ok  ${t.name}`);
    } catch (e) {
      failed += 1;
      const message = e instanceof Error ? e.stack ?? e.message : String(e);
      console.error(`  ✗   ${t.name}\n      ${message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

// ============================================================
// Fixtures
// ============================================================

const baseQuote = (overrides: Partial<Quote> = {}): Quote => ({
  id: overrides.id ?? "q1",
  user_id: "u",
  quote_text: "Example quote",
  source_author: null,
  source_context: null,
  source_url: null,
  source_type: null,
  source_module: "manual",
  category: null,
  tags: [],
  emotion_tone: null,
  personal_note: null,
  is_favorite: false,
  linked_goal_id: null,
  language: "en",
  confidence_score: null,
  is_ai_enriched: false,
  source_intelligence: null,
  is_seed: false,
  last_surfaced_on: null,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

// ============================================================
// filter.ts
// ============================================================

test("filterQuotes returns everything when filters are default", () => {
  const quotes = [baseQuote({ id: "a" }), baseQuote({ id: "b" })];
  const result = filterQuotes(
    quotes,
    {
      search: "",
      categories: [],
      tones: [],
      sourceModules: [],
      tags: [],
      favoritesOnly: false,
      dateRange: { from: null, to: null },
      linkedGoalId: null,
      collectionId: null,
    },
    new Map(),
  );
  assert.equal(result.length, 2);
});

test("filterQuotes favoritesOnly restricts to favorites", () => {
  const quotes = [
    baseQuote({ id: "a", is_favorite: true }),
    baseQuote({ id: "b", is_favorite: false }),
  ];
  const result = filterQuotes(
    quotes,
    {
      search: "",
      categories: [],
      tones: [],
      sourceModules: [],
      tags: [],
      favoritesOnly: true,
      dateRange: { from: null, to: null },
      linkedGoalId: null,
      collectionId: null,
    },
    new Map(),
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("filterQuotes search matches body, author, tags, personal note", () => {
  const quotes = [
    baseQuote({
      id: "a",
      quote_text: "Patience and time are warriors",
      source_author: "Tolstoy",
      tags: ["endurance"],
    }),
    baseQuote({
      id: "b",
      quote_text: "Something else",
      personal_note: "Reminds me of endurance",
    }),
    baseQuote({
      id: "c",
      quote_text: "Unrelated",
    }),
  ];
  const result = filterQuotes(
    quotes,
    {
      search: "endurance",
      categories: [],
      tones: [],
      sourceModules: [],
      tags: [],
      favoritesOnly: false,
      dateRange: { from: null, to: null },
      linkedGoalId: null,
      collectionId: null,
    },
    new Map(),
  );
  assert.deepEqual(
    result.map((q) => q.id).sort(),
    ["a", "b"],
  );
});

test("filterQuotes filters by collection membership", () => {
  const quotes = [baseQuote({ id: "a" }), baseQuote({ id: "b" })];
  const membership = buildMembershipMap([
    { quote_id: "a", collection_id: "c1" },
  ]);
  const result = filterQuotes(
    quotes,
    {
      search: "",
      categories: [],
      tones: [],
      sourceModules: [],
      tags: [],
      favoritesOnly: false,
      dateRange: { from: null, to: null },
      linkedGoalId: null,
      collectionId: "c1",
    },
    membership,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("sortQuotes favorites always bubble up", () => {
  const quotes = [
    baseQuote({ id: "old-fav", is_favorite: true, created_at: "2026-01-01T00:00:00Z" }),
    baseQuote({ id: "new-plain", is_favorite: false, created_at: "2026-04-01T00:00:00Z" }),
  ];
  const sorted = sortQuotes(quotes, "created_at_desc");
  assert.equal(sorted[0].id, "old-fav");
});

// ============================================================
// daily-quote.ts
// ============================================================

test("pickDailyQuote returns null when library is empty", () => {
  const pick = pickDailyQuote({ quotes: [], userId: "u" });
  assert.equal(pick, null);
});

test("pickDailyQuote prefers favorites not surfaced in 14 days", () => {
  const today = new Date("2026-05-01");
  const quotes = [
    baseQuote({
      id: "recent-fav",
      is_favorite: true,
      last_surfaced_on: "2026-04-25",
    }),
    baseQuote({
      id: "old-fav",
      is_favorite: true,
      last_surfaced_on: "2025-12-01",
    }),
    baseQuote({
      id: "old-plain",
      is_favorite: false,
      last_surfaced_on: "2025-12-01",
    }),
  ];
  const pick = pickDailyQuote({ quotes, userId: "u", today });
  assert.equal(pick?.id, "old-fav");
});

test("pickDailyQuote is deterministic per (user, date)", () => {
  const today = new Date("2026-05-01");
  const quotes = [
    baseQuote({ id: "a" }),
    baseQuote({ id: "b" }),
    baseQuote({ id: "c" }),
  ];
  const pickA = pickDailyQuote({ quotes, userId: "u", today });
  const pickB = pickDailyQuote({ quotes, userId: "u", today });
  assert.equal(pickA?.id, pickB?.id);
});

// ============================================================
// detect-language.ts
// ============================================================

test("detectQuoteLanguage recognises English", () => {
  assert.equal(
    detectQuoteLanguage("The only true wisdom is in knowing you know nothing."),
    "en",
  );
});

test("detectQuoteLanguage distinguishes Traditional Chinese", () => {
  assert.equal(
    detectQuoteLanguage("你是否願意為這個理想付出一切？這個問題很關鍵。"),
    "zh-TW",
  );
});

test("detectQuoteLanguage distinguishes Simplified Chinese", () => {
  assert.equal(
    detectQuoteLanguage("我们这个时代真正的问题是如何让学习回归。"),
    "zh-CN",
  );
});

test("detectQuoteLanguage recognises Japanese", () => {
  assert.equal(
    detectQuoteLanguage("世界は待っている、あなたが気づくまで"),
    "ja",
  );
});

test("detectQuoteLanguage recognises Korean", () => {
  assert.equal(
    detectQuoteLanguage("가장 중요한 것은 당신이 계속 가고 있다는 것이다"),
    "ko",
  );
});

test("detectQuoteLanguage recognises Vietnamese via diacritics", () => {
  assert.equal(
    detectQuoteLanguage("Hạnh phúc là một cuộc hành trình, không phải là đích đến."),
    "vi",
  );
});

test("detectQuoteLanguage recognises French", () => {
  assert.equal(
    detectQuoteLanguage(
      "La vraie découverte ne consiste pas à trouver de nouveaux paysages.",
    ),
    "fr",
  );
});

test("detectQuoteLanguage falls back to English on empty input", () => {
  assert.equal(detectQuoteLanguage(""), "en");
});

// ============================================================
// Entry point
// ============================================================

run().then((code) => {
  if (code !== 0) process.exit(code);
});
