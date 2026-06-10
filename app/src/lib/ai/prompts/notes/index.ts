import type { NoteAiMode } from "@/lib/ai/schemas/notes";

export type NoteConnectionTarget = {
  targetType: string;
  targetId: string;
  targetTitle: string;
  context?: string | null;
};

type PromptParams = {
  mode: NoteAiMode;
  noteTitle?: string;
  noteContent: string;
  question?: string;
  scope?: string;
  today: string;
  languageRule: string;
  activeProjectName?: string;
  connectionTargets?: NoteConnectionTarget[];
};

const TYPE_RULE =
  "brain-dump | meeting | research | decision | reflection | project-note | resource | learning | general";

function baseSystem(languageRule: string) {
  return `You are the Notes Intelligence layer inside My Best Life OS.

Language (critical): ${languageRule}
Return ONLY valid JSON matching the provided schema.

Trust rules:
- Preserve the user's original meaning.
- Never create tasks automatically.
- Never overwrite or delete the raw note.
- Only suggest actions, decisions, and links when evidence is clear.
- Include confidence and rationale where the schema asks for it.
- Avoid vague semantic matches; prefer scoped, evidence-backed suggestions.`;
}

function noteBlock(params: PromptParams) {
  return `Today: ${params.today}
${params.activeProjectName ? `Active project: ${params.activeProjectName}\n` : ""}${params.noteTitle ? `Title: ${params.noteTitle}\n` : ""}Note:
"""${params.noteContent}"""`;
}

function targetsBlock(targets: NoteConnectionTarget[] | undefined) {
  if (!targets?.length) return "Available targets: []";
  const lines = targets
    .slice(0, 80)
    .map(
      (target) =>
        `- ${target.targetType}:${target.targetId} | ${target.targetTitle}${target.context ? ` | ${target.context}` : ""}`,
    )
    .join("\n");
  return `Available targets:\n${lines}`;
}

export function buildNoteAiPrompt(params: PromptParams): { system: string; user: string } {
  const system = baseSystem(params.languageRule);

  if (params.mode === "capture") {
    return {
      system: `${system}

Mode: capture raw note into structured metadata.
Rules:
- title: concise and useful, <= 12 words.
- summary: 1 to 3 sentences.
- noteType: one of ${TYPE_RULE}.
- category: practical Life OS category, or "" if unclear.
- tags: 0 to 8 short tags.
- actionCandidates: concrete tasks only; do not invent actions.
- decisionCandidates: only decisions, commitments, or tradeoffs clearly present.
- connectionHints: only when strong evidence exists.`,
      user: noteBlock(params),
    };
  }

  if (params.mode === "route") {
    return {
      system: `${system}

Mode: route the note to the best My Best Life OS destination.
Allowed destinations: note, idea, knowledge, task, project, journal.
Rules:
- note = messy thinking, plans, meetings, decisions, or processing work that should stay in Notes.
- idea = early spark or opportunity that needs incubation, not execution.
- knowledge = durable source material, citations, URLs, files, research notes, or facts the OS should cite later.
- task = concrete execution item that should become a task only after user approval.
- project = planning context that should be linked to a project before follow-up extraction.
- journal = personal reflection, emotion, mood, or self-processing.
- Choose one primary destination and up to three secondary destinations.
- nextBestAction should be a concrete review step, not an automatic mutation.
- evidence must quote or paraphrase the note briefly.
- Do not route by vague word similarity.`,
      user: noteBlock(params),
    };
  }

  if (params.mode === "summarize") {
    return {
      system: `${system}

Mode: summarize the note.
Rules:
- summary: 3 to 5 concise sentences or bullets in prose.
- keyPoints: 3 to 8 concrete points.
- Do not add facts not in the note.`,
      user: noteBlock(params),
    };
  }

  if (params.mode === "extract-actions") {
    return {
      system: `${system}

Mode: extract action candidates.
Rules:
- Do not invent tasks.
- Skip vague suggestions like "think about this" unless the note clearly implies a concrete next step.
- dueDate must be YYYY-MM-DD only if clearly implied.
- sourceQuote can be a short quote or paraphrase that proves the action exists.`,
      user: noteBlock(params),
    };
  }

  if (params.mode === "organize") {
    return {
      system: `${system}

Mode: organize a messy note without mutating the original.
Rules:
- cleanedContent should be a clearer rewrite preserving meaning.
- outline should expose structure; no numbering prefixes.
- title, noteType, category, and tags should be practical metadata.
- This is only a preview suggestion.`,
      user: noteBlock(params),
    };
  }

  if (params.mode === "connect") {
    return {
      system: `${system}

Mode: suggest connections between this note and My Best Life OS data.
Allowed target types: project, task, goal, idea, knowledge, note, journal, person.
Rules:
- Keep target ids exactly as provided.
- Only suggest connections with clear evidence.
- Do not connect merely because words are vaguely similar.`,
      user: `${noteBlock(params)}

${targetsBlock(params.connectionTargets)}`,
    };
  }

  if (params.mode === "meeting-recap") {
    return {
      system: `${system}

Mode: meeting recap.
Rules:
- Extract agenda, decisions, action items, and open questions only when present.
- Keep action candidates concrete enough to become tasks.`,
      user: noteBlock(params),
    };
  }

  if (params.mode === "research-distill") {
    return {
      system: `${system}

Mode: research distill.
Rules:
- Extract claims, sources, questions, and next research steps.
- Distinguish stated claims from open questions.
- Do not treat unsourced claims as proven facts.`,
      user: noteBlock(params),
    };
  }

  return {
    system: `${system}

Mode: answer a question using only the selected note context.
Rules:
- If the answer is not present, say so clearly.
- Cite short source snippets from the provided note context.
- Scope is visible to the user; do not use unrelated memory.`,
    user: `Question:
${params.question ?? ""}

Scope: ${params.scope ?? "current-note"}

${noteBlock(params)}`,
  };
}
