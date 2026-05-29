/**
 * Builds image prompts so Idea Capture thumbnails stay on-brand (minimal gradient)
 * while remaining instantly recognizable for the specific idea.
 */

const MONTH_CUES: Record<string, string> = {
  january: "cool winter light, restrained palette",
  february: "late-winter calm, soft grey-blue",
  march: "early spring transition, fresh green hint",
  april: "spring bloom energy, light pink-green accents",
  may: "late spring warmth, bright clear sky",
  june: "early summer brightness",
  july: "peak summer heat, strong golden light",
  august: "late-summer heat, golden-orange humid sky (not cherry blossom unless idea says sakura)",
  september: "early autumn, amber tones",
  october: "autumn foliage, rust and gold",
  november: "late autumn, muted copper",
  december: "winter holiday calm, cool blue-violet",
};

/** One-line topic label for the image model (title + tags + short content hook). */
export function summarizeIdeaVisualTopic(params: {
  title: string;
  content: string;
  tags: string[];
}): string {
  const parts: string[] = [];
  const title = params.title.trim();
  if (title) parts.push(title);

  for (const tag of params.tags) {
    const t = tag.trim();
    if (t && !parts.some((p) => p.toLowerCase() === t.toLowerCase())) {
      parts.push(t);
    }
  }

  const compact = params.content.replace(/\s+/g, " ").trim();
  const hook = compact.split(/[.!?。！？\n]/u)[0]?.trim() ?? "";
  if (hook && hook.length >= 8 && hook.length <= 100) {
    const lowerHook = hook.toLowerCase();
    if (!parts.some((p) => lowerHook.includes(p.toLowerCase()) || p.toLowerCase().includes(lowerHook.slice(0, 12)))) {
      parts.push(hook);
    }
  }

  return parts.slice(0, 8).join(" · ") || "(untitled idea)";
}

function detectSeasonTimeCue(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [month, cue] of Object.entries(MONTH_CUES)) {
    if (lower.includes(month)) return cue;
  }
  if (/八月|8月|八月/.test(text)) return MONTH_CUES.august;
  if (/櫻|樱花|sakura|cherry blossom/i.test(text)) {
    return "cherry blossom season — soft pink accents in gradient";
  }
  if (/summer|夏天|夏季/i.test(text)) return "summer warmth, golden sky";
  if (/winter|冬天|冬季/i.test(text)) return "winter cool tones";
  return undefined;
}

function inferGeoAnchorHint(text: string): string | undefined {
  const blob = text.toLowerCase();
  if (/\bjapan\b|日本|東京|tokyo|osaka|kyoto|京都|富士|fuji|torii|新幹線|shinkansen/.test(blob)) {
    return "Location anchor required: include clearly Japanese elements (e.g. Mt Fuji, torii, rising-sun motif, Japanese flag circle accent, Tokyo tower silhouette).";
  }
  if (/\bchina\b|中国|北京|beijing|shanghai|上海|長城|great wall/.test(blob)) {
    return "Location anchor required: include clearly Chinese elements (e.g. Great Wall line, pavilion roof, red-lantern only if festival is mentioned).";
  }
  if (/\bkorea\b|韓國|韩国|seoul|首爾/.test(blob)) {
    return "Location anchor required: include clearly Korean elements (e.g. hanok roofline, Seoul tower silhouette, taegeuk color hint).";
  }
  return undefined;
}

/** Heuristic primary-symbol hints when enrich did not supply cardVisualPrompt. */
function inferPrimarySymbolHint(topicLine: string, content: string): string {
  const blob = `${topicLine} ${content}`.toLowerCase();

  if (/\bjapan\b|日本|東京|tokyo|osaka|kyoto|京都|富士|fuji|torii|新幹線|shinkansen/.test(blob)) {
    if (/food|餐|料理|壽司|寿司|ramen|拉麵|拉面|eat|dining|culinary|gastronomy/.test(blob)) {
      return (
        "Japanese food journey anchor: sushi/ramen silhouette in foreground + Mt Fuji or torii in background, " +
        "optionally red sun / Japanese flag circle accent — reads as Japan + food immediately"
      );
    }
    return (
      "Mount Fuji silhouette + vermilion torii gate (or shinkansen curve), optionally Japanese flag red-sun circle accent — " +
      "instantly reads as Japan travel, not generic Asian festival decor"
    );
  }
  if (/\bchina\b|中国|北京|beijing|shanghai|上海|長城|great wall/.test(blob)) {
    return "minimal Great Wall or pavilion roofline silhouette — reads as China";
  }
  if (/\bkorea\b|韓國|韩国|seoul|首爾/.test(blob)) {
    return "soft city skyline + N Seoul Tower–like silhouette or hanok roofline";
  }
  if (/dinner|晚餐|聚餐|restaurant|食飯|meal|coffee|咖啡|brunch/.test(blob)) {
    return "warm table glow + single plate/cup silhouette";
  }
  if (/trademark|商標|商标|legal|law|律師|contract|合約/.test(blob)) {
    return "stamp/seal + document corner silhouette";
  }
  if (/concert|演唱會|演出|festival|音樂節/.test(blob)) {
    return "stage spotlight beam + crowd wave silhouette (only if event is the topic)";
  }
  if (/trip|travel|旅行|旅遊|flight|機票|hotel|酒店/.test(blob)) {
    return "airplane arc or suitcase + horizon line — reads as travel planning";
  }
  if (/workout|健身|gym|run|跑步|health/.test(blob)) {
    return "single dumbbell or running figure silhouette";
  }
  if (/code|program|軟件|app|startup|創業|product/.test(blob)) {
    return "abstract nodes/flow lines suggesting product or code";
  }

  return (
    "one bold central silhouette abstracted from the topic words above — " +
    "avoid random decorative icons unrelated to the text"
  );
}

