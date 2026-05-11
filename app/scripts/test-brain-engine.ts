/**
 * Lightweight test runner for the Connected Brain Engine.
 *
 * Asserts:
 *   - taxonomy classifier produces canonical tags + life areas + values
 *   - explicit-edge generator produces FK-derived edges with status
 *     `confirmed` and confidence ≥ 0.95
 *   - taxonomy-edge generator materializes anchor nodes only when the
 *     cluster has 2+ members
 *   - dedup merges same-pair edges into the strongest one
 *   - rejected-evidence-hash filter drops a previously rejected
 *     suggestion on rebuild
 *
 * Usage (from app/):
 *   node --experimental-strip-types scripts/test-brain-engine.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed (details printed)
 */

import assert from "node:assert/strict";

import { classifyBrainNode } from "../src/lib/brain/taxonomy/classify-node.ts";
import { matchValueTag, matchTopic } from "../src/lib/brain/taxonomy/normalizers.ts";
import { buildBrainGraph } from "../src/lib/brain/relationship-engine/buildBrainGraph.ts";
import { generateExplicitEdges } from "../src/lib/brain/relationship-engine/generateExplicitEdges.ts";
import { generateTaxonomyEdges } from "../src/lib/brain/relationship-engine/generateTaxonomyEdges.ts";
import { dedupeBetweenSamePair } from "../src/lib/brain/relationship-engine/scoreEdge.ts";
import {
  buildFeatureIndex,
  featurizeAll,
} from "../src/lib/brain/relationship-engine/featurize.ts";
import { computeEvidenceHashSync } from "../src/lib/brain/evidenceHash.ts";
import { findOrphans } from "../src/lib/brain/orphans/findOrphans.ts";
import type { BrainEdge, BrainNode } from "../src/types/brain-graph.ts";

