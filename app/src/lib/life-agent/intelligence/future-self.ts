import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import type { FutureSelfResponse } from "@/lib/life-agent/intelligence-types";

export function buildFutureSelfConversation(
  ctx: IntelligenceContextBundle,
  referenceYear = 2027,
): FutureSelfResponse {
  const themesFromLifeOs: string[] = [];
  const questions: string[] = [];

  const values = ctx.packet.identityContext?.coreValues ?? [];
  const goals = ctx.sources.goals
    .filter((g) => g.status !== "completed" && g.status !== "cancelled")
    .slice(0, 5);

  for (const g of goals) {
    themesFromLifeOs.push(g.name);
  }

  for (const b of ctx.sources.bucketItems.slice(0, 4)) {
    themesFromLifeOs.push(b.title);
  }

  if (values.length) {
    questions.push(
      `If your ${referenceYear} self looked at your values (${values.slice(0, 3).join(", ")}), what would they say still matters most?`,
    );
  }

  if (goals.length > 0) {
    questions.push(
      `Which of your current goals — like “${goals[0]!.name}” — would your ${referenceYear} self protect, and which might they gently release?`,
    );
  }

  questions.push(
    `What would your ${referenceYear} self want you to stop postponing — not from fear, but from love for your future peace?`,
  );
  questions.push(
    "What small weekly rhythm would make future-you feel proud, without burning present-you out?",
  );

  const framing = `Let's ask your ${referenceYear} self what matters here. This is reflective projection — a thought experiment using your Life OS data, not a prediction or supernatural message.`;

  const reflectiveNote =
    themesFromLifeOs.length > 0
      ? `From your stored goals and dreams, themes like ${themesFromLifeOs.slice(0, 3).join(", ")} keep showing up. Future-you might ask whether today's choices nourish those themes — or only maintain them on paper.`
      : "With limited goal data visible, future-you might simply ask: what would feel meaningful if you trusted yourself for the next year?";

  return {
    framing,
    questions: questions.slice(0, 5),
    themesFromLifeOs: themesFromLifeOs.slice(0, 8),
    reflectiveNote,
    memoryUsed: ctx.memoryUsed,
    warnings: ctx.warnings.length ? ctx.warnings : undefined,
  };
}
