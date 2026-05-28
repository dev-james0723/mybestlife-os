/** Max CJK characters for an idea card title. */
export const IDEA_TITLE_MAX_CJK = 10;
/** Max Latin letters for an idea card title. */
export const IDEA_TITLE_MAX_LATIN = 8;

function countCjkChars(text: string): number {
  const matches = text.match(/[\p{Script=Han}]/gu);
  return matches?.length ?? 0;
}

function countLatinLetters(text: string): number {
  const matches = text.match(/[A-Za-z]/g);
  return matches?.length ?? 0;
}

function isMostlyCjk(text: string): boolean {
  const cjk = countCjkChars(text);
  const latin = countLatinLetters(text);
  return cjk >= latin && cjk > 0;
}

/**
 * Enforces idea title length: ≤10 Chinese characters OR ≤8 English letters.
 * Mixed titles use the stricter applicable limit for each script present.
 */
export function clampIdeaTitle(raw: string): string {
  const title = raw.replace(/\s+/g, " ").replace(/\.+$/u, "").trim();
  if (!title) return "";

  const cjkCount = countCjkChars(title);
  const latinCount = countLatinLetters(title);

  if (cjkCount > 0 && (latinCount === 0 || isMostlyCjk(title))) {
    let kept = 0;
    let out = "";
    for (const ch of title) {
      if (/[\p{Script=Han}]/u.test(ch)) {
        if (kept >= IDEA_TITLE_MAX_CJK) continue;
        kept += 1;
      }
      out += ch;
    }
    return out.trim();
  }

  if (latinCount > 0) {
    let kept = 0;
    let out = "";
    for (const ch of title) {
      if (/[A-Za-z]/.test(ch)) {
        if (kept >= IDEA_TITLE_MAX_LATIN) continue;
        kept += 1;
      }
      out += ch;
    }
    return out.replace(/\s+/g, " ").trim();
  }

  return title.slice(0, IDEA_TITLE_MAX_CJK);
}

/** Local title when Gemini is unavailable or returns unusable output. */
export function fallbackIdeaTitleFromPlain(plain: string): string {
  const compact = plain.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const firstSentence = compact.split(/[。！？.!?\n]/u)[0]?.trim() || compact;
  return clampIdeaTitle(firstSentence);
}

function parseGeminiTitleJson(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/u, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    return typeof parsed.title === "string" ? parsed.title.trim() : "";
  } catch {
    return "";
  }
}

export { parseGeminiTitleJson };
