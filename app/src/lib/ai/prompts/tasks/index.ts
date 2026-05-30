/**
 * Prompt builders for `/api/ai/tasks`. Each returns `{ system, user }` strings.
 * `languageRule` comes from {@link getLlmResponseLanguageDirective} so output
 * matches the user's app locale regardless of the input language.
 */

export type TaskLite = {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  scheduledDate?: string | null;
  category?: string | null;
  project?: string | null;
  updatedAt?: string | null;
};

const CATEGORY_HINT =
  "academic, business, music, personal, admin, creative, health, finance, learning, other";

export function buildCreatePrompt(params: {
  prompt: string;
  today: string;
  languageRule: string;
  projectName?: string;
}): { system: string; user: string } {
  const system = `You convert a natural-language request into ONE structured task for a personal life-OS.

Language (critical): ${params.languageRule}
Return ONLY valid JSON matching the provided schema.

Rules:
- title: concise imperative (<= 12 words). Strip filler.
- description: 1-2 sentences only if the prompt adds useful detail; else "".
- priority: low | medium | high | urgent — infer from urgency words/deadlines.
- status: usually "todo".
- category: choose the best fit from [${CATEGORY_HINT}] or "" if unclear.
- estimatedBlocks: integer 0-72 focus blocks (0 = unknown). Quick errand ~1, deep work ~4+.
- dueDate / scheduledDate: ISO "YYYY-MM-DD" only if clearly implied (today is ${params.today}); else "".
- tags: 0-5 short lowercase tags.
- reminders: 0-3 short, practical reminders.
- subtasks: 0-6 concrete checklist steps if the task obviously decomposes; else [].`;

  const user = `Today: ${params.today}
${params.projectName ? `Active project: ${params.projectName}\n` : ""}User request:
"""${params.prompt}"""`;
  return { system, user };
}

export function buildBreakdownPrompt(params: {
  title: string;
  description?: string;
  languageRule: string;
}): { system: string; user: string } {
  const system = `You break a task into an ordered checklist of concrete, actionable subtasks.

Language (critical): ${params.languageRule}
Return ONLY valid JSON matching the schema.

Rules:
- 3-8 subtasks, each a short imperative step (<= 12 words).
- Order them logically (prep -> do -> wrap up).
- No numbering prefixes; no duplicates; specific to this task.
- summary: optional one-line note ("" if none).`;
  const user = `Task: ${params.title}
${params.description ? `Details: ${params.description}` : ""}`;
  return { system, user };
}

export function buildPrioritizePrompt(params: {
  tasks: TaskLite[];
  today: string;
  languageRule: string;
}): { system: string; user: string } {
  const system = `You re-assess the priority of a user's open tasks.

Language (critical): ${params.languageRule}
Return ONLY valid JSON matching the schema.

Rules:
- For EACH input task return { id, priority, reason }.
- priority: low | medium | high | urgent. Weigh deadlines (today is ${params.today}), overdue status, and stated importance.
- reason: <= 1 short sentence.
- Keep ids EXACTLY as given. Do not invent tasks.`;
  const lines = params.tasks
    .map(
      (t) =>
        `- id=${t.id} | "${t.title}" | priority=${t.priority ?? "?"} | due=${t.dueDate ?? "none"} | status=${t.status ?? "?"}`,
    )
    .join("\n");
  const user = `Tasks:\n${lines}`;
  return { system, user };
}

export function buildSchedulePrompt(params: {
  tasks: TaskLite[];
  today: string;
  languageRule: string;
}): { system: string; user: string } {
  const system = `You propose when the user should work on each open task across the next 14 days.

Language (critical): ${params.languageRule}
Return ONLY valid JSON matching the schema.

Rules:
- For EACH input task return { id, scheduledDate, dueDate, reason }.
- scheduledDate: ISO "YYYY-MM-DD" on/after today (${params.today}); spread work realistically, earlier for higher priority / nearer deadlines.
- dueDate: keep the existing due date unless the task clearly needs one; else "".
- Never schedule after an existing dueDate.
- reason: <= 1 short sentence. Keep ids EXACTLY as given.`;
  const lines = params.tasks
    .map(
      (t) =>
        `- id=${t.id} | "${t.title}" | priority=${t.priority ?? "?"} | due=${t.dueDate ?? "none"}`,
    )
    .join("\n");
  const user = `Today: ${params.today}\nTasks:\n${lines}`;
  return { system, user };
}

export function buildCleanupPrompt(params: {
  tasks: TaskLite[];
  today: string;
  languageRule: string;
}): { system: string; user: string } {
  const system = `You audit a task list for clutter and suggest cleanups.

Language (critical): ${params.languageRule}
Return ONLY valid JSON matching the schema.

Rules:
- Suggest changes ONLY for tasks that need them (don't echo the whole list).
- action: archive (stale/abandoned) | delete (junk/duplicate) | reword (vague title -> provide newTitle) | set-priority (provide priority) | set-project (note in reason).
- reason: <= 1 short sentence explaining why. Keep ids EXACTLY as given.
- Be conservative; prefer reword/set-priority over delete.`;
  const lines = params.tasks
    .map(
      (t) =>
        `- id=${t.id} | "${t.title}" | status=${t.status ?? "?"} | due=${t.dueDate ?? "none"} | project=${t.project ?? "none"} | updated=${t.updatedAt ?? "?"}`,
    )
    .join("\n");
  const user = `Today: ${params.today}\nTasks:\n${lines}`;
  return { system, user };
}

export function buildReviewPrompt(params: {
  mode: "weekly-review" | "summary";
  metricsText: string;
  languageRule: string;
}): { system: string; user: string } {
  const framing =
    params.mode === "weekly-review"
      ? "a concise weekly task review"
      : "a short snapshot summary of the current task load";
  const system = `You write ${framing} for a personal life-OS, grounded ONLY in the provided metrics.

Language (critical): ${params.languageRule}
Return ONLY valid JSON matching the schema.

Rules:
- headline: 1 punchy sentence capturing the state.
- wins: 0-4 concrete positives from the data.
- risks: 0-4 concrete concerns (overdue, no-project pileup, stalled work).
- recommendations: 1-4 specific next actions.
- Never invent numbers not present in the metrics.`;
  const user = `Metrics:\n${params.metricsText}`;
  return { system, user };
}
