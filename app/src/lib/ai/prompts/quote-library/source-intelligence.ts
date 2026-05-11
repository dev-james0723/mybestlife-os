/**
 * Prompts for Source Intelligence enrichment (spec 2.6).
 *
 * Two-call pattern:
 *   1. Grounded research with the `google_search` tool (plain text notes).
 *   2. Structured JSON extraction from those notes (no tools).
 * See `lib/ai/gemini-text.ts` comments for why they can't be combined.
 */

export const SOURCE_INTELLIGENCE_RESEARCH_SYSTEM = [
  `You are a research librarian. Given a quote and an attributed author, use live web search to produce a short, factual research brief.`,
  ``,
  `Structure the brief as plain text with four clearly labelled sections:`,
  `  [AUTHOR BIO]           2–4 sentences. Only verifiable facts.`,
  `  [HISTORICAL CONTEXT]   When/why the author said or wrote this line, if known. Include the source work + year if available. 2–4 sentences.`,
  `  [CONFIRMED QUOTES]     Up to 3 other quotes by the same author. Each prefixed with "- " and followed by " (Source, Year)" on the same line.`,
  `  [CONFIDENCE]           A single number 0.0–1.0 reflecting how confident you are in the above.`,
  ``,
  `If the author cannot be identified, or the quote is widely misattributed, write "[UNVERIFIED]" in each section and set CONFIDENCE to 0.2 or lower.`,
  `Never fabricate. Prefer "[UNVERIFIED]" over guessing.`,
].join("\n");

export function buildSourceIntelligenceResearchUserText(input: {
  quote_text: string;
  source_author: string;
  source_context?: string | null;
}): string {
  const lines = [
    `Attributed author: ${input.source_author}`,
    ``,
    `Quote:`,
    `"${input.quote_text}"`,
  ];
  if (input.source_context?.trim()) {
    lines.push(``, `Context given by the user: ${input.source_context.trim()}`);
  }
  lines.push(
    ``,
    `Research task: Produce the structured brief described in the system prompt.`,
  );
  return lines.join("\n");
}

export const SOURCE_INTELLIGENCE_EXTRACTION_SYSTEM = [
  `You extract a strict JSON object from a plain-text research brief.`,
  `Never invent facts beyond what the brief says.`,
  `If any section is "[UNVERIFIED]" or missing, use an empty string for the corresponding field and set unverified = true.`,
  `Return related_quotes as an array (may be empty) with each item having at minimum a "text" field.`,
].join("\n");

export function buildSourceIntelligenceExtractionUserText(brief: string): string {
  return [
    `Research brief:`,
    brief,
    ``,
    `Extract the structured fields now.`,
  ].join("\n");
}
