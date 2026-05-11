/**
 * Title sanitizer — defense in depth for the rules in `generateTitleSuggestion`.
 *
 * Even with strict prompting, Gemini sometimes produces titles like
 *   "Instagram post by @user about X"
 *   "Video post on X discussing Y"
 *   "Threads post: 3D Knowledge Graph for Code"
 *
 * This module strips those leading source phrases, trims wrappers (quotes,
 * trailing punctuation), and caps length per language. Idempotent — calling
 * it twice produces the same output.
 *
 * Use anywhere we receive an AI-generated title before persisting it.
 */

const ENGLISH_MAX_WORDS = 12; // spec says 10; we allow 12 before truncating
const CHINESE_MAX_CHARS = 22; // spec says 20

/**
 * Strip leading "Instagram post by …", "Video post on X …", etc. Patterns
 * are anchored at the start (^) and case-insensitive. Each allows an
 * optional leading article ("an", "a", "the") so stacked prefixes — e.g.
 * "Social media post about an Instagram post by …" — also resolve cleanly
 * when the loop re-runs them. The captured remainder is the cleaned title.
 */
const LEAD = "^\\s*(?:(?:an?|the)\\s+)?";

const LEADING_SOURCE_PATTERNS: ReadonlyArray<RegExp> = [
  // "Instagram post about|by|discussing|on …" / colon
  new RegExp(`${LEAD}Instagram\\s+(?:post|reel|video)\\s+(?:about|by|on|discussing|covering)\\s+`, "i"),
  new RegExp(`${LEAD}Instagram\\s*(?:post|reel|video)?\\s*[:\\-–—]\\s*`, "i"),
  // Facebook
  new RegExp(`${LEAD}Facebook\\s+(?:post|video|reel)\\s+(?:about|by|from|on|discussing|covering)\\s+`, "i"),
  new RegExp(`${LEAD}Facebook\\s*(?:post|video|reel)?\\s*[:\\-–—]\\s*`, "i"),
  // Threads
  new RegExp(`${LEAD}Threads\\s+post\\s+(?:about|by|from|on|discussing|covering)\\s+`, "i"),
  new RegExp(`${LEAD}Threads\\s*(?:post)?\\s*[:\\-–—]\\s*`, "i"),
  // X / Twitter
  new RegExp(`${LEAD}(?:X|Twitter)\\s+(?:post|video|tweet|video\\s+post)\\s+(?:about|by|from|on|discussing|covering)\\s+`, "i"),
  new RegExp(`${LEAD}(?:X|Twitter)\\s+(?:video\\s+post|video|tweet|post)\\s*[:\\-–—]\\s*`, "i"),
  // "Video post on X …" / "Video post about …"
  new RegExp(`${LEAD}Video\\s+post\\s+(?:on|about|by|from)\\s+`, "i"),
  // Reddit
  new RegExp(`${LEAD}Reddit\\s+(?:post|thread)\\s+(?:about|by|on|from|in)\\s+`, "i"),
  new RegExp(`${LEAD}Reddit\\s*(?:post|thread)?\\s*[:\\-–—]\\s*`, "i"),
  // Generic "Social media post about …"
  new RegExp(`${LEAD}Social\\s+media\\s+post\\s+(?:about|on|discussing|covering)\\s+`, "i"),
  // Generic "Post about …" / "Video about …"
  new RegExp(`${LEAD}(?:Post|Video|Reel|Tweet|Thread)\\s+(?:about|on|discussing|covering)\\s+`, "i"),
  // "Overview of short-form video content about …" — handles compound nouns
  // ("video content", "social media post") via repeated alternation.
  new RegExp(
    `${LEAD}Overview\\s+of\\s+(?:short[-\\s]?form\\s+)?(?:(?:video|social\\s+media|social|content|post|reel|thread|tweet)s?\\s*)+(?:about|on|covering|discussing|featuring)\\s+`,
    "i",
  ),
  // "This post discusses …"
  new RegExp(`${LEAD}This\\s+(?:post|video|reel|thread|tweet|article|repository)\\s+(?:discusses|covers|describes|explains|presents|addresses)\\s+`, "i"),
  // After the base patterns strip "Video post on " or "Instagram post by N",
  // the remainder may still lead with a platform name ("X about …") or an
  // author phrase ("John about …"). These two clean up that residue.
  /^\s*(?:X|Twitter|Instagram|Facebook|Reddit|Threads|TikTok|YouTube)\s+(?:about|on|discussing|covering|featuring)\s+/i,
  /^\s*(?:@\S+|[A-Z][\w'.-]+(?:\s+[A-Z][\w'.-]+){0,2})\s+(?:about|on|discussing|covering|featuring)\s+/,
];

