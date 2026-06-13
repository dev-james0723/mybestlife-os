import { describe, expect, it } from "vitest";
import { matchKnowledgeItems } from "@/lib/knowledgeMatching";
import {
  buildLifeAgentContextRetrievalDocuments,
  buildDocOracleRetrievalDocuments,
  buildKnowledgeRetrievalDocuments,
  chunkText,
} from "@/lib/retrieval/documents";
import { emptyLifeAgentContextSources } from "@/lib/life-agent/context-fetchers";
import { sanitizeRetrievalCitations } from "@/lib/retrieval/citations";
import { hybridScore } from "@/lib/retrieval/rank";
import { runAskKbRetrieval } from "@/lib/retrieval/service";
import { resolveAskKbRetrievalScope } from "@/lib/retrieval/scope";
import type { KnowledgeItem } from "@/types/knowledge";
import type { LifeAgentPermission } from "@/types/life-agent";
import type {
  RetrievalResult,
  RetrievalSourceDomain,
} from "@/lib/retrieval/types";

function item(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: overrides.id ?? "item-1",
    userId: "user-1",
    title: "Untitled",
    contentType: "article",
    aiTags: [],
    manualTags: [],
    aiKeyInsights: [],
    aiKeyQuotes: [],
    aiQuestionsAnswered: [],
    aiActionItems: [],
    aiVideoChatStarters: [],
    status: "ready",
    dateAdded: "2026-06-01T00:00:00.000Z",
    dateModified: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function permission(
  domain: LifeAgentPermission["domain"],
  access_level: LifeAgentPermission["access_level"],
): LifeAgentPermission {
  return {
    id: `${domain}-${access_level}`,
    user_id: "user-1",
    domain,
    access_level,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };
}

describe("Ask My Knowledge Base retrieval", () => {
  it("preserves deterministic matcher ranking behavior", () => {
    const results = matchKnowledgeItems(
      [
        item({
          id: "stripe",
          title: "Stripe checkout implementation notes",
          aiTags: ["payments", "checkout"],
          aiSummary: "SaaS billing and Stripe checkout UX.",
        }),
        item({
          id: "design",
          title: "Landing page visual references",
          aiTags: ["design"],
          aiSummary: "Hero layout and typography.",
        }),
      ],
      "stripe checkout billing",
      [],
    );

    expect(results[0]?.item.id).toBe("stripe");
    expect(results[0]?.normalizedScore).toBeGreaterThan(results[1]?.normalizedScore ?? 0);
  });

  it("builds stable retrieval chunks and hashes", () => {
    const rawContent = Array.from({ length: 220 }, (_, i) => `Paragraph ${i} about retrieval.`).join(
      "\n\n",
    );
    const source = item({
      id: "doc-1",
      title: "Retrieval design",
      aiSummary: "A shared index for Ask My Knowledge Base.",
      rawContent,
      manualTags: ["retrieval"],
    });

    const first = buildKnowledgeRetrievalDocuments({ userId: "user-1", item: source });
    const second = buildKnowledgeRetrievalDocuments({ userId: "user-1", item: source });

    expect(chunkText(rawContent).length).toBeGreaterThan(1);
    expect(first.map((doc) => doc.content_hash)).toEqual(
      second.map((doc) => doc.content_hash),
    );
    expect(first.some((doc) => doc.document_kind === "knowledge_raw_content")).toBe(true);
  });

  it("builds Doc Oracle retrieval documents beyond raw chunks", () => {
    const source = item({
      id: "doc-oracle-1",
      title: "Doc Oracle strategy PDF",
      sourceUrl: "https://example.com/strategy.pdf",
    });

    const docs = buildDocOracleRetrievalDocuments({
      userId: "user-1",
      item: source,
      analyses: [
        {
          id: "analysis-1",
          document_id: source.id,
          document_title: "Strategy PDF",
          summary: "A document about retrieval, citations, and project plans.",
          status: "completed",
        },
      ],
      pages: [
        {
          id: "page-1",
          document_id: source.id,
          analysis_id: "analysis-1",
          page_number: 3,
          page_summary: "The retrieval plan introduces cited answer cards.",
          keywords: ["retrieval", "citations"],
        },
      ],
      sections: [
        {
          id: "section-1",
          document_id: source.id,
          analysis_id: "analysis-1",
          title: "Implementation roadmap",
          page_start: 3,
          page_end: 5,
          summary: "The section describes the implementation sequence.",
        },
      ],
      visualAssets: [
        {
          id: "visual-1",
          document_id: source.id,
          analysis_id: "analysis-1",
          source_page_number: 4,
          title: "Retrieval architecture diagram",
          description: "A diagram linking Ask My Knowledge Base to cited knowledge.",
          retrieval_tags: ["architecture", "ask-kb"],
        },
      ],
    });

    expect(docs.map((doc) => doc.document_kind)).toEqual(
      expect.arrayContaining([
        "doc_oracle_analysis_summary",
        "doc_oracle_page",
        "doc_oracle_section",
        "doc_oracle_visual",
      ]),
    );
    expect(docs.every((doc) => doc.source_domain === "doc_oracle")).toBe(true);
    expect(docs.find((doc) => doc.document_kind === "doc_oracle_page")?.page_number).toBe(3);
  });

  it("builds cross-OS retrieval documents for readable context sources", () => {
    const sources = emptyLifeAgentContextSources();
    sources.projects = [
      {
        id: "project-1",
        user_id: "user-1",
        name: "Ask My Knowledge Base upgrade",
        description: "Cited semantic retrieval across Life OS domains.",
        status: "active",
        priority: "high",
        start_date: null,
        end_date: null,
        color: null,
        tags: ["retrieval"],
        thumbnail_url: null,
        thumbnail_style: null,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
      },
    ];

    const docs = buildLifeAgentContextRetrievalDocuments({
      userId: "user-1",
      sources,
      sourceDomains: new Set<RetrievalSourceDomain>(["projects"]),
    });

    expect(docs).toHaveLength(1);
    expect(docs[0]?.source_domain).toBe("projects");
    expect(docs[0]?.source_table).toBe("projects");
    expect(docs[0]?.body).toContain("Cited semantic retrieval");
    expect(docs[0]?.content_hash).toHaveLength(64);
  });

  it("blends semantic, metadata, recency, and connection scores", () => {
    const score = hybridScore({
      semanticScore: 0.8,
      metadataScore: 60,
      recencyScore: 0.5,
      connectionScore: 0.25,
    });

    expect(score.semantic).toBe(0.8);
    expect(score.metadata).toBe(0.6);
    expect(score.combined).toBeGreaterThan(0.65);
    expect(score.combined).toBeLessThan(0.7);
  });

  it("includes readable domains and excludes ask-every-time domains without a session grant", () => {
    const scope = resolveAskKbRetrievalScope({
      userId: "user-1",
      permissionRows: [
        permission("projects", "read_only"),
        permission("journal", "ask_every_time"),
        permission("finance", "off"),
      ],
      requestedSourceDomains: ["knowledge", "projects", "journal", "finance"],
      sessionGrantedDomains: [],
    });

    expect(scope.sourceDomains).toContain("knowledge");
    expect(scope.sourceDomains).toContain("projects");
    expect(scope.sourceDomains).not.toContain("journal");
    expect(scope.sourceDomains).not.toContain("finance");
    expect(scope.excludedSourceDomains).toEqual(["journal", "finance"]);
  });

  it("does not return Knowledge keyword fallback when scope excludes Knowledge", async () => {
    const fakeSupabase = {
      from: () => ({
        select: () => ({
          eq: async () => ({
            data: [permission("projects", "read_only")],
            error: null,
          }),
        }),
      }),
    };

    const run = await runAskKbRetrieval({
      supabase: fakeSupabase as never,
      userId: "user-1",
      query: "stripe checkout billing",
      mode: "keyword",
      sourceDomains: ["projects"],
      items: [
        item({
          id: "stripe",
          title: "Stripe checkout implementation notes",
          aiTags: ["payments", "checkout"],
          aiSummary: "SaaS billing and Stripe checkout UX.",
        }),
      ],
      smartCollections: [],
      connections: [],
      persistRun: false,
    });

    expect(run.scope.sourceDomains).toEqual(["projects"]);
    expect(run.results).toHaveLength(0);
    expect(run.warnings).toContain("keyword_retrieval_scope_excludes_knowledge");
  });

  it("rejects citations that are not present in retrieved knowledge", () => {
    const evidence: RetrievalResult[] = [
      {
        id: "R1",
        retrievalDocumentId: "doc-1",
        knowledgeItemId: "item-1",
        sourceDomain: "knowledge",
        sourceTable: "knowledge_items",
        sourceId: "item-1",
        documentKind: "knowledge_summary",
        chunkIndex: 0,
        title: "Grounded source",
        snippet: "This source says retrieval must cite evidence.",
        bodyPreview: "This source says retrieval must cite evidence.",
        sourceUrl: null,
        sourceMetadata: {},
        pageNumber: null,
        sectionPath: null,
        tags: [],
        scores: {
          combined: 0.9,
          semantic: 0.9,
          metadata: 0,
          recency: 0,
          connection: 0,
        },
        whyMatched: ["Semantic similarity 90%."],
        createdAt: null,
        updatedAt: null,
      },
    ];

    const citations = sanitizeRetrievalCitations(
      [
        { resultId: "R1", quote: "retrieval must cite evidence" },
        { resultId: "R2", quote: "missing source" },
        { resultId: "R1", quote: "a fabricated sentence that is not in the source" },
      ],
      evidence,
    );

    expect(citations).toHaveLength(1);
    expect(citations[0]?.resultId).toBe("R1");
  });
});
