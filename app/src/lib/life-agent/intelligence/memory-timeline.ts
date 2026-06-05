import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import type { MemoryTimelineEntry, MemoryTimelineResponse } from "@/lib/life-agent/intelligence-types";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function buildMemoryTimeline(ctx: IntelligenceContextBundle): MemoryTimelineResponse {
  const entries: MemoryTimelineEntry[] = [];

  for (const j of ctx.sources.journalEntries) {
    entries.push({
      id: j.id,
      date: j.entryDate,
      sourceType: "journal",
      title: j.topic,
      theme: j.primaryEmotion,
    });
  }

  for (const g of ctx.sources.goals) {
    entries.push({
      id: g.id,
      date: dateKey(g.created_at),
      sourceType: "goal",
      title: g.name,
      theme: g.status,
    });
  }

  for (const p of ctx.sources.projects) {
    entries.push({
      id: p.id,
      date: dateKey(p.created_at),
      sourceType: "project",
      title: p.name,
      theme: p.status,
    });
  }

  for (const n of ctx.sources.notes) {
    entries.push({
      id: n.id,
      date: dateKey(n.created_at),
      sourceType: "note",
      title: n.title,
    });
  }

  for (const m of ctx.sources.memories) {
    entries.push({
      id: m.id,
      date: dateKey(m.created_at),
      sourceType: "life_agent_memory",
      title: m.content.slice(0, 80),
      theme: m.memory_type,
    });
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  const headline =
    entries.length > 0
      ? `A timeline of ${entries.length} stored themes from your permitted Life OS records — not invented events.`
      : "No dated records found in permitted domains yet. Journal entries, goals, and projects will appear here when available.";

  return {
    headline,
    entries: entries.slice(0, 40),
    memoryUsed: ctx.memoryUsed,
    warnings: ctx.warnings.length ? ctx.warnings : undefined,
  };
}
