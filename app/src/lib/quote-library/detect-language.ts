/**
 * Lightweight language detection for quote_text.
 *
 * Motivation: the project doesn't bundle `franc`, and adding a full-fat lang
 * detector only to populate a string field would inflate the client by
 * ~200 KB gzipped. This heuristic covers the 9 supported locales via Unicode
 * range analysis — good enough for auto-filling the Language field in the
 * Add Quote sheet, still editable by the user.
 *
 * Strategy:
 *   1. Count characters per script range.
 *   2. Pick the dominant script.
 *   3. For Chinese, disambiguate Traditional vs Simplified via a tiny trie
 *      of high-signal Traditional-only characters.
 *   4. For Latin scripts, disambiguate using common-word prefix matching.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";

type ScriptKey =
  | "hiragana"
  | "katakana"
  | "han"
  | "hangul"
  | "latin"
  | "vietnamese";

const TRADITIONAL_ONLY_CHARS = [
  "為", "說", "們", "個", "這", "來", "時", "會", "學", "開", "關", "發",
  "讓", "讀", "見", "樂", "對", "還", "麼", "國", "臺", "應", "給", "問",
  "愛", "點", "裡", "親", "書", "華", "實", "話", "過", "體", "經", "聽",
];
const SIMPLIFIED_ONLY_CHARS = [
  "为", "说", "们", "这", "来", "时", "会", "学", "开", "关", "发", "让",
  "读", "见", "乐", "对", "还", "么", "国", "台", "应", "给", "问", "爱",
  "点", "里", "亲", "书", "华", "实", "话", "过", "体", "经", "听", "东",
];

// Vietnamese-specific letters that don't appear in French/Spanish/Italian.
// Using only these avoids false positives on e.g. "déjà", "café".
const VIETNAMESE_DIACRITICS = /[ăâêôơưđ]|ạ|ả|ẵ|ắ|ằ|ẳ|ậ|ấ|ầ|ẩ|ẻ|ẽ|ẹ|ệ|ế|ề|ể|ị|ỉ|ĩ|ỏ|ọ|ộ|ố|ồ|ổ|ỗ|ớ|ờ|ở|ợ|ỡ|ụ|ủ|ũ|ứ|ừ|ử|ữ|ự|ỳ|ỷ|ỹ|ỵ/i;

const LANGUAGE_HINTS: { locale: AppLocale; pattern: RegExp }[] = [
  { locale: "fr", pattern: /\b(le|la|les|un|une|des|et|est|que|pour|dans|avec|très|nous|je|tu|vous)\b/i },
  { locale: "es", pattern: /\b(el|la|los|las|un|una|y|es|que|para|con|pero|muy|nosotros|yo|tú|usted)\b/i },
  { locale: "it", pattern: /\b(il|lo|la|i|gli|le|un|una|e|è|che|per|con|ma|molto|noi|io|tu|lei)\b/i },
  { locale: "en", pattern: /\b(the|and|is|are|of|to|in|that|for|it|on|with|as|be|not|but)\b/i },
];

function scriptCounts(text: string): Record<ScriptKey, number> {
  const counts: Record<ScriptKey, number> = {
    hiragana: 0,
    katakana: 0,
    han: 0,
    hangul: 0,
    latin: 0,
    vietnamese: 0,
  };
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code >= 0x3040 && code <= 0x309f) counts.hiragana += 1;
    else if (code >= 0x30a0 && code <= 0x30ff) counts.katakana += 1;
    else if (code >= 0x4e00 && code <= 0x9fff) counts.han += 1;
    else if (code >= 0xac00 && code <= 0xd7af) counts.hangul += 1;
    else if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a)) {
      counts.latin += 1;
    }
  }
  if (VIETNAMESE_DIACRITICS.test(text)) counts.vietnamese += 10;
  return counts;
}

function disambiguateChinese(text: string): "zh-TW" | "zh-CN" {
  let trad = 0;
  let simp = 0;
  for (const ch of text) {
    if (TRADITIONAL_ONLY_CHARS.includes(ch)) trad += 1;
    if (SIMPLIFIED_ONLY_CHARS.includes(ch)) simp += 1;
  }
  if (trad === simp) return "zh-TW"; // user preference default
  return trad >= simp ? "zh-TW" : "zh-CN";
}

function disambiguateLatin(text: string): AppLocale {
  if (VIETNAMESE_DIACRITICS.test(text)) return "vi";
  for (const hint of LANGUAGE_HINTS) {
    if (hint.pattern.test(text)) return hint.locale;
  }
  return "en";
}

/**
 * Guess the locale of the given text. Returns {@link AppLocale} so the result
 * can be dropped straight into the `language` column. Falls back to "en" when
 * the text is empty or contains no recognisable script characters.
 */
export function detectQuoteLanguage(text: string): AppLocale {
  const trimmed = text.trim();
  if (!trimmed) return "en";

  const counts = scriptCounts(trimmed);
  const entries = Object.entries(counts) as [ScriptKey, number][];
  const [topScript, topCount] = entries.reduce<[ScriptKey, number]>(
    (acc, cur) => (cur[1] > acc[1] ? cur : acc),
    ["latin", 0],
  );

  if (topCount === 0) return "en";

  switch (topScript) {
    case "hiragana":
    case "katakana":
      return "ja";
    case "hangul":
      return "ko";
    case "han": {
      // Japanese often mixes Han with Kana; if we got here with zero kana,
      // treat as Chinese.
      if (counts.hiragana > 0 || counts.katakana > 0) return "ja";
      return disambiguateChinese(trimmed);
    }
    case "vietnamese":
      return "vi";
    default:
      return disambiguateLatin(trimmed);
  }
}
