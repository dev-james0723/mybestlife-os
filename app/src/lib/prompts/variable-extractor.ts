/**
 * Scan a prompt body for `[VARIABLE]` tokens.
 *
 * Rules:
 *   - Tokens must be uppercase ASCII letters, digits and underscores.
 *   - Tokens must be at least 2 chars long (avoid matching "[1]" footnotes).
 *   - Order of first appearance is preserved. Duplicates are de-duped.
 *
 * Used by the custom-prompt editor to auto-detect variables so the user
 * doesn't have to keep two fields in sync manually.
 */
const VAR_TOKEN = /\[([A-Z][A-Z0-9_]{1,40})\]/g;

export function extractVariables(body: string): string[] {
  if (!body) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = VAR_TOKEN.exec(body)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}
