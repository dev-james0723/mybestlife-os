import type { KnowledgeConnection, KnowledgeItem } from "@/types/knowledge";

function clampText(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function tokenizeQuery(q: string): string[] {
  const lower = q.toLowerCase();
  const parts = lower.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);
  return [...new Set(parts)];
}

function startOfWeekUtc(d: Date): number {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return t - diff * 86400000;
}

function isThisCalendarWeek(dateAdded: string, reference: Date): boolean {
  const t = new Date(dateAdded).getTime();
  if (Number.isNaN(t)) return false;
  const w0 = startOfWeekUtc(reference);
  const w1 = w0 + 7 * 86400000;
  return t >= w0 && t < w1;
}

function queryHints(q: string) {
  const lower = q.toLowerCase();
  return {
    wantsRecent: /\b(recent|lately|latest|newest|saved recently)\b/i.test(q) || /最近|近期|剛存|最新/.test(q),
    wantsThisWeek:
      /\b(this week|past week)\b/i.test(lower) || /本週|這週|本周|這周|過去一週/.test(q),
    wantsSummarize: /\b(summarize|summary|overview|tl;dr)\b/i.test(lower) || /摘要|總結|整理|概述/.test(q),
    wantsConnections: /\b(connection|related|link|between)\b/i.test(lower) || /關聯|連結|關係|相關/.test(q),
  };
}

function scoreItem(
  item: KnowledgeItem,
  tokens: string[],
  queryLower: string,
  hints: ReturnType<typeof queryHints>,
  referenceDate: Date,
  connectionCounts: Map<string, number>,
): number {
  let score = 0;
  const titleL = item.title.toLowerCase();
  const summaryL = (item.aiSummary ?? "").toLowerCase();
  const tldrL = (item.aiTldr ?? "").toLowerCase();
  const rawL = (item.rawContent ?? "").toLowerCase().slice(0, 16000);
  const tags = [...item.aiTags, ...item.manualTags].map((t) => t.toLowerCase());
  const blob = [
    titleL,
    summaryL,
    tldrL,
    rawL,
    tags.join(" "),
    item.aiKeyInsights.join(" ").toLowerCase(),
    item.aiKeyQuotes.join(" ").toLowerCase(),
    item.aiActionItems.join(" ").toLowerCase(),
    item.aiQuestionsAnswered.join(" ").toLowerCase(),
  ].join("\n");

  for (const t of tokens) {
    if (titleL.includes(t)) score += 18;
    else if (tags.some((x) => x.includes(t))) score += 12;
    else if (summaryL.includes(t) || tldrL.includes(t)) score += 8;
    else if (blob.includes(t)) score += 4;
  }

  if (queryLower.length >= 3 && blob.includes(queryLower)) score += 22;

  const added = new Date(item.dateAdded).getTime();
  if (!Number.isNaN(added)) {
    const ageDays = (referenceDate.getTime() - added) / 86400000;
    if (hints.wantsThisWeek && isThisCalendarWeek(item.dateAdded, referenceDate)) score += 80;
    else if (hints.wantsRecent && ageDays <= 14) score += 35;
    else if (hints.wantsRecent && ageDays <= 45) score += 12;
  }

  if (hints.wantsSummarize) {
    if (item.contentType === "note") score += 25;
    if ((item.aiSummary ?? "").length > 40) score += 15;
  }

  if (hints.wantsConnections) {
    const n = connectionCounts.get(item.id) ?? 0;
    score += Math.min(n * 14, 70);
  }

  return score;
}

function formatConnectionLines(
  connections: KnowledgeConnection[],
  titleById: Map<string, string>,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  for (const c of connections) {
    const a = titleById.get(c.sourceItemId) ?? c.sourceItemId;
    const b = titleById.get(c.targetItemId) ?? c.targetItemId;
    lines.push(
      `- "${a}" ↔ "${b}" (score ${c.relevanceScore.toFixed(2)}): ${clampText(c.reason, 220)}`,
    );
    if (lines.length >= maxLines) break;
  }
  return lines;
}

function formatItemDetail(item: KnowledgeItem, maxRaw: number): string {
  const lines: string[] = [];
  lines.push(`### ${item.title}`);
  lines.push(`- id: ${item.id}`);
  lines.push(`- type: ${item.contentType}`);
  lines.push(`- status: ${item.status}`);
  lines.push(`- date_added: ${item.dateAdded}`);
  if (item.sourceUrl) lines.push(`- source_url: ${item.sourceUrl}`);
  if (item.aiTldr) lines.push(`- tldr: ${clampText(item.aiTldr, 400)}`);
  if (item.aiSummary) lines.push(`- summary: ${clampText(item.aiSummary, 1200)}`);
  if (item.manualTags.length) lines.push(`- manual_tags: ${item.manualTags.join(", ")}`);
  if (item.aiTags.length) lines.push(`- ai_tags: ${item.aiTags.join(", ")}`);
  if (item.aiKeyInsights.length) {
    lines.push(`- key_insights:`);
    item.aiKeyInsights.slice(0, 12).forEach((x) => lines.push(`  - ${clampText(x, 300)}`));
  }
  if (item.aiKeyQuotes.length) {
    lines.push(`- key_quotes:`);
    item.aiKeyQuotes.slice(0, 6).forEach((x) => lines.push(`  - ${clampText(x, 400)}`));
  }
  if (item.rawContent && item.rawContent.trim()) {
    lines.push(`- text_excerpt: ${clampText(item.rawContent.trim(), maxRaw)}`);
  }
  lines.push("");
  return lines.join("\n");
}