export function buildIdeaCardIconPrompt(params: {
  ideaContent: string;
  title: string;
  tags: string[];
  palette?: string[];
  /** From auto-enrich `cardVisualPrompt` — treated as mandatory motif direction. */
  motifHint?: string;
}): string {
  const content = params.ideaContent.trim().slice(0, 1200);
  const title = params.title.trim().slice(0, 120);
  const topicLine = summarizeIdeaVisualTopic({
    title,
    content,
    tags: params.tags,
  });
  const tagsLine = params.tags.slice(0, 8).join(", ");
  const seasonCue = detectSeasonTimeCue(`${title} ${content} ${tagsLine}`);
  const geoAnchor = inferGeoAnchorHint(`${title} ${content} ${tagsLine}`);
  const primaryHint = params.motifHint?.trim()
    ? `Use this as the PRIMARY symbol (required): ${params.motifHint.trim().slice(0, 500)}`
    : `Primary symbol (required): ${inferPrimarySymbolHint(topicLine, content)}`;

  const paletteLine =
    params.palette && params.palette.length > 0
      ? `Gradient palette (use these hex moods): ${params.palette.join(", ")}`
      : "Gradient palette: pick 2–3 hues that match the topic mood (travel=sky+peach, food=warm appetizing, legal=cool blue-grey).";

  return [
    "Create ONE minimalist gradient thumbnail for an Idea Capture card.",
    "You must return an actual image in the response (inline image data), not only text.",
    "",
    "=== TOPIC RECOGNITION (highest priority) ===",
    `This idea is about: ${topicLine}`,
    title ? `Title: ${title}` : "",
    content ? `Content excerpt: ${content.slice(0, 400)}` : "",
    tagsLine ? `Tags: ${tagsLine}` : "",
    "RECOGNITION TEST: A stranger must guess the idea topic within 2 seconds — the symbol must be specific to THIS idea, not generic wallpaper.",
    "",
    "=== REQUIRED VISUAL ANCHORS ===",
    primaryHint,
    geoAnchor ? `${geoAnchor}` : "",
    geoAnchor
      ? "If the primary symbol is generic (e.g. food, airplane), combine it with the location anchor in the same image."
      : "",
    seasonCue ? `Season/time cue: ${seasonCue}` : "",
    "Supporting cue: optional second small silhouette (horizon, transport, object) only if it reinforces the same topic.",
    "ANTI-PATTERNS (do NOT use unless the idea text mentions them): generic festival lanterns, random fireworks, abstract diamonds, unrelated geometric confetti, stock 'travel' globes with no place cue.",
    "",
    "=== FIXED STYLE (keep exactly) ===",
    "Minimalist vertical poster. Smooth atmospheric color gradients (2–3 hues). Thin white semi-circular arc in the upper third.",
    "Generous negative space, calm editorial app-cover feel. One dominant black or near-black silhouette in the center-lower area.",
    paletteLine,
    "Subtle grain OK. Vertical 3:4 crop. No photorealism, no busy scenes, no faces, no logos.",
    "",
    "=== HARD CONSTRAINTS ===",
    "No text, no letters, no numbers, no watermark, no UI chrome, no harsh neon, no 3D renders.",
    "Country symbols ARE allowed when relevant to content (e.g. Japanese flag red sun circle), but keep them minimalist and non-political.",
    "Example — idea 'Go to Japan in August': Mt Fuji + torii gate + subtle red-sun flag circle, warm golden August sky gradient, optional shinkansen curve — NOT generic lanterns only.",
  ]
    .filter(Boolean)
    .join("\n");
}
