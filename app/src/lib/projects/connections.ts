export const CONNECTION_KINDS = ["related", "depends-on", "blocks", "contains"] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];
export type ConnectionDraft = { source_id: string; target_id: string; kind: ConnectionKind };
export type ProjectConnection = ConnectionDraft & {
  id: string; user_id: string; version: number; created_at: string; updated_at: string; deleted_at: string | null;
};
export type ConnectionProblem = "invalid" | "duplicate" | "cycle" | "conflict" | "forbidden" | "unavailable" | "failed";
export class ProjectConnectionError extends Error {
  constructor(public readonly problem: ConnectionProblem) { super(`project_connection:${problem}`); this.name = "ProjectConnectionError"; }
}
export type ProjectMapEdge = {
  id: string; source: string; target: string; kind: ConnectionKind | "shared-idea";
  record?: ProjectConnection; ideaIds?: string[];
};
export function connectionPair(a: string, b: string): string { return JSON.stringify([a, b].sort()); }
export function canonicalConnection(draft: ConnectionDraft): ConnectionDraft {
  return draft.kind === "related" && draft.source_id > draft.target_id
    ? { ...draft, source_id: draft.target_id, target_id: draft.source_id } : { ...draft };
}
/** Dependency arcs express prerequisite -> dependent, not display-arrow direction. */
function arc(draft: ConnectionDraft): [string, string] {
  return draft.kind === "depends-on" ? [draft.target_id, draft.source_id] : [draft.source_id, draft.target_id];
}
export function validateConnection(draft: ConnectionDraft, rows: readonly ProjectConnection[], knownIds: ReadonlySet<string>, ignoreId?: string): ConnectionProblem | null {
  if (!(CONNECTION_KINDS as readonly string[]).includes(draft.kind) || !knownIds.has(draft.source_id) || !knownIds.has(draft.target_id) || draft.source_id === draft.target_id) return "invalid";
  const active = rows.filter((row) => !row.deleted_at && row.id !== ignoreId);
  // v1 intentionally supports one manual relationship per unordered pair. Shared
  // ideas remain independent, derived evidence, not duplicate manual links.
  if (active.some((row) => connectionPair(row.source_id, row.target_id) === connectionPair(draft.source_id, draft.target_id))) return "duplicate";
  if (draft.kind === "related") return null;
  const [from, to] = arc(draft);
  const adjacency = new Map<string, string[]>();
  for (const row of active) {
    const sameGraph = draft.kind === "contains" ? row.kind === "contains" : row.kind === "depends-on" || row.kind === "blocks";
    if (!sameGraph) continue;
    const [a, b] = arc(row); adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
  }
  const pending = [to]; const visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === from) return "cycle";
    if (visited.has(id)) continue;
    visited.add(id); pending.push(...(adjacency.get(id) ?? []));
  }
  return null;
}
export function projectNeighborhood(id: string, edges: readonly ProjectMapEdge[]): Set<string> {
  const result = new Set([id]);
  for (const edge of edges) { if (edge.source === id) result.add(edge.target); if (edge.target === id) result.add(edge.source); }
  return result;
}
export function buildProjectMapEdges(rows: readonly ProjectConnection[], ideas: readonly { id: string; linked_project_ids?: string[] | null }[], knownIds: ReadonlySet<string>): ProjectMapEdge[] {
  const result: ProjectMapEdge[] = rows.filter((row) => !row.deleted_at && knownIds.has(row.source_id) && knownIds.has(row.target_id)).map((row) => ({ id: row.id, source: row.source_id, target: row.target_id, kind: row.kind, record: row }));
  const shared = new Map<string, ProjectMapEdge>();
  for (const idea of ideas) {
    const ids = [...new Set(idea.linked_project_ids ?? [])].filter((id) => knownIds.has(id)).sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const id = `idea:${connectionPair(ids[i], ids[j])}`;
      const edge = shared.get(id) ?? { id, source: ids[i], target: ids[j], kind: "shared-idea" as const, ideaIds: [] };
      if (!edge.ideaIds!.includes(idea.id)) edge.ideaIds!.push(idea.id);
      shared.set(id, edge);
    }
  }
  return [...result, ...shared.values()];
}