// ============================================================
// Tiny test harness
// ============================================================
let passed = 0;
let failed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r instanceof Promise) {
      r.then(
        () => {
          console.log(`  pass  ${name}`);
          passed += 1;
        },
        (err) => {
          failed += 1;
          console.error(`  FAIL  ${name}\n        ${(err as Error).message}`);
        },
      );
    } else {
      console.log(`  pass  ${name}`);
      passed += 1;
    }
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}\n        ${(err as Error).message}`);
  }
}

const USER_ID = "11111111-1111-1111-1111-111111111111";

function node(input: Partial<BrainNode> & {
  id: string;
  type: BrainNode["type"];
  title: string;
}): BrainNode {
  return {
    userId: USER_ID,
    importance: 0.5,
    ...input,
  } as BrainNode;
}

// ============================================================
// 1. Taxonomy classifier
// ============================================================

console.log("\nTaxonomy classifier");
test("recognises canonical AI music topic + music life area", () => {
  const draft: BrainNode = {
    id: "knowledge_card::a",
    userId: USER_ID,
    type: "knowledge_card",
    title: "Notes on AI Music education",
    summary: "Plans for the D Festival.",
    bodyText: "We should design AI music education for piano students.",
    tags: ["AI Music", "music education"],
  };
  const out = classifyBrainNode(draft);
  assert.ok(
    out.canonicalTags?.includes("ai-music"),
    "expected 'ai-music' canonical tag",
  );
  assert.ok(
    out.lifeAreas?.includes("music"),
    "expected music life area",
  );
});

test("isolates value tags from text body", () => {
  assert.equal(matchValueTag("Discipline"), "discipline");
  assert.equal(matchValueTag("freedom"), "freedom");
  assert.equal(matchValueTag("ai music"), undefined);
});

test("topic matcher resolves bilingual aliases", () => {
  assert.equal(matchTopic("人工智能"), "ai");
  assert.equal(matchTopic("music ed"), "music-education");
});

// ============================================================
// 2. Explicit edges
// ============================================================

console.log("\nExplicit edges");
test("task.project_id produces a confirmed part_of_project edge", () => {
  const projectNode = node({
    id: "project::p1",
    type: "project",
    title: "D Festival",
    sourceId: "p1",
  });
  const taskNode = node({
    id: "task::t1",
    type: "task",
    title: "Book venue",
    sourceId: "t1",
    metadata: { project_id: "p1" },
  });
  const edges = generateExplicitEdges({
    nodes: [projectNode, taskNode],
    userId: USER_ID,
  });
  assert.equal(edges.length, 1);
  const e = edges[0]!;
  assert.equal(e.type, "part_of_project");
  assert.equal(e.status, "confirmed");
  assert.ok(e.confidence >= 0.95, `confidence ${e.confidence} < 0.95`);
  assert.equal(e.sourceMethod, "explicit");
});

test("quote.linked_goal_id → inspired_by_quote", () => {
  const goal = node({
    id: "goal::g1",
    type: "goal",
    title: "Run a 10k",
    sourceId: "g1",
  });
  const quote = node({
    id: "quote::q1",
    type: "quote",
    title: "Discipline creates freedom",
    sourceId: "q1",
    metadata: { linked_goal_id: "g1" },
  });
  const edges = generateExplicitEdges({
    nodes: [goal, quote],
    userId: USER_ID,
  });
  assert.equal(edges.length, 1);
  assert.equal(edges[0]!.type, "inspired_by_quote");
});

// ============================================================
// 3. Taxonomy / anchor edges
// ============================================================

console.log("\nTaxonomy + anchor edges");
test("life_area anchor created when 2+ nodes share an area", () => {
  const a = classifyBrainNode(
    node({
      id: "knowledge_card::a",
      type: "knowledge_card",
      title: "AI Music thoughts",
      sourceId: "a",
      tags: ["ai music"],
    }),
  );
  const b = classifyBrainNode(
    node({
      id: "project::b",
      type: "project",
      title: "D Festival project",
      sourceId: "b",
      tags: ["d festival", "music"],
    }),
  );
  const features = featurizeAll([a, b]);
  const index = buildFeatureIndex(features);
  const out = generateTaxonomyEdges({
    nodes: [a, b],
    index,
    userId: USER_ID,
  });
  // At least one life-area anchor should appear (music, ai_product, …).
  assert.ok(
    out.anchorNodes.length >= 1,
    `expected at least 1 anchor, got ${out.anchorNodes.length}`,
  );
  assert.ok(
    out.edges.some((e) => e.type === "same_life_area"),
    "expected a same_life_area edge",
  );
});

test("anchor NOT created when only one node shares an area", () => {
  const a = classifyBrainNode(
    node({
      id: "knowledge_card::a",
      type: "knowledge_card",
      title: "Standalone note",
      sourceId: "a",
      tags: ["something unique zlx"],
    }),
  );
  const features = featurizeAll([a]);
  const index = buildFeatureIndex(features);
  const out = generateTaxonomyEdges({
    nodes: [a],
    index,
    userId: USER_ID,
  });
  assert.equal(out.anchorNodes.length, 0);
});

// ============================================================
// 4. Dedup
// ============================================================

console.log("\nDedup");
test("dedupeBetweenSamePair keeps the strongest edge", () => {
  const e1: BrainEdge = {
    id: "tagged_with::a::b",
    userId: USER_ID,
    sourceNodeId: "a",
    targetNodeId: "b",
    type: "tagged_with",
    strength: 0.4,
    confidence: 0.5,
    reason: "weak",
    sourceMethod: "tag",
    status: "confirmed",
  };
  const e2: BrainEdge = {
    id: "mentions::a::b",
    userId: USER_ID,
    sourceNodeId: "a",
    targetNodeId: "b",
    type: "mentions",
    strength: 0.85,
    confidence: 0.9,
    reason: "strong",
    sourceMethod: "entity",
    status: "confirmed",
  };
  const merged = dedupeBetweenSamePair([e1, e2]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.strength, 0.85);
  assert.equal(merged[0]!.reason, "strong");
});

// ============================================================
// 5. Rejected-evidence filter
// ============================================================

console.log("\nRejected-evidence filter");
test("rejected hash drops newly-generated suggestion (status: suggested)", () => {
  // The hash-rejection mechanism is meant for *newly-generated*
  // suggestions whose canonical evidence matches a previously rejected
  // entry. Confirmed FK edges and confirmed taxonomy edges always pass
  // through (they reflect user data); only `status: "suggested"` edges
  // get filtered by hash.
  const a = node({
    id: "goal::a",
    type: "goal",
    title: "Goal A",
    sourceId: "a",
  });
  const b = node({
    id: "task::b",
    type: "task",
    title: "Task B",
    sourceId: "b",
  });
  // Newly generated suggestion with no persistenceId.
  const newSuggestion: BrainEdge = {
    id: "semantic_similarity::goal::a::task::b",
    userId: USER_ID,
    sourceNodeId: "goal::a",
    targetNodeId: "task::b",
    type: "semantic_similarity",
    strength: 0.72,
    confidence: 0.72,
    reason: "engine-generated",
    sourceMethod: "embedding",
    status: "suggested",
    evidence: { semanticSimilarity: 0.72 },
  };
  const hash = computeEvidenceHashSync({
    sourceNodeId: newSuggestion.sourceNodeId,
    targetNodeId: newSuggestion.targetNodeId,
    relationshipType: newSuggestion.type,
    evidence: newSuggestion.evidence ?? null,
  });
  const filtered = buildBrainGraph({
    userId: USER_ID,
    nodes: [a, b],
    // Pass it through the same path as engine output: no persistenceId.
    persistedEdges: [newSuggestion],
    rejectedEvidenceHashes: new Set([hash]),
    options: { hideOrphanNodes: false, minStrength: 0 },
  });
  const stillThere = filtered.edges.some(
    (e) => e.type === "semantic_similarity",
  );
  assert.equal(stillThere, false, "rejected suggestion reappeared");
});

// ============================================================
// 6. Orphan finder
// ============================================================

console.log("\nOrphan finder");
test("findOrphans returns nodes with degree 0", () => {
  const a = node({
    id: "goal::a",
    type: "goal",
    title: "A connected goal",
    sourceId: "a",
  });
  const b = node({
    id: "task::b",
    type: "task",
    title: "B connected task",
    sourceId: "b",
    metadata: { project_id: "" },
  });
  const c = node({
    id: "memory::c",
    type: "memory",
    title: "C standalone memory",
    sourceId: "c",
  });
  const edges: BrainEdge[] = [
    {
      id: "explicit_link::goal::a::task::b",
      userId: USER_ID,
      sourceNodeId: "goal::a",
      targetNodeId: "task::b",
      type: "explicit_link",
      strength: 0.9,
      confidence: 0.95,
      reason: "test",
      sourceMethod: "explicit",
      status: "confirmed",
    },
  ];
  const { orphans } = findOrphans({ nodes: [a, b, c], edges });
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0]!.id, "memory::c");
});

// ============================================================
// Summary
// ============================================================

console.log("\n────────────────────────────────");
console.log(`  ${passed} passed, ${failed} failed`);
console.log("────────────────────────────────");
process.exit(failed === 0 ? 0 : 1);
