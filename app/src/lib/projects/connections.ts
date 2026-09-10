/** Relationship semantics are independent of viewport layout and project filters. */
export const CONNECTION_KINDS = ["related", "depends-on", "blocks", "parent-child"] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];
export interface ConnectionInput {
  source_id: string;
  target_id: string;
  kind: ConnectionKind;
}
export interface ProjectConnection extends ConnectionInput {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
export interface MapRelation {
  id: string;
  source: string;
  target: string;
  kind: ConnectionKind | "shared-idea";
  record?: ProjectConnection;
  ideaIds: string[];
}
export type ConnectionError = "different" | "missing" | "duplicate" | "cycle";

export function canonicalConnection(input: ConnectionInput): ConnectionInput {
  if (input.kind === "related" && input.source_id > input.target_id) {
    return { kind: input.kind, source_id: input.target_id, target_id: input.source_id };
  }
  return { kind: input.kind, source_id: input.source_id, target_id: input.target_id };
}

/** Dependencies point to prerequisites. For cycle detection reverse them to execution order. */
function orderedPair(edge: ConnectionInput): [string, string] {
  return edge.kind === "depends-on"
    ? [edge.target_id, edge.source_id]
    : [edge.source_id, edge.target_id];
}

export function validateConnection(
  input: ConnectionInput,
  edges: readonly ProjectConnection[],
  projectIds: ReadonlySet<string>,
  editingId?: string,
): ConnectionError | null {
  if (!input.source_id || !input.target_id || input.source_id === input.target_id) return "different";
  if (!projectIds.has(input.source_id) || !projectIds.has(input.target_id)) return "missing";
  const candidate = canonicalConnection(input);
  const others = edges.filter((edge) => edge.id !== editingId);
  if (others.some((edge) => {
    const other = canonicalConnection(edge);
    return other.kind === candidate.kind && other.source_id === candidate.source_id && other.target_id === candidate.target_id;
  })) return "duplicate";
  if (candidate.kind === "related") return null;

  const hierarchy = candidate.kind === "parent-child";
  const adjacency = new Map<string, string[]>();
  for (const edge of others) {
    if (hierarchy ? edge.kind !== "parent-child" : !["blocks", "depends-on"].includes(edge.kind)) continue;
    const [from, to] = orderedPair(edge);
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  }
  const [from, to] = orderedPair(candidate);
  const pending = [to];
  const seen = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === from) return "cycle";
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...(adjacency.get(current) ?? []));
  }
  return null;
}

export function buildRelations(
  records: readonly ProjectConnection[],
  ideas: readonly { id: string; linked_project_ids?: string[] | null }[],
  projectIds: ReadonlySet<string>,
): MapRelation[] {
  const manual: MapRelation[] = records
    .filter((record) => projectIds.has(record.source_id) && projectIds.has(record.target_id))
    .map((record) => ({ id: record.id, source: record.source_id, target: record.target_id, kind: record.kind, record, ideaIds: [] }));
  const derived = new Map<string, MapRelation>();
  for (const idea of ideas) {
    const ids = [...new Set(idea.linked_project_ids ?? [])].filter((id) => projectIds.has(id)).sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id = `idea:${ids[i]}:${ids[j]}`;
        const edge = derived.get(id) ?? { id, source: ids[i], target: ids[j], kind: "shared-idea" as const, ideaIds: [] };
        if (!edge.ideaIds.includes(idea.id)) edge.ideaIds.push(idea.id);
        derived.set(id, edge);
      }
    }
  }
  return [...manual, ...derived.values()];
}

export function neighborhood(edges: readonly MapRelation[], id: string): Set<string> {
  const result = new Set([id]);
  for (const edge of edges) {
    if (edge.source === id) result.add(edge.target);
    if (edge.target === id) result.add(edge.source);
  }
  return result;
}

/** Separate multiple relationship types (including opposite directions) between a pair. */
export function relationshipLanes(edges: readonly MapRelation[]): Map<string, number> {
  const groups = new Map<string, MapRelation[]>();
  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join(":");
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  const result = new Map<string, number>();
  for (const group of groups.values()) {
    group.sort((a, b) => a.id.localeCompare(b.id));
    group.forEach((edge, index) => result.set(edge.id, (index - (group.length - 1) / 2) * 58));
  }
  return result;
}

export function parseConnection(value: unknown): ProjectConnection {
  if (!value || typeof value !== "object") throw new Error("Invalid connection response");
  const row = value as Record<string, unknown>;
  for (const key of ["id", "user_id", "source_id", "target_id", "created_at", "updated_at"]) {
    if (typeof row[key] !== "string" || !row[key]) throw new Error(`Invalid connection ${key}`);
  }
  if (!CONNECTION_KINDS.includes(row.kind as ConnectionKind)) throw new Error("Invalid connection kind");
  return row as unknown as ProjectConnection;
}
