export type TranscriptSection = {
  title: string;
  body: string;
};

const TARGET_SECTION_CHARS = 720;
const MIN_SECTION_CHARS = 220;
const MAX_SECTION_CHARS = 980;
const MAX_TITLE_WORDS = 11;
const MAX_CJK_TITLE_CHARS = 24;

const sentenceEndPattern = /[^.!?。！？]+(?:[.!?。！？]+["')\]]*|$)/g;
const cjkPattern = /[\u3040-\u30ff\u3400-\u9fff]/;

const leadingFillers = [
  "actually",
  "all right",
  "and then",
  "anyway",
  "basically",
  "by the way",
  "first",
  "finally",
  "here",
  "i mean",
  "next",
  "now",
  "okay",
  "right",
  "second",
  "so",
  "then",
  "third",
  "today",
  "um",
  "uh",
  "well",
];

const topicShiftPattern =
  /^(actually|all right|another|by the way|finally|first|from here|let's|next|now|okay|second|so|then|third|today)\b/i;

function normalizeTranscriptText(transcript: string): string {
  return transcript
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  const compact = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!compact) return [];

  const sentences = compact.match(sentenceEndPattern)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (sentences.length > 1) return sentences;

  const words = compact.split(/\s+/).filter(Boolean);
  if (words.length <= 140) return [compact];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 90) {
    chunks.push(words.slice(i, i + 90).join(" "));
  }
  return chunks;
}

function shouldStartNewSection(current: string[], nextSentence: string): boolean {
  if (current.length === 0) return false;
  const currentLength = current.join(" ").length;
  if (currentLength >= MAX_SECTION_CHARS) return true;
  return currentLength >= MIN_SECTION_CHARS && topicShiftPattern.test(nextSentence);
}

function buildSectionBody(sentences: string[]): string {
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function trimTitleWords(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_TITLE_WORDS) return text;
  return `${words.slice(0, MAX_TITLE_WORDS).join(" ")}...`;
}

function stripLeadingFillers(text: string): string {
  let next = text.trim();
  for (let i = 0; i < 3; i += 1) {
    const before = next;
    for (const filler of leadingFillers) {
      const pattern = new RegExp(`^${filler.replace(/\s+/g, "\\s+")}[,.:;\\s]+`, "i");
      next = next.replace(pattern, "").trim();
    }
    if (next === before) break;
  }
  return next;
}

function titleFromText(text: string): string {
  const firstSentence = splitIntoSentences(text)[0] ?? text;
  const cleaned = stripLeadingFillers(firstSentence)
    .replace(/^["'([{]+/, "")
    .replace(/["')\]}]+$/g, "")
    .replace(/[.!?。！？:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  if (cjkPattern.test(cleaned)) {
    return cleaned.length > MAX_CJK_TITLE_CHARS
      ? `${cleaned.slice(0, MAX_CJK_TITLE_CHARS)}...`
      : cleaned;
  }

  const withoutLeadIn = cleaned
    .replace(/^(i'?m|we'?re|you'?re|this is|that is|it's|it is)\s+/i, "")
    .trim();
  const title = trimTitleWords(withoutLeadIn || cleaned);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function buildTranscriptSections(transcript: string): TranscriptSection[] {
  const normalized = normalizeTranscriptText(transcript);
  if (!normalized) return [];

  const sentences = splitIntoSentences(normalized);
  const grouped: string[][] = [];
  let current: string[] = [];

  for (const sentence of sentences) {
    if (shouldStartNewSection(current, sentence)) {
      grouped.push(current);
      current = [];
    }

    current.push(sentence);

    if (buildSectionBody(current).length >= TARGET_SECTION_CHARS) {
      grouped.push(current);
      current = [];
    }
  }

  if (current.length > 0) grouped.push(current);

  return grouped
    .map((group) => {
      const body = buildSectionBody(group);
      return {
        title: titleFromText(body),
        body,
      };
    })
    .filter((section) => section.body.length > 0);
}
