export type TaskReferenceKind = "note" | "idea" | "knowledge";

export type TaskLinkMetadata = {
  userVisibleTags: string[];
  noteIds: string[];
  ideaIds: string[];
  knowledgeIds: string[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE_TAG_PATTERN = /^(note|idea|knowledge):(.+)$/;
const LEGACY_REFERENCE_SECTION_PATTERN =
  /^Related (notes|ideas|knowledge):\s*([\s\S]*?)\s*$/i;

type ReferenceIdSets = Record<TaskReferenceKind, Set<string>>;

function addReferenceId(
  ids: ReferenceIdSets,
  kind: TaskReferenceKind,
  id: string,
): void {
  ids[kind].add(id.toLowerCase());
}

function parseLegacyReferenceSection(
  section: string,
): { kind: TaskReferenceKind; ids: string[] } | null {
  const match = LEGACY_REFERENCE_SECTION_PATTERN.exec(section.trim());
  if (!match) return null;

  const values = match[2]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    values.length === 0 ||
    values.some((value) => !UUID_PATTERN.test(value))
  ) {
    return null;
  }

  const pluralKind = match[1].toLowerCase();
  const kind: TaskReferenceKind =
    pluralKind === "notes"
      ? "note"
      : pluralKind === "ideas"
        ? "idea"
        : "knowledge";

  return { kind, ids: values };
}

/** Split task tags into user-facing tags and internal relationship references. */
export function parseTaskLinkMetadata(
  tags: readonly string[] | null | undefined,
  description: string | null | undefined,
): TaskLinkMetadata {
  const userVisibleTags: string[] = [];
  const ids: ReferenceIdSets = {
    note: new Set<string>(),
    idea: new Set<string>(),
    knowledge: new Set<string>(),
  };

  for (const tag of tags ?? []) {
    const match = REFERENCE_TAG_PATTERN.exec(tag);
    if (!match || !UUID_PATTERN.test(match[2])) {
      userVisibleTags.push(tag);
      continue;
    }

    const [, kind, id] = match;
    addReferenceId(ids, kind as TaskReferenceKind, id);
  }

  for (const section of description?.split(/\r?\n[\t ]*\r?\n/) ?? []) {
    const referenceSection = parseLegacyReferenceSection(section);
    if (!referenceSection) continue;
    for (const id of referenceSection.ids) {
      addReferenceId(ids, referenceSection.kind, id);
    }
  }

  return {
    userVisibleTags,
    noteIds: [...ids.note],
    ideaIds: [...ids.idea],
    knowledgeIds: [...ids.knowledge],
  };
}

/** Remove legacy UUID-only relationship sections from a task description. */
export function stripTaskLinkMetadataSections(
  description: string | null | undefined,
): string | null {
  if (!description) return null;

  const userSections = description
    .split(/\r?\n[\t ]*\r?\n/)
    .map((section) => section.trim())
    .filter(
      (section) => section.length > 0 && !parseLegacyReferenceSection(section),
    );

  return userSections.length > 0 ? userSections.join("\n\n") : null;
}

function isMatchingReferenceTag(
  tag: string,
  kind: TaskReferenceKind,
  id: string,
): boolean {
  const match = REFERENCE_TAG_PATTERN.exec(tag);
  return Boolean(
    match &&
    match[1] === kind &&
    UUID_PATTERN.test(match[2]) &&
    match[2].toLowerCase() === id.toLowerCase(),
  );
}

/** Add a valid relationship reference without creating duplicate metadata. */
export function addTaskReferenceTag(
  tags: readonly string[] | null | undefined,
  kind: TaskReferenceKind,
  id: string,
): string[] {
  const existingTags = [...(tags ?? [])];
  if (!UUID_PATTERN.test(id)) return existingTags;
  if (existingTags.some((tag) => isMatchingReferenceTag(tag, kind, id))) {
    return existingTags;
  }
  return [...existingTags, `${kind}:${id.toLowerCase()}`];
}

/** Remove every matching relationship reference while preserving all other tags. */
export function removeTaskReferenceTag(
  tags: readonly string[] | null | undefined,
  kind: TaskReferenceKind,
  id: string,
): string[] {
  const existingTags = [...(tags ?? [])];
  if (!UUID_PATTERN.test(id)) return existingTags;
  return existingTags.filter((tag) => !isMatchingReferenceTag(tag, kind, id));
}
