import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { languageDirective } from "@/lib/knowledge/ai/language";
import { sanitizeTitle } from "@/lib/knowledge/ai/sanitizeTitle";
import type { AppLocale } from "@/lib/i18n/app-locale";

const BASE_SYSTEM_PROMPT = `You rewrite knowledge item titles.
Return JSON only with one field:
- "title": A concise, specific title that reflects the core idea.

Rules:
- Prefer 6–10 English words OR up to 20 Chinese characters.
- The title must describe the CORE IDEA, not the source.
- NEVER include phrases like "Instagram post by", "Facebook post about",
  "Threads post:", "X video post about", "Video post on X", "Reddit post on",
  "Social media post about", "This post discusses", or
  "Overview of short-form video content".
- NEVER include the words "post", "video", "reel", "thread", "platform", or
  "social media" unless they are semantically essential to the meaning.
- Do NOT repeat the author handle unless the author identity is the subject.
- Do NOT include the platform name unless the platform itself is the subject.
- Avoid clickbait and vague wording.
- Preserve key proper nouns and technical terms in their original spelling
  when there is no widely-used translation.
- For social posts, generalize noisy captions into a clear topic title
  instead of copying usernames, hashtags, encoded entities, or the first
  caption line.
- Respond with valid JSON only.

Examples (BAD → GOOD):
- "Instagram Post by John About Travel" → "Travel reflections from a long trip"
- "Video Content from X Social Media Platform" → "Short-form video engagement strategy"
- "Facebook Post About Waiting for Life's Destiny" → "等待與命運的感悟"
- "Threads Post: 3D Knowledge Graph for Code" → "3D Knowledge Graph for Codebases"
- "Motivational Reminder to Cherish Present Experiences Before They Pass" → "珍惜當下的提醒"`;

const FALLBACK_LANGUAGE_RULE =
  "Detect the dominant language of the source content and respond in that exact same language. " +
  "Treat Traditional Chinese (zh-Hant) and Simplified Chinese (zh-Hans) as DIFFERENT — never " +
  "convert between them: if the source uses 體/個/說/灣 the response must also use those forms; " +
  "if the source uses 体/个/说/湾 the response must also use those. For mixed Chinese-English " +
  "input, use the dominant language. For other languages, mirror the source.";

export async function generateTitleSuggestion(params: {
  rawText: string;
  currentTitle: string;
  contentType: string;
  summary: string;
  targetLanguage?: AppLocale;
}): Promise<string> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const input = params.rawText.slice(0, 6000);
  const summary = params.summary.slice(0, 800);

  const languageRule = params.targetLanguage
    ? languageDirective(params.targetLanguage)
    : FALLBACK_LANGUAGE_RULE;

  const systemInstruction = `${BASE_SYSTEM_PROMPT}\n\nLanguage requirement:\n${languageRule}`;

  const { text } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction,
    userText: `Content type: ${params.contentType}
Current title: ${params.currentTitle}

Summary:
${summary}

Source excerpt:
${input}`,
  });

  const parsed = JSON.parse(text) as Partial<{ title: string }>;
  const nextTitle = parsed.title?.trim();
  if (!nextTitle) throw new Error("Gemini returned empty title");
  // Defense in depth — strip any banned source phrases that slipped through
  // the prompt, unwrap quotes, cap by language-aware length.
  return sanitizeTitle(nextTitle, params.currentTitle).slice(0, 160);
}
