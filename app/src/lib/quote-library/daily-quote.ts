/**
 * Daily Quote Surfacing (spec 2.2).
 *
 * Selection priority (pure):
 *   1. Favorites not surfaced in the last 14 days — prefer these.
 *   2. Any quote not surfaced in the last 30 days.
 *   3. Fallback: oldest `last_surfaced_on` (which may be null for new quotes).
 *
 * Deterministic per (userId, date): we seed a small PRNG with the date string
 * + user id hash so picks feel varied but never change across reloads.
 */

import type { Quote } from "@/types/quote";

const RECENT_WINDOW_DAYS = 30;
const FAVORITE_RECENT_WINDOW_DAYS = 14;

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function daysSince(iso: string | null, today: Date): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (today.getTime() - t) / (1000 * 60 * 60 * 24);
}

export function pickDailyQuote(input: {
  quotes: Quote[];
  userId: string;
  today?: Date;
}): Quote | null {
  const { quotes, userId } = input;
  const today = input.today ?? new Date();
  if (quotes.length === 0) return null;

  const prng = mulberry32(
    hashString(`${userId}:${today.toISOString().slice(0, 10)}`),
  );

  const shuffled = [...quotes]
    .map((q) => ({ q, sortKey: prng() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((x) => x.q);

  const favorites = shuffled.filter(
    (q) =>
      q.is_favorite &&
      daysSince(q.last_surfaced_on, today) >= FAVORITE_RECENT_WINDOW_DAYS,
  );
  if (favorites.length > 0) return favorites[0];

  const fresh = shuffled.filter(
    (q) => daysSince(q.last_surfaced_on, today) >= RECENT_WINDOW_DAYS,
  );
  if (fresh.length > 0) return fresh[0];

  const oldest = [...shuffled].sort((a, b) => {
    const aDays = daysSince(a.last_surfaced_on, today);
    const bDays = daysSince(b.last_surfaced_on, today);
    return bDays - aDays;
  });
  return oldest[0] ?? null;
}