export type KnowledgeAssistantContextPack = {
  systemKnowledgeBlock: string;
  inventoryLineCount: number;
  detailItemCount: number;
};

/**
 * Builds a retrieval-augmented text block: full compact inventory + rich excerpts for top matches.
 */
export function buildKnowledgeAssistantContextPack(params: {
  items: KnowledgeItem[];
  connections: KnowledgeConnection[];
  latestUserMessage: string;
  referenceDateIso: string;
  locale?: string;
}): KnowledgeAssistantContextPack {
  const { items, connections, latestUserMessage, referenceDateIso, locale } = params;
  const referenceDate = new Date(referenceDateIso);
  const safeRef = Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate;

  const titleById = new Map(items.map((i) => [i.id, i.title]));
  const connectionCounts = new Map<string, number>();
  for (const c of connections) {
    connectionCounts.set(c.sourceItemId, (connectionCounts.get(c.sourceItemId) ?? 0) + 1);
    connectionCounts.set(c.targetItemId, (connectionCounts.get(c.targetItemId) ?? 0) + 1);
  }

  const hints = queryHints(latestUserMessage);
  const tokens = tokenizeQuery(latestUserMessage);
  const queryLower = latestUserMessage.trim().toLowerCase();

  const scored = items.map((item) => ({
    item,
    score: scoreItem(item, tokens, queryLower, hints, safeRef, connectionCounts),
  }));
  scored.sort((a, b) => b.score - a.score);

  const detailLimit = items.length > 80 ? 22 : 28;
  const detailItems: KnowledgeItem[] = [];
  const seen = new Set<string>();
  for (const { item } of scored) {
    if (detailItems.length >= detailLimit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    detailItems.push(item);
  }
  // Ensure at least a few newest items appear when the question is broad / zero-token
  if (tokens.length === 0 && !hints.wantsThisWeek && !hints.wantsRecent) {
    const byDate = [...items].sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
    );
    for (const it of byDate.slice(0, 6)) {
      if (detailItems.length >= detailLimit) break;
      if (!seen.has(it.id)) {
        seen.add(it.id);
        detailItems.push(it);
      }
    }
  }

  const invLines: string[] = [];
  const sortedInventory = [...items].sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
  );
  for (const it of sortedInventory) {
    invLines.push(
      `- [${it.id}] ${it.contentType} | ${clampText(it.title, 120)} | added ${it.dateAdded}${
        it.sourceUrl ? ` | ${clampText(it.sourceUrl, 80)}` : ""
      }`,
    );
  }

  const connLines = formatConnectionLines(connections, titleById, 60);

  const parts: string[] = [];
  parts.push(`User locale hint: ${locale ?? "en"}`);
  parts.push(`Reference "now" for relative dates: ${safeRef.toISOString()}`);
  parts.push("");
  parts.push(`## Full inventory (${items.length} items, newest first)`);
  parts.push(invLines.join("\n") || "(empty library)");
  parts.push("");
  if (connLines.length > 0) {
    parts.push(`## Stored AI connections (${connections.length} edges)`);
    parts.push(connLines.join("\n"));
    parts.push("");
  } else {
    parts.push("## Stored AI connections");
    parts.push("(none yet — say so honestly if the user asks about connections.)");
    parts.push("");
  }
  parts.push(`## Rich excerpts (retrieval-focused, ${detailItems.length} items)`);
  parts.push(
    "Use these excerpts plus the inventory to answer. Prefer citing real titles and dates from the data.",
  );
  parts.push("");
  for (const it of detailItems) {
    parts.push(formatItemDetail(it, items.length > 120 ? 3500 : 6000));
  }

  let systemKnowledgeBlock = parts.join("\n");
  const maxChars = 92000;
  if (systemKnowledgeBlock.length > maxChars) {
    systemKnowledgeBlock = clampText(systemKnowledgeBlock, maxChars);
  }

  return {
    systemKnowledgeBlock,
    inventoryLineCount: invLines.length,
    detailItemCount: detailItems.length,
  };
}

export function knowledgeAssistantSystemInstruction(locale?: string): string {
  const lang = locale?.startsWith("zh") ? "Chinese (Traditional or Simplified) when the user writes Chinese" : "the same language the user writes in";
  return `You are the Knowledge Base assistant for a personal app (MyLifeOS). You ONLY answer using the KNOWLEDGE BASE DATA block provided in the user message (inventory, connections, excerpts). If something is not in the data, say you do not see it and suggest what to add or how to search.

Rules:
- Answer in ${lang}. Match the user's language (e.g. zh-TW for Traditional Chinese).
- For "recent" / "this week" style questions, use date_added and the reference time; list concrete items with title and type (podcast, video, article, note, file, photo).
- For "summarize my notes", focus on items with type "note" and their summaries/excerpts; if there are no notes, say so.
- For "find connections", use the "## Stored AI connections" section and relate titles; if empty, explain that no AI connections are stored yet.
- When the user only remembers keywords, list the best-matching items with short reasons (which field matched: title, tag, summary, excerpt).
- Use Markdown: short headings, bullet lists, **bold** item titles. Do not invent URLs or items not present in the data.
- Keep answers focused and scannable.`;
}
