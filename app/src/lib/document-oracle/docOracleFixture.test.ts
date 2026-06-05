import { describe, expect, it } from "vitest";
import {
  DOC_ORACLE_FIXTURE_ASSET_PREFIX,
  DOC_ORACLE_FIXTURE_DOCUMENT_ID,
  DOC_ORACLE_FIXTURE_ROUTE_ID,
  getDocOracleFixtureAsset,
  getDocOracleFixtureData,
  getDocOracleFixtureMindMap,
  isDocOracleFixtureId,
} from "@/lib/document-oracle/docOracleFixture";

describe("Doc Oracle local fixture", () => {
  it("recognizes the route alias and stable document id", () => {
    expect(isDocOracleFixtureId(DOC_ORACLE_FIXTURE_ROUTE_ID)).toBe(true);
    expect(isDocOracleFixtureId(DOC_ORACLE_FIXTURE_DOCUMENT_ID)).toBe(true);
    expect(isDocOracleFixtureId("not-a-fixture")).toBe(false);
  });

  it("builds completed Supabase-shaped Doc Oracle rows", () => {
    const data = getDocOracleFixtureData("user-1");

    expect(data.item.id).toBe(DOC_ORACLE_FIXTURE_DOCUMENT_ID);
    expect(data.item.userId).toBe("user-1");
    expect(data.item.contentType).toBe("file");
    expect(data.item.filePath).toBe(`${DOC_ORACLE_FIXTURE_ASSET_PREFIX}source.pdf`);
    expect(data.analysis.status).toBe("completed");
    expect(data.analysis.parser).toBe("mineru");
    expect(data.pages).toHaveLength(8);
    expect(data.sections.length).toBeGreaterThanOrEqual(6);
    expect(data.glossary.length).toBeGreaterThanOrEqual(5);
    expect(data.visuals.length).toBeGreaterThanOrEqual(4);
    expect(data.chunkCount).toBe(data.chunks.length);
    expect(data.suggestedQuestionCategories.length).toBeGreaterThan(0);

    for (const page of data.pages) {
      expect(page.rendered_image_path).toMatch(/^doc-oracle-fixture\/page-\d+\.svg$/);
      expect(Array.isArray(page.keywords)).toBe(true);
      expect(Array.isArray(page.linked_sections)).toBe(true);
      expect(typeof page.has_visual_assets).toBe("boolean");
    }

    for (const visual of data.visuals) {
      expect(visual.image_path).toMatch(/^doc-oracle-fixture\/visual-/);
      expect(Array.isArray(visual.retrieval_tags)).toBe(true);
      expect(Array.isArray(visual.related_sections)).toBe(true);
    }
  });

  it("builds a connected mind map fixture", () => {
    const mindMap = getDocOracleFixtureMindMap();
    const nodeIds = new Set(mindMap.nodes.map((node) => node.id));

    expect(mindMap.status).toBe("ready");
    expect(mindMap.nodes.length).toBeGreaterThan(1);
    expect(mindMap.edges.length).toBeGreaterThan(0);
    for (const edge of mindMap.edges) {
      expect(nodeIds.has(edge.source_node_id)).toBe(true);
      expect(nodeIds.has(edge.target_node_id)).toBe(true);
    }
  });

  it("serves local fixture assets without Supabase Storage", () => {
    const svg = getDocOracleFixtureAsset("visual-matrix.svg");
    const pdf = getDocOracleFixtureAsset("source.pdf");
    const wav = getDocOracleFixtureAsset("silence.wav");

    expect(svg?.contentType).toBe("image/svg+xml");
    expect(String(svg?.body)).toContain("<svg");
    expect(pdf?.contentType).toBe("application/pdf");
    expect(String(pdf?.body)).toContain("%PDF-1.4");
    expect(wav?.contentType).toBe("audio/wav");
    expect(wav?.body).toBeInstanceOf(Uint8Array);
  });
});
