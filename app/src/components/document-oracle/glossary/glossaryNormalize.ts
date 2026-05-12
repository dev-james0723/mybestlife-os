/** Safe parsing of glossary JSON fields from `document_glossary_terms`. */

export function normalizeGlossaryPages(pages: unknown): number[] {
  if (!Array.isArray(pages)) return [];
  const out: number[] = [];
  for (const x of pages) {
    if (typeof x === "number" && Number.isFinite(x)) out.push(Math.floor(x));
    else if (typeof x === "string" && /^\d+$/.test(x.trim())) out.push(parseInt(x.trim(), 10));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export function normalizeGlossaryRelatedTerms(related: unknown): string[] {
  if (!Array.isArray(related)) return [];
  const out: string[] = [];
  for (const x of related) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return [...new Set(out)].slice(0, 32);
}
