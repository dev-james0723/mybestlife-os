import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import type { InnerConflictItem, InnerConflictResponse } from "@/lib/life-agent/intelligence-types";

const ACTION_NOTE_PATTERN = /\b(todo|task|next|deadline|follow up|action)\b/i;

export function buildInnerConflicts(ctx: IntelligenceContextBundle): InnerConflictResponse {
  const conflicts: InnerConflictItem[] = [];
  const emotionalPatterns: string[] = [];

  const openTasks = ctx.sources.tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled",
  );
  const urgentTasks = openTasks.filter(
    (t) => t.priority === "urgent" || t.priority === "high",
  );

  if (urgentTasks.length >= 4) {
    conflicts.push({
      pattern:
        "A possible tension I notice: your task system may reward urgency, while rest or depth could be harder to protect.",
      evidence: urgentTasks.slice(0, 3).map((t) => t.title),
    });
  }

  const creativeGoals = ctx.sources.goals.filter(
    (g) =>
      g.status !== "completed" &&
      /\b(music|art|creative|practice|festival|compose)\b/i.test(g.name),
  );
  const logisticsTasks = openTasks.filter((t) =>
    /\b(logistics|admin|email|schedule|travel|invoice)\b/i.test(t.title),
  );

  if (creativeGoals.length > 0 && logisticsTasks.length >= 3) {
    conflicts.push({
      pattern:
        "A possible tension I notice: deep growth areas (like music or creative work) are named in goals, while the week may be full of logistics.",
      evidence: [
        ...creativeGoals.slice(0, 2).map((g) => `Goal: ${g.name}`),
        ...logisticsTasks.slice(0, 2).map((t) => `Task: ${t.title}`),
      ],
    });
  }

  const emotionalNotes = ctx.sources.notes.filter((n) =>
    /\b(feel|emotion|heart|stress|anxious|overwhelm)\b/i.test(`${n.title} ${n.content ?? ""}`),
  );
  const actionNotes = ctx.sources.notes.filter((n) =>
    ACTION_NOTE_PATTERN.test(`${n.title} ${n.content ?? ""}`),
  );

  if (emotionalNotes.length >= 1 && actionNotes.length >= emotionalNotes.length) {
    conflicts.push({
      pattern:
        "A possible tension I notice: you may want emotional clarity, while many notes lean toward action plans.",
      evidence: emotionalNotes.slice(0, 2).map((n) => n.title),
    });
  }

  if (ctx.packet.reflectionContext?.emotionalPatterns?.length) {
    for (const p of ctx.packet.reflectionContext.emotionalPatterns.slice(0, 3)) {
      emotionalPatterns.push(p);
    }
  }

  for (const j of ctx.sources.journalEntries.slice(0, 5)) {
    const label = `${j.primaryEmotion} — ${j.topic}`;
    if (!emotionalPatterns.includes(label)) {
      emotionalPatterns.push(label);
    }
  }

  const summary =
    conflicts.length > 0
      ? "These are possible patterns from your permitted Life OS data — gentle hypotheses, not diagnoses. You can disagree with any of them."
      : "I did not find strong tension patterns in your permitted data right now. That may mean things feel integrated, or that more journal and goal context would help.";

  return {
    summary,
    conflicts: conflicts.slice(0, 5),
    emotionalPatterns: emotionalPatterns.slice(0, 6),
    memoryUsed: ctx.memoryUsed,
    warnings: ctx.warnings.length ? ctx.warnings : undefined,
  };
}
