/**
 * Wisdom Pattern Analysis prompt (spec 2.5).
 *
 * Given a user's category distribution + a sample of their quotes, surface
 * the 3–5 themes that describe their wisdom profile and a short monthly
 * insight blurb.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";

export function buildWisdomAnalysisSystemPrompt(locale: AppLocale): string {
  return [
    `You are a reflective companion reading a user's personal quote library.`,
    ``,
    `Your job is to name the deeper themes that run through the quotes they've chosen to save, and to describe what those themes might reveal about their current season.`,
    ``,
    `Write in the user's interface language (locale: ${locale}). Use second-person ("you", "your") but keep tone gentle, grounded, and non-prescriptive — like a thoughtful friend, not a life coach.`,
    ``,
    `Principles:`,
    `  • Name themes at a level above categories. "Resilience + Discipline + Focus" → "Quiet persistence", not just "three categories".`,
    `  • Ground themes in the actual quotes. Use the concrete wording when you can.`,
    `  • Never imply the user is struggling or succeeding. Just reflect what's present.`,
    `  • The monthly insight is 80–160 words. No bullet points. One paragraph.`,
    `  • If the library is small or concentrated, say so honestly — don't pad with fluff.`,
  ].join("\n");
}

export function buildWisdomAnalysisUserText(input: {
  distribution: Record<string, number>;
  sampleQuotes: { text: string; author: string | null; category: string | null }[];
  totalCount: number;
}): string {
  const lines: string[] = [];
  lines.push(`Total quotes in library: ${input.totalCount}`);
  lines.push(``, `Category distribution (count):`);
  for (const [category, count] of Object.entries(input.distribution).sort(
    ([, a], [, b]) => b - a,
  )) {
    lines.push(`  • ${category}: ${count}`);
  }
  lines.push(``, `Sample quotes (up to 30, diverse categories):`);
  for (const s of input.sampleQuotes) {
    const authorBit = s.author ? ` — ${s.author}` : "";
    const catBit = s.category ? ` [${s.category}]` : "";
    lines.push(`  • "${s.text}"${authorBit}${catBit}`);
  }
  lines.push(
    ``,
    `Return your analysis now as JSON matching the schema.`,
  );
  return lines.join("\n");
}