/** "Bare" patterns — match the leading source phrase with nothing
 *  meaningful after. When a title is _only_ a banned phrase (e.g.
 *  "Instagram post:", "Video on X"), we collapse to the fallback rather
 *  than emit a meaningless prefix on its own. */
const BARE_TITLE_PATTERNS: ReadonlyArray<RegExp> = [
  /^\s*(?:an?|the)?\s*Instagram\s*(?:post|reel|video)?[\s:\-–—.]*$/i,
  /^\s*(?:an?|the)?\s*Facebook\s*(?:post|video|reel)?[\s:\-–—.]*$/i,
  /^\s*(?:an?|the)?\s*Threads\s*(?:post)?[\s:\-–—.]*$/i,
  /^\s*(?:an?|the)?\s*(?:X|Twitter)\s*(?:post|video|tweet)?[\s:\-–—.]*$/i,
  /^\s*(?:an?|the)?\s*Reddit\s*(?:post|thread)?[\s:\-–—.]*$/i,
  /^\s*(?:an?|the)?\s*Social\s+media\s*(?:post)?[\s:\-–—.]*$/i,
  /^\s*(?:an?|the)?\s*(?:Post|Video|Reel|Tweet|Thread)[\s:\-–—.]*$/i,
];

/** Strip wrapping quotes and trailing punctuation. */
function unwrap(s: string): string {
  let v = s.trim();
  // Match wrapping quotes (single, double, or curly).
  const wrappers: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
    ["「", "」"],
    ["『", "』"],
  ];
  for (const [open, close] of wrappers) {
    if (v.startsWith(open) && v.endsWith(close) && v.length > 2) {
      v = v.slice(open.length, v.length - close.length).trim();
    }
  }
  // Trim trailing periods / colons / dashes (but keep ?, !, …).
  v = v.replace(/[.。:\-–—]+$/u, "").trim();
  return v;
}

/** Detect whether a string is dominantly Chinese (Han script). */
function isChineseDominant(s: string): boolean {
  if (!s) return false;
  let han = 0;
  let other = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    // CJK Unified Ideographs ranges
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df)
    ) {
      han++;
    } else if (/[A-Za-z]/.test(ch)) {
      other++;
    }
  }
  return han > 0 && han >= other;
}

/** Cap by either English word count or Chinese character count. */
function capLength(s: string): string {
  if (isChineseDominant(s)) {
    // Cap Chinese by Han-character count, preserving any non-Han chars within.
    const chars = [...s];
    if (chars.length <= CHINESE_MAX_CHARS) return s;
    return chars.slice(0, CHINESE_MAX_CHARS).join("").replace(/[\s,，、:：;；]+$/u, "");
  }
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= ENGLISH_MAX_WORDS) return s;
  return words.slice(0, ENGLISH_MAX_WORDS).join(" ").replace(/[,.;:]+$/u, "");
}

/**
 * Clean an AI-generated title: strip source phrases, unwrap quotes, cap
 * length. If the input collapses to empty after stripping (e.g. the entire
 * title was a banned pattern), returns the `fallback` instead so the card
 * never ends up with an empty string.
 */
export function sanitizeTitle(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  let v = raw.trim();
  if (!v) return fallback;

  // If the entire title is a banned phrase with nothing meaningful after
  // (e.g. "Instagram post:", "Video", "Reddit thread —"), collapse to
  // fallback before patterns try to strip something they can't.
  for (const bare of BARE_TITLE_PATTERNS) {
    if (bare.test(v)) return fallback;
  }

  // Iteratively strip leading patterns — handles stacked prefixes like
  // "Social media post about an Instagram post by …".
  let progressed = true;
  let guard = 0;
  while (progressed && guard < 5) {
    progressed = false;
    guard++;
    for (const pat of LEADING_SOURCE_PATTERNS) {
      const after = v.replace(pat, "");
      if (after !== v && after.trim().length > 0) {
        v = after.trim();
        progressed = true;
      }
    }
  }

  v = unwrap(v);
  if (!v) return fallback;

  // Re-check bare patterns after stripping — a stacked prefix could leave
  // just another banned phrase behind.
  for (const bare of BARE_TITLE_PATTERNS) {
    if (bare.test(v)) return fallback;
  }

  // Capitalize first letter for English titles when it starts lowercase
  // (sanitizer may have stripped a leading capitalized phrase).
  if (!isChineseDominant(v) && /^[a-z]/.test(v)) {
    v = v.charAt(0).toUpperCase() + v.slice(1);
  }

  return capLength(v);
}
