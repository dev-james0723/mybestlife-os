import { describe, expect, it } from "vitest";
import { buildProjectMapEdges, canonicalConnection, connectionPair, projectNeighborhood, validateConnection, type ConnectionDraft, type ProjectConnection } from "./connections";

const ids = new Set(["a", "b", "c", "d"]);
const draft = (source_id: string, target_id: string, kind: ConnectionDraft["kind"] = "related"): ConnectionDraft => ({ source_id, target_id, kind });
const row = (source: string, target: string, kind: ConnectionDraft["kind"] = "related", id = `${source}-${target}`): ProjectConnection => ({ ...draft(source, target, kind), id, user_id: "owner", version: 1, deleted_at: null, created_at: "2026-09-10", updated_at: "2026-09-10" });
describe("project connection validation", () => {
  it("allows a meaningful unrelated pair", () => expect(validateConnection(draft("a", "b"), [], ids)).toBeNull());
  it("rejects self-links", () => expect(validateConnection(draft("a", "a"), [], ids)).toBe("invalid"));
  it("rejects unknown or inaccessible endpoints", () => expect(validateConnection(draft("a", "foreign"), [], ids)).toBe("invalid"));
  it("rejects unsupported types", () => expect(validateConnection({ ...draft("a", "b"), kind: "invented" as ConnectionDraft["kind"] }, [], ids)).toBe("invalid"));
  it("canonicalizes related links", () => expect(canonicalConnection(draft("b", "a"))).toEqual(draft("a", "b")));
  it("never reverses dependency meaning", () => expect(canonicalConnection(draft("b", "a", "depends-on"))).toEqual(draft("b", "a", "depends-on")));
  it("uses a symmetric pair key", () => expect(connectionPair("b", "a")).toBe(connectionPair("a", "b")));
  it("rejects reverse duplicates", () => expect(validateConnection(draft("b", "a"), [row("a", "b")], ids)).toBe("duplicate"));
  it("requires editing instead of stacking manual types", () => expect(validateConnection(draft("a", "b", "blocks"), [row("a", "b")], ids)).toBe("duplicate"));
  it("allows editing the current record", () => expect(validateConnection(draft("a", "b", "blocks"), [row("a", "b")], ids, "a-b")).toBeNull());
  it("ignores deleted links", () => expect(validateConnection(draft("a", "b"), [{ ...row("a", "b"), deleted_at: "2026-09-10" }], ids)).toBeNull());
  it("rejects a three-node hierarchy cycle", () => expect(validateConnection(draft("c", "a", "contains"), [row("a", "b", "contains"), row("b", "c", "contains")], ids)).toBe("cycle"));
  it("rejects a dependency cycle", () => expect(validateConnection(draft("c", "a", "depends-on"), [row("a", "b", "depends-on"), row("b", "c", "depends-on")], ids)).toBe("cycle"));
  it("normalizes mixed prerequisite and blocking arcs", () => expect(validateConnection(draft("a", "c", "blocks"), [row("a", "b", "depends-on"), row("b", "c", "depends-on")], ids)).toBe("cycle"));
  it("does not conflate containment with dependencies", () => expect(validateConnection(draft("c", "a", "depends-on"), [row("a", "b", "contains"), row("b", "c", "contains")], ids)).toBeNull());
  it("does not make undirected related edges into prerequisites", () => expect(validateConnection(draft("c", "a", "depends-on"), [row("a", "b"), row("b", "c")], ids)).toBeNull());
  it("allows acyclic mixed direction", () => expect(validateConnection(draft("c", "a", "blocks"), [row("a", "b", "depends-on"), row("b", "c", "depends-on")], ids)).toBeNull());
});
describe("projection and filtered map", () => {
  it("aggregates shared ideas without duplicate endpoints or self-links", () => {
    const result = buildProjectMapEdges([], [{ id: "i", linked_project_ids: ["b", "a", "a", "missing"] }, { id: "j", linked_project_ids: ["a", "b"] }], ids);
    expect(result).toHaveLength(1); expect(result[0].ideaIds).toEqual(["i", "j"]); expect(result[0].record).toBeUndefined();
  });
  it("keeps manual and derived evidence distinct", () => expect(buildProjectMapEdges([row("a", "b")], [{ id: "i", linked_project_ids: ["a", "b"] }], ids)).toHaveLength(2));
  it("excludes deleted and inaccessible endpoints", () => expect(buildProjectMapEdges([row("a", "foreign"), { ...row("a", "b"), deleted_at: "now" }], [], ids)).toHaveLength(0));
  it("selects immediate neighbors, not the entire component", () => {
    const edges = buildProjectMapEdges([row("a", "b"), row("b", "c")], [], ids);
    expect([...projectNeighborhood("a", edges)].sort()).toEqual(["a", "b"]);
  });
  it("retains isolated selections", () => expect([...projectNeighborhood("d", [])]).toEqual(["d"]));
  it("does not mutate saved rows while filtering", () => {
    const rows = [row("a", "b")]; buildProjectMapEdges(rows, [], new Set(["a"])); expect(rows).toHaveLength(1);
  });
});
