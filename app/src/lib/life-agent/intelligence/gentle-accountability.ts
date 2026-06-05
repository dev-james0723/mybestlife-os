import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import type { GentleAccountabilityItem } from "@/lib/life-agent/intelligence-types";

function countMentions(haystack: string[], needle: string): number {
  const n = needle.toLowerCase().trim();
  if (n.length < 3) return 0;
  let count = 0;
  for (const text of haystack) {
    if (text.toLowerCase().includes(n)) count += 1;
  }
  return count;
}

export function buildGentleAccountability(
  ctx: IntelligenceContextBundle,
): GentleAccountabilityItem[] {
  const items: GentleAccountabilityItem[] = [];
  const corpus: string[] = [];

  for (const m of ctx.sources.memories) {
    corpus.push(m.content);
  }
  for (const n of ctx.sources.notes) {
    corpus.push(`${n.title} ${n.content ?? ""}`);
  }
  for (const j of ctx.sources.journalEntries) {
    corpus.push(j.topic);
  }

  const activeGoals = ctx.sources.goals.filter(
    (g) => g.status !== "completed" && g.status !== "cancelled",
  );

  for (const goal of activeGoals.slice(0, 8)) {
    const mentions = countMentions(corpus, goal.name);
    if (mentions >= 2) {
      items.push({
        topic: goal.name,
        mentionCount: mentions,
        prompt: `You have mentioned “${goal.name}” several times in your Life OS. Should we protect a little time for it this week?`,
      });
    }
  }

  const staleGoals = activeGoals.filter((g) => {
    const relatedTasks = ctx.sources.tasks.filter(
      (t) =>
        t.status !== "done" &&
        t.status !== "cancelled" &&
        (t.title.toLowerCase().includes(g.name.toLowerCase().slice(0, 6)) ||
          (t.description?.toLowerCase().includes(g.name.toLowerCase().slice(0, 6)) ?? false)),
    );
    return relatedTasks.length === 0;
  });

  for (const goal of staleGoals.slice(0, 2)) {
    if (items.some((i) => i.topic === goal.name)) continue;
    items.push({
      topic: goal.name,
      mentionCount: 1,
      prompt: `“${goal.name}” is still active as a goal, but there are no obvious open tasks for it yet. Would a small next step help?`,
    });
  }

  return items.slice(0, 4);
}
