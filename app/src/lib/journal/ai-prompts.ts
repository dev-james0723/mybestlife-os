/**
 * Server-side prompt builders for the journal AI endpoints.
 * Each function returns a plain string that gets fed verbatim into Gemini.
 *
 * Reference: Appendices A (summary), B (illustration), C (audio) of the
 * journal spec.
 */

import type { Quadrant } from "./constants";
import type {
  AudioRequest,
  IllustrationRequest,
  SummaryRequest,
} from "./schema";

// ---------------------------------------------------------------------------
// Appendix A — Journal summary
// ---------------------------------------------------------------------------

export const JOURNAL_SUMMARY_SYSTEM_PROMPT = `You are a journal companion AI that helps users process emotions and experiences. Generate narrative summaries, emotional insights, practical suggestions, and earned appreciation based ONLY on the provided entry data. Be specific, grounded, and human. Never invent facts. Never give medical advice. Focus on emotional regulation, needs awareness, and tiny actionable steps.`;

export function buildJournalSummaryUserPrompt(input: SummaryRequest): string {
  const today = new Date().toISOString().slice(0, 10);
  const bullets = input.bullets.items.join("\n");
  const needs = input.needs.join(", ");
  const topicExtras = JSON.stringify(input.topicExtras ?? {});
  const contextFactors = JSON.stringify(input.contextFactors ?? {});
  const past =
    input.pastEntriesContext && input.pastEntriesContext.length > 0
      ? `Past Entries Context (similar entries):\n${JSON.stringify(input.pastEntriesContext)}`
      : "";

  return [
    `Generate a comprehensive, detailed journal summary for this entry.`,
    ``,
    `Current Date: ${today}`,
    ``,
    `**ENTRY DATA:**`,
    `Topic: ${input.topic}`,
    `Quadrant: ${input.quadrant}`,
    `Primary Emotion: ${input.primaryEmotion} (intensity ${input.intensity}/10)`,
    `Secondary Emotion: ${input.secondaryEmotion ?? "none"}`,
    `Target: ${input.target ?? "not specified"}`,
    ``,
    `What happened (bullets):`,
    bullets,
    ``,
    `Self Story:`,
    input.selfStory ?? "not provided",
    ``,
    `Needs: ${needs}`,
    `Next Tiny Step: ${input.nextTinyStep}`,
    `Appreciation: ${input.appreciation ?? "none"}`,
    ``,
    `Topic-Specific Extras:`,
    topicExtras,
    ``,
    `Context Factors:`,
    contextFactors,
    ``,
    past,
    ``,
    `**YOUR MISSION - PROVIDE DETAILED SECTION-BY-SECTION ANALYSIS:**`,
    ``,
    `1. **JOURNAL ENTRY** (4-8 sentences - MORE DETAILED):`,
    `   - Synthesize the facts (bullets) + self story into a rich, coherent narrative`,
    `   - Use the user's voice, not therapy-bot language`,
    `   - Reference the primary emotion and intensity naturally`,
    `   - Connect the events to the emotional experience`,
    `   - Mention the needs and how they relate to what happened`,
    `   - Reference the nextTinyStep as a path forward`,
    `   - Include context factors if provided (sleep, workload, etc.)`,
    `   - DO NOT invent facts beyond what's provided`,
    `   - Be thorough but human and grounded`,
    ``,
    `2. **EMOTIONAL READ** (3-5 bullet insights - DEEPER ANALYSIS):`,
    `   - What's happening emotionally beneath the surface?`,
    `   - Connect emotion to needs (which needs are met/unmet and WHY?)`,
    `   - Identify underlying patterns or dynamics (perfectionism, uncertainty, conflict avoidance, identity pressure, need for control/connection)`,
    `   - Name the tension: what they want vs what they fear/avoid`,
    `   - Connect to values or goals if evident`,
    `   - Identify patterns if past entries provided`,
    `   - NO clichés, NO generic therapy speak`,
    `   - Specific to THIS entry with deeper psychological insight`,
    `   - Each bullet should reveal something the user might not have explicitly written`,
    ``,
    `3. **SUGGESTIONS - THREE PARTS**:`,
    `   - **Coping** (2-3 sentences): Immediate emotional regulation strategy with specific technique and why it helps`,
    `   - **Practical** (2-3 sentences): Concrete action aligned with nextTinyStep, with specific steps and timing`,
    `   - **Reframe Question** (1-2 thoughtful questions): Thought-provoking questions to shift perspective, grounded in the entry`,
    `   - Must be specific to the topic and situation`,
    `   - NO generic advice`,
    `   - Provide actionable detail`,
    ``,
    `4. **EARNED APPRECIATION** (2-3 sentences - MORE SPECIFIC):`,
    `   - MUST be specific and evidence-based from the bullets`,
    `   - Reference actual actions/behaviors from the entry with detail`,
    `   - Explain WHY this matters or what it shows about them`,
    `   - NO generic praise`,
    `   - For Achievement topic: be especially specific about skills shown`,
    `   - For Quick Reset: keep brief but still specific`,
    `   - If no clear evidence of effort/skill: acknowledge the act of journaling itself with specificity`,
    ``,
    `**TOPIC-SPECIFIC EMPHASIS:**`,
    ``,
    `- **Work/Study**: Identify blocker + concrete next step; reference win/friction if provided; analyze productivity patterns`,
    `- **People/Relationships**: Separate facts vs interpretation; suggest 1 communication step or boundary; explore relational dynamics`,
    `- **Body/Health**: Practical self-care only; NO medical advice/diagnosis; connect physical to emotional`,
    `- **Stress Event**: Reduce rumination; detailed coping + practical action; reference likelyOutcome vs worstCase; reality-test fears`,
    `- **Achievement/Confidence**: Earned appreciation must be specific and tied to skillShown; identify transferable skills`,
    `- **Creativity/Music**: Convert frustration into micro-goal; reference bottleneck if provided; explore creative process`,
    `- **Big Decisions**: Push toward experiment not analysis; align with nextExperiment if provided; clarify values at stake`,
    `- **Quick Reset**: Mini mode - brief, focused, 1 need only, but still insightful`,
    ``,
    `**SAFETY RULES:**`,
    `- NO medical diagnosis or advice`,
    `- NO invented facts`,
    `- If self-harm/crisis language detected: acknowledge, suggest professional support, keep response supportive`,
    `- Respect the user's autonomy and intelligence`,
    ``,
    `**TONE:**`,
    `- Detailed but concise human voice, not therapy-bot`,
    `- Specific, not generic`,
    `- Grounded in the actual entry data`,
    `- Respectful and non-patronizing`,
    `- Provide depth and insight, not surface-level restatement`,
    ``,
    `**OUTPUT QUALITY:**`,
    `- Each section should feel substantial and valuable`,
    `- User should learn something new about themselves`,
    `- Analysis should connect multiple elements (emotion + events + story + needs)`,
    `- Avoid repetition between sections`,
    ``,
    `Return the response as JSON matching the provided response schema.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// ---------------------------------------------------------------------------
// Appendix B — Illustration prompt construction
// ---------------------------------------------------------------------------

const QUADRANT_PALETTE: Record<Quadrant, string> = {
  RED: "warm reds, oranges, dramatic high-contrast lighting, slight motion blur, tense composition",
  YELLOW:
    "warm yellows, golden hour light, open skies, ascending or outward composition",
  BLUE: "cool blues and teals, low light, soft fog, downward or inward composition",
  GREEN:
    "muted greens and earth tones, natural soft light, balanced and grounded composition",
};

export function buildIllustrationPrompt(input: IllustrationRequest): string {
  const themes = input.bullets
    .slice(0, 3)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .join("; ");
  const summarySnippet = input.aiSummary
    ? `Underlying narrative for atmosphere only: ${input.aiSummary.slice(0, 400)}`
    : "";

  return [
    `A ${input.stylePreset} that emotionally represents a day described as: ${input.primaryEmotion}, intensity ${input.intensity}/10.`,
    ``,
    `Core themes (use as symbolic references, not literal scenes):`,
    themes,
    ``,
    `Emotional needs at the center of the image: ${input.needs.join(", ")}.`,
    ``,
    summarySnippet,
    ``,
    `Palette and lighting follow the ${input.quadrant} quadrant: ${QUADRANT_PALETTE[input.quadrant]}.`,
    ``,
    `The composition should be ${input.literalVsSymbolic}% symbolic and ${100 - input.literalVsSymbolic}% literal. Lean into metaphor — objects, landscape, light, weather — rather than depicting people directly.`,
    ``,
    `Aspect ratio: ${input.aspectRatio}.`,
    ``,
    `ABSOLUTE CONSTRAINTS: no text or letters of any kind in the image, no identifiable real people, no brand logos, no copyrighted characters, no graphic violence or sexual content.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// ---------------------------------------------------------------------------
// Appendix C — Audio companion script
// ---------------------------------------------------------------------------

export const JOURNAL_AUDIO_SYSTEM_PROMPT = `You are a journal audio companion. Generate natural, conversational scripts that acknowledge emotions, reference specific events, connect to needs, and provide earned appreciation. Then convert to speech. Keep it human, warm, and specific. Target ~2 minutes of audio (300–420 words).`;

export function buildAudioScriptUserPrompt(input: AudioRequest): string {
  const events = input.bullets.join("; ");
  const summarySnippet = input.aiSummary
    ? `AI Summary (for consistency): ${input.aiSummary}`
    : "";

  return [
    `Generate a 2-minute journal companion voice note for this entry.`,
    ``,
    `**ENTRY DATA:**`,
    `Topic: ${input.topic}`,
    `Quadrant: ${input.quadrant}`,
    `Primary Emotion: ${input.primaryEmotion} (${input.intensity}/10)`,
    `Secondary Emotion: ${input.secondaryEmotion ?? "none"}`,
    `Events: ${events}`,
    `Self Story: ${input.selfStory ?? "not provided"}`,
    `Needs: ${input.needs.join(", ")}`,
    `Next Tiny Step: ${input.nextTinyStep}`,
    summarySnippet,
    ``,
    `**YOUR ROLE AND GOAL:**`,
    `You are the user's daily journal companion. Generate a spoken voice note (about 2 minutes) based on their journal entry. Your job is to help them understand themselves more clearly, connect the dots, and leave with grounded momentum. This is reflective coaching, not therapy and not medical advice.`,
    ``,
    `**CORE REQUIREMENT (MOST IMPORTANT):**`,
    `Do NOT simply restate what the user wrote.`,
    `You may briefly reference facts, but your main value must be:`,
    `- Integrating meaning across the entry (emotion + events + self-story + needs + next step)`,
    `- Naming likely dynamics as hypotheses (not certainties)`,
    `- Offering reflections that the user probably didn't explicitly write but are directly supported`,
    `- Giving specific appreciation and realistic suggestions`,
    ``,
    `**TONE RULES (NON-NEGOTIABLE):**`,
    `- Sound like a real human leaving a thoughtful voice memo`,
    `- Warm, calm, direct. No hype, no clichés, no fake positivity`,
    `- No "as an AI." No diagnosing or clinical labels`,
    `- Use humble language for inferences: "I wonder if…", "It might be…", "It sounds like…"`,
    ``,
    `**LENGTH TARGET:**`,
    `300–420 words (aim ~2 minutes at normal speaking speed)`,
    ``,
    `**MUST-INCLUDE ANCHORS (NON-NEGOTIABLE):**`,
    `You must explicitly include:`,
    `- The user's Primary emotion (and Secondary if provided)`,
    `- At least TWO concrete items from "What happened" bullets (as evidence, briefly)`,
    `- The user's selected Need(s)`,
    `- The user's Next tiny step`,
    `- One value/goal link ("why this matters to you")`,
    ``,
    `**TWO SUGGESTIONS ONLY (STRICT):**`,
    `Provide exactly TWO suggestions total:`,
    `1. One inner suggestion (attention, nervous system, mindset, self-talk)`,
    `2. One outer suggestion (plan, boundary, communication, environment)`,
    `Each must be small and doable today. No lists. No "10 tips."`,
    ``,
    `**EARNED APPRECIATION (STRICT):**`,
    `Include exactly ONE earned appreciation. It must be specific and tied to evidence from the entry (e.g., naming emotions honestly, choosing a next step, doing something despite discomfort). No generic compliments.`,
    ``,
    `**PERSONALIZED QUOTE LINES (EMBEDDED IN THE AUDIO):**`,
    `- Include exactly THREE original "quote lines" inside the script`,
    `- Each quote: 8–16 words, one sentence, punchy, not cheesy`,
    `- No famous quotes and no attribution`,
    `- Each quote must tie to at least one: primary emotion, needs, or next tiny step`,
    `- Introduce naturally: "Here's a line to keep in your pocket today:" then speak it`,
    `- Placement:`,
    `  - Quote 1 after Mirror`,
    `  - Quote 2 after Reframe`,
    `  - Quote 3 near the end before the closing questions`,
    `- Also return the same quotes verbatim in a \`quotes\` field in the JSON`,
    ``,
    `**REFLECTIVE STRUCTURE (MUST FOLLOW):**`,
    ``,
    `1. **Mirror (2–3 sentences)**`,
    `   Briefly name the emotional tone and what the day seems to be about. Use the exact emotion word(s). Mention only 1–2 factual bullets max here.`,
    `   (Insert Quote 1)`,
    ``,
    `2. **Integration (6–9 sentences)**`,
    `   This is the "digest" part. Do real synthesis, not paraphrase.`,
    `   - Connect emotion + events + selfStory into 1–2 underlying themes`,
    `   - Offer 1–2 hypotheses about patterns (e.g., perfectionism, uncertainty, conflict avoidance, identity pressure, need for control/connection), but only if supported by the entry`,
    `   - Name the tension: what they want vs what they fear/avoid`,
    `   - Tie it to needs and a value/goal`,
    ``,
    `3. **Reframe (3–5 sentences)**`,
    `   Offer a balanced alternative interpretation that could also be true, grounded in the facts. Avoid toxic positivity.`,
    `   (Insert Quote 2)`,
    ``,
    `4. **Two suggestions (exactly 2 sentences total)**`,
    `   Sentence 1: inner suggestion`,
    `   Sentence 2: outer suggestion`,
    `   Both must point toward the user's Need(s) and support the Next tiny step`,
    ``,
    `5. **Earned appreciation (1 sentence)**`,
    `   One sentence, specific, evidence-based`,
    `   (Insert Quote 3)`,
    ``,
    `6. **Close (2–3 sentences)**`,
    `   End with exactly TWO reflective questions the user can answer tomorrow. Questions must be concrete.`,
    ``,
    `**ANTI-PARAPHRASE GUARDRAILS (TO FORCE REAL VALUE):**`,
    `- Max 20% of the script can be "repeating" user bullets`,
    `- You must add at least 3 moments of insight that connect multiple parts (emotion + selfStory + needs + next step)`,
    `- If the entry is too thin to infer safely, say so briefly and ask a clarifying question rather than guessing`,
    ``,
    `**SAFETY CONSTRAINTS:**`,
    `If the entry mentions self-harm or harming others: do not provide instructions; switch to a supportive, safety-oriented message and encourage reaching out to local emergency services or a trusted person.`,
    ``,
    `Return the response as JSON with two keys: \`script\` (the full spoken text, ready for TTS) and \`quotes\` (the three quote lines verbatim, in order).`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
