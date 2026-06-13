import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import type {
  DocOracleAnalysis,
  DocOracleGlossaryRow,
  DocOracleSectionRow,
} from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { MindMapDbEdge, MindMapDbNode } from "@/lib/document-brain/mind-map/mindMapTypes";
import {
  buildCategorizedSuggestedQuestions,
  buildLegacyFallbackPrompts,
  type SuggestedQuestionCategory,
} from "@/lib/document-brain/suggested-questions";
import type { KnowledgeItem } from "@/types/knowledge";

export const DOC_ORACLE_FIXTURE_ROUTE_ID = "doc-oracle-fixture";
export const DOC_ORACLE_FIXTURE_DOCUMENT_ID = "00000000-0000-4000-8000-00000000d0c0";
export const DOC_ORACLE_FIXTURE_ANALYSIS_ID = "00000000-0000-4000-8000-00000000d0ca";
export const DOC_ORACLE_FIXTURE_CHAT_SESSION_ID = "00000000-0000-4000-8000-00000000d0cc";
export const DOC_ORACLE_FIXTURE_ASSET_PREFIX = "doc-oracle-fixture/";

const FIXTURE_NOW = "2026-06-05T09:00:00.000Z";
const DEFAULT_FIXTURE_USER_ID = "00000000-0000-4000-8000-000000000001";

function fixtureUuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

export function isDocOracleFixtureEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.DOC_ORACLE_FIXTURE_ENABLED === "true";
}

export function isDocOracleFixtureId(documentId: string | null | undefined): boolean {
  return documentId === DOC_ORACLE_FIXTURE_ROUTE_ID || documentId === DOC_ORACLE_FIXTURE_DOCUMENT_ID;
}

function fixtureAssetPath(assetId: string): string {
  return `${DOC_ORACLE_FIXTURE_ASSET_PREFIX}${assetId}`;
}

const sectionIds = {
  root: fixtureUuid(0xd010),
  goals: fixtureUuid(0xd011),
  structure: fixtureUuid(0xd012),
  mobile: fixtureUuid(0xd013),
  evidence: fixtureUuid(0xd014),
  qa: fixtureUuid(0xd015),
};

const visualIds = {
  journey: fixtureUuid(0xd101),
  matrix: fixtureUuid(0xd102),
  mobile: fixtureUuid(0xd103),
  states: fixtureUuid(0xd104),
};

const chunkIds = [fixtureUuid(0xd201), fixtureUuid(0xd202), fixtureUuid(0xd203), fixtureUuid(0xd204)];

function pageRow(input: Omit<DocOraclePageRow, "id" | "rendered_image_path" | "rendered_image_url" | "source_pdf_page_ref">): DocOraclePageRow {
  return {
    ...input,
    id: fixtureUuid(0xd300 + input.page_number),
    rendered_image_path: fixtureAssetPath(`page-${input.page_number}.svg`),
    rendered_image_url: null,
    source_pdf_page_ref: `fixture://doc-oracle/page-${input.page_number}`,
  };
}

function fixtureMarkdownPage(title: string, body: string): string {
  return `# ${title}\n\n${body.trim()}\n`;
}

function buildFixtureItem(userId: string): KnowledgeItem {
  return {
    id: DOC_ORACLE_FIXTURE_DOCUMENT_ID,
    userId,
    title: "Doc Oracle redesign QA fixture",
    isFavorite: false,
    contentType: "file",
    filePath: fixtureAssetPath("source.pdf"),
    aiTldr: "Local Doc Oracle fixture with completed analysis, pages, sections, visuals, glossary, and chat data.",
    aiSummary:
      "A synthetic but schema-faithful document analysis used to verify the Doc Oracle redesign without a live authenticated upload.",
    aiContentOverview:
      "The fixture mirrors the normalized Doc Oracle tables produced by MinerU: a root analysis, page rows, section outline, glossary terms, visual assets, chunks, and generated panel data.",
    aiTags: ["doc-oracle", "fixture", "qa", "redesign"],
    manualTags: ["local-fixture"],
    aiKeyInsights: [
      "The overview should render a completed analysis with dense but readable summary content.",
      "Tabs should have enough page, section, glossary, visual, chat, mind map, infographic, and audio data for screenshot QA.",
      "No production Supabase rows or Storage objects are required.",
    ],
    aiKeyQuotes: [
      "Fixture data must never be described as real execution.",
      "Every visible row follows the Doc Oracle table contracts.",
    ],
    aiQuestionsAnswered: [
      "Can the redesign render without a live document?",
      "Do client panels handle structured data across all tabs?",
      "Can local QA capture visual evidence safely?",
    ],
    aiActionItems: [
      "Open the fixture URL in local development.",
      "Verify overview, pages, sections, visuals, chat, mind map, infographic, and audio tabs.",
      "Keep fixture changes local and synthetic.",
    ],
    rawContent:
      "Local QA fixture for Doc Oracle. This synthetic document describes goals, information architecture, mobile interaction, evidence displays, and validation checklist for the redesign.",
    aiVideoChatStarters: [],
    status: "ready",
    dateAdded: FIXTURE_NOW,
    dateModified: FIXTURE_NOW,
    sourceType: "file_upload",
    provider: "local",
    label: "Fixture PDF",
    category: "file",
    sourceMetadata: {
      providerName: "Local Fixture",
      contentKind: "unknown",
      rawProviderPayload: {
        filename: "doc-oracle-redesign-fixture.pdf",
        mimeType: "application/pdf",
        fixture: true,
      },
    },
    extractionStatus: "success",
    transcriptStatus: "not_applicable",
    askEnabled: true,
    titleSource: "generated",
    generatedTitle: "Doc Oracle redesign QA fixture",
    renderMode: "metadata_preview",
    previewStatus: "metadata_success",
    checkedAt: FIXTURE_NOW,
  };
}

function buildFixtureAnalysis(): DocOracleAnalysis {
  return {
    id: DOC_ORACLE_FIXTURE_ANALYSIS_ID,
    document_title: "Doc Oracle redesign QA fixture",
    summary:
      "This local fixture represents a completed Doc Oracle analysis for a synthetic product-design document. It covers the redesign goals, content hierarchy, mobile navigation, visual evidence surfaces, grounded answer behavior, and validation checklist.\n\nThe fixture deliberately includes a mix of page types: cover, table of contents, narrative pages, a table-heavy architecture page, visual-heavy evidence pages, and a final QA checklist. It also includes glossary terms, section relationships, page thumbnails, visual assets, chat history, mind map nodes, infographic focus options, and audio-summary focus options.\n\nUse this document only for local visual QA. It is not a live authenticated upload, does not claim to prove production extraction quality, and should not be inserted into Supabase. Its purpose is to make the current Doc Oracle redesign easy to open, screenshot, and inspect even when the dev-bypass account has no knowledge documents.",
    total_pages: 8,
    parser: "mineru",
    parser_version: "fixture-qa-1",
    status: "completed",
    document_type: "product_design_spec",
    language: "en",
  };
}

function buildFixtureSections(): DocOracleSectionRow[] {
  return [
    {
      id: sectionIds.root,
      title: "Redesign goals and document scope",
      level: 1,
      parent_id: null,
      page_start: 1,
      page_end: 2,
      summary: "Defines the fixture purpose, expected QA coverage, and the non-live execution state.",
      keywords: ["fixture", "scope", "local QA", "execution state"],
      representative_pages: [1, 2],
    },
    {
      id: sectionIds.goals,
      title: "Reader problems and design priorities",
      level: 1,
      parent_id: null,
      page_start: 3,
      page_end: 3,
      summary: "Captures the core Doc Oracle redesign problems: duplicated summary, heavy tabs, and poor mobile scanning.",
      keywords: ["reader problems", "summary", "mobile", "scanability"],
      representative_pages: [3],
    },
    {
      id: sectionIds.structure,
      title: "Information architecture and tab contracts",
      level: 1,
      parent_id: null,
      page_start: 4,
      page_end: 4,
      summary: "Maps each UI tab to the Supabase row families that feed it.",
      keywords: ["information architecture", "tabs", "document_pages", "document_sections"],
      representative_pages: [4],
    },
    {
      id: sectionIds.mobile,
      title: "Mobile workspace interaction model",
      level: 1,
      parent_id: null,
      page_start: 5,
      page_end: 5,
      summary: "Describes the compact navigation, sticky composer, and reduced repeated headers.",
      keywords: ["mobile", "navigation", "composer", "safe area"],
      representative_pages: [5],
    },
    {
      id: sectionIds.evidence,
      title: "Grounded evidence and visual intelligence",
      level: 1,
      parent_id: null,
      page_start: 6,
      page_end: 7,
      summary: "Explains citations, page anchors, visual cards, and grounded chat answers.",
      keywords: ["citations", "visual assets", "chunks", "grounding"],
      representative_pages: [6, 7],
    },
    {
      id: sectionIds.qa,
      title: "Local validation checklist",
      level: 1,
      parent_id: null,
      page_start: 8,
      page_end: 8,
      summary: "Lists the checks required before calling the redesign visually verified.",
      keywords: ["validation", "screenshots", "fixture", "risk"],
      representative_pages: [8],
    },
  ];
}

function buildFixturePages(): DocOraclePageRow[] {
  return [
    pageRow({
      page_number: 1,
      page_label: "Cover",
      page_type: "cover",
      raw_text: "Doc Oracle redesign QA fixture. Local synthetic document for visual verification.",
      markdown: fixtureMarkdownPage(
        "Doc Oracle redesign QA fixture",
        "A safe local document that mirrors the normalized Doc Oracle data shape. It exists so the redesign can be opened without a live authenticated upload.\n\nKey signals: completed analysis, eight pages, six sections, glossary terms, visual assets, chat history, mind map data, and generation focus options.",
      ),
      page_summary: "Cover page introducing the local QA fixture and its execution state.",
      interpreted_page_meaning: "This page makes clear that the artifact is synthetic and local-only.",
      keywords: ["cover", "local fixture", "Doc Oracle"],
      linked_terms: ["Fixture mode", "Execution state"],
      linked_sections: [sectionIds.root],
      has_visual_assets: true,
      suggested_questions: ["What is this fixture for?", "Which tabs should this page help verify?"],
    }),
    pageRow({
      page_number: 2,
      page_label: "Contents",
      page_type: "toc",
      raw_text: "Contents: goals, reader problems, information architecture, mobile model, evidence, validation.",
      markdown: fixtureMarkdownPage(
        "Contents",
        "1. Redesign goals and document scope\n2. Reader problems and design priorities\n3. Information architecture and tab contracts\n4. Mobile workspace interaction model\n5. Grounded evidence and visual intelligence\n6. Local validation checklist",
      ),
      page_summary: "Table of contents for the synthetic redesign document.",
      interpreted_page_meaning: "Provides outline data for structure navigation and section cards.",
      keywords: ["contents", "outline", "sections"],
      linked_terms: ["Section outline"],
      linked_sections: [sectionIds.root],
      has_visual_assets: false,
      suggested_questions: ["Show me the document structure.", "Which section covers mobile behavior?"],
    }),
    pageRow({
      page_number: 3,
      page_label: "Reader Problems",
      page_type: "text",
      raw_text:
        "The previous Doc Oracle experience repeated the title, summary, stats, and navigation in too many places. Mobile users saw a large tab grid before they saw the document content.",
      markdown: fixtureMarkdownPage(
        "Reader problems and design priorities",
        "- Reduce repeated identity and summary blocks.\n- Keep the document content visible before secondary tools.\n- Make mobile navigation compact and predictable.\n- Preserve every structured data surface so QA can inspect rows, not placeholders.",
      ),
      page_summary: "Summarizes the problems the redesign should solve.",
      interpreted_page_meaning: "Useful for checking summary, key topics, and suggested questions.",
      keywords: ["duplication", "mobile", "navigation", "summary"],
      linked_terms: ["Compact navigation", "Snapshot card"],
      linked_sections: [sectionIds.goals],
      has_visual_assets: false,
      suggested_questions: ["What problems did the redesign prioritize?", "What changed on mobile?"],
    }),
    pageRow({
      page_number: 4,
      page_label: "Architecture",
      page_type: "table",
      raw_text:
        "Overview uses document_analyses, document_pages, document_sections, document_glossary_terms, document_visual_assets, and document_chunks. Chat uses document_chunks and persisted sessions. Mind map uses document_mind_map_nodes and edges.",
      markdown: fixtureMarkdownPage(
        "Information architecture and tab contracts",
        "| Surface | Supabase-shaped rows | QA expectation |\n| --- | --- | --- |\n| Overview | analysis, pages, sections, glossary, visuals, chunks | Snapshot, summary, structure map |\n| Pages | document_pages | Search, filters, page detail modal |\n| Visuals | document_visual_assets | Cards, modal, related sections |\n| Chat | chunks, chat sessions, messages | Grounded answer with citations |\n| Mind Map | nodes, edges | Non-empty canvas with relationships |",
      ),
      page_summary: "Maps Doc Oracle UI surfaces to the row families they depend on.",
      interpreted_page_meaning: "This table validates that the fixture matches the live schema families.",
      keywords: ["schema", "tabs", "contracts", "table"],
      linked_terms: ["document_pages", "document_chunks", "document_visual_assets"],
      linked_sections: [sectionIds.structure],
      has_visual_assets: true,
      suggested_questions: ["Which tables feed the Overview tab?", "How does chat differ from pages?"],
    }),
    pageRow({
      page_number: 5,
      page_label: "Mobile Model",
      page_type: "text",
      raw_text:
        "The mobile model uses a compact segmented control, a single source of summary truth, and sticky chat composition. Secondary tools remain available without dominating the first viewport.",
      markdown: fixtureMarkdownPage(
        "Mobile workspace interaction model",
        "The redesign keeps the primary document identity in the top shell, uses compact tab navigation, and avoids repeating summary blocks. Chat should feel reachable but not dominate the overview. Page details and visual previews should open without shifting the underlying layout.",
      ),
      page_summary: "Describes the mobile behavior to inspect in responsive screenshots.",
      interpreted_page_meaning: "Supports mobile QA and viewport-specific validation.",
      keywords: ["mobile", "tabs", "sticky composer", "safe area"],
      linked_terms: ["Segmented navigation", "Sticky composer"],
      linked_sections: [sectionIds.mobile],
      has_visual_assets: true,
      suggested_questions: ["How should mobile navigation behave?", "What should stay visible in the first viewport?"],
    }),
    pageRow({
      page_number: 6,
      page_label: "Visual Evidence",
      page_type: "visual-heavy",
      raw_text:
        "Visual cards should show semantic category, page, confidence, related section, title, and tags. Broken private storage paths must not block local QA.",
      markdown: fixtureMarkdownPage(
        "Grounded evidence and visual intelligence",
        "Visual evidence is part of the Doc Oracle reading experience. The fixture includes a journey diagram, a table matrix, a mobile wireframe, and a state map so the visual tab is never empty during QA.",
      ),
      page_summary: "Explains why the fixture includes rendered images and visual assets.",
      interpreted_page_meaning: "Feeds visual cards, page thumbnails, related visual chips, and modal preview.",
      keywords: ["visual assets", "evidence", "semantic category", "confidence"],
      linked_terms: ["Visual asset", "Grounded citation"],
      linked_sections: [sectionIds.evidence],
      has_visual_assets: true,
      suggested_questions: ["Which visuals are most important?", "How are visuals connected to sections?"],
    }),
    pageRow({
      page_number: 7,
      page_label: "Grounded Answers",
      page_type: "text",
      raw_text:
        "Doc Oracle answers must cite chunks and pages. If context is insufficient, it should say so clearly rather than inventing facts. Visuals can be attached when relevant.",
      markdown: fixtureMarkdownPage(
        "Grounded answer policy",
        "- Answer only from retrieved document chunks.\n- Use page citations for factual claims.\n- Attach related pages and visuals when they help explain the answer.\n- Label anything outside the document as a general note.",
      ),
      page_summary: "Sets expectations for chat answers, citations, and related evidence.",
      interpreted_page_meaning: "Useful for testing canned fixture chat responses and citation rendering.",
      keywords: ["chat", "citations", "chunks", "related visuals"],
      linked_terms: ["document_chunks", "Grounded citation"],
      linked_sections: [sectionIds.evidence],
      has_visual_assets: false,
      suggested_questions: ["What should Doc Oracle do when evidence is missing?", "How should citations appear?"],
    }),
    pageRow({
      page_number: 8,
      page_label: "QA Checklist",
      page_type: "checklist",
      raw_text:
        "Validation checklist: run lint, run fixture tests, open local fixture route, capture desktop and mobile screenshots, verify no live document dependency.",
      markdown: fixtureMarkdownPage(
        "Local validation checklist",
        "- Route opens with dev-login bypass and no live knowledge item.\n- Overview shows completed analysis, summary, counts, structure, topics, and suggested questions.\n- Pages, sections, glossary, visuals, chat, mind map, infographic, and audio tabs have meaningful local data.\n- Screenshot evidence should be captured on desktop and mobile.",
      ),
      page_summary: "Checklist for validating the reusable fixture flow.",
      interpreted_page_meaning: "Confirms the work is not done until local validation passes.",
      keywords: ["validation", "screenshots", "desktop", "mobile"],
      linked_terms: ["Fixture mode", "Validation"],
      linked_sections: [sectionIds.qa],
      has_visual_assets: false,
      suggested_questions: ["What should be validated locally?", "What residual risks remain?"],
    }),
  ];
}

function buildFixtureGlossary(): DocOracleGlossaryRow[] {
  return [
    {
      id: fixtureUuid(0xd401),
      term: "Fixture mode",
      definition: "A dev-only flow that returns synthetic Doc Oracle rows without reading or writing live Supabase data.",
      category: "QA",
      pages: [1, 8],
      related_terms: ["Execution state", "Validation"],
    },
    {
      id: fixtureUuid(0xd402),
      term: "Grounded citation",
      definition: "A citation tied to a document chunk, page number, section path, and short excerpt.",
      category: "Evidence",
      pages: [6, 7],
      related_terms: ["document_chunks", "Related pages"],
    },
    {
      id: fixtureUuid(0xd403),
      term: "document_pages",
      definition: "The normalized page table used by page cards, source previews, search, filters, and page detail modals.",
      category: "Schema",
      pages: [4],
      related_terms: ["document_analyses", "document_chunks"],
    },
    {
      id: fixtureUuid(0xd404),
      term: "document_visual_assets",
      definition: "The normalized visual asset table used by visual cards, preview modals, and related visual evidence.",
      category: "Schema",
      pages: [4, 6],
      related_terms: ["Visual asset", "Semantic category"],
    },
    {
      id: fixtureUuid(0xd405),
      term: "Compact navigation",
      definition: "The redesigned tab model that keeps tools available without letting navigation dominate the viewport.",
      category: "Interaction",
      pages: [3, 5],
      related_terms: ["Segmented navigation", "Mobile workspace"],
    },
    {
      id: fixtureUuid(0xd406),
      term: "Execution state",
      definition: "The explicit label distinguishing synthetic fixture data from real extraction or live authenticated documents.",
      category: "Safety",
      pages: [1, 8],
      related_terms: ["Fixture mode"],
    },
  ];
}

function buildFixtureVisuals(): DocOracleVisualRow[] {
  return [
    {
      id: visualIds.journey,
      type: "diagram",
      semantic_category: "journey diagram",
      title: "Doc Oracle local QA journey",
      description: "A flow from fixture route to workspace, tabs, API mocks, and screenshot evidence.",
      image_path: fixtureAssetPath("visual-journey.svg"),
      source_page_number: 1,
      extracted_labels: ["fixture route", "workspace", "screenshots"],
      retrieval_tags: ["local QA", "route", "validation"],
      related_terms: ["Fixture mode", "Validation"],
      related_sections: [sectionIds.root, sectionIds.qa],
      confidence: 0.96,
    },
    {
      id: visualIds.matrix,
      type: "table",
      semantic_category: "schema matrix",
      title: "Tab-to-table contract matrix",
      description: "A matrix showing how Overview, Pages, Visuals, Chat, and Mind Map depend on specific row families.",
      image_path: fixtureAssetPath("visual-matrix.svg"),
      source_page_number: 4,
      extracted_labels: ["document_analyses", "document_pages", "document_chunks"],
      retrieval_tags: ["schema", "tab contracts", "Supabase"],
      related_terms: ["document_pages", "document_visual_assets"],
      related_sections: [sectionIds.structure],
      confidence: 0.94,
    },
    {
      id: visualIds.mobile,
      type: "wireframe",
      semantic_category: "mobile layout",
      title: "Compact mobile workspace wireframe",
      description: "A mobile-first sketch of the Doc Oracle top shell, segmented tabs, summary, and sticky chat affordance.",
      image_path: fixtureAssetPath("visual-mobile.svg"),
      source_page_number: 5,
      extracted_labels: ["mobile", "tabs", "composer"],
      retrieval_tags: ["mobile", "safe area", "navigation"],
      related_terms: ["Compact navigation"],
      related_sections: [sectionIds.mobile],
      confidence: 0.92,
    },
    {
      id: visualIds.states,
      type: "flowchart",
      semantic_category: "state map",
      title: "Grounded-answer evidence state map",
      description: "A flowchart of retrieval, citation, related pages, related visuals, and insufficient-evidence handling.",
      image_path: fixtureAssetPath("visual-states.svg"),
      source_page_number: 7,
      extracted_labels: ["chunks", "citations", "related visuals"],
      retrieval_tags: ["chat", "evidence", "grounding"],
      related_terms: ["Grounded citation", "document_chunks"],
      related_sections: [sectionIds.evidence],
      confidence: 0.95,
    },
  ];
}

function buildFixtureChunks(sections: DocOracleSectionRow[]) {
  const byTitle = new Map(sections.map((s) => [s.id, s.title]));
  return [
    {
      id: chunkIds[0]!,
      page_number: 1,
      section_path: byTitle.get(sectionIds.root) ?? "Redesign goals and document scope",
      chunk_text:
        "This fixture is a local-only Doc Oracle analysis. It exists to open the redesign without a live authenticated upload or Supabase Storage object.",
    },
    {
      id: chunkIds[1]!,
      page_number: 4,
      section_path: byTitle.get(sectionIds.structure) ?? "Information architecture and tab contracts",
      chunk_text:
        "Overview uses analysis, pages, sections, glossary, visuals, and chunks. Chat uses chunks and persisted sessions. Mind Map uses nodes and edges.",
    },
    {
      id: chunkIds[2]!,
      page_number: 6,
      section_path: byTitle.get(sectionIds.evidence) ?? "Grounded evidence and visual intelligence",
      chunk_text:
        "Visual evidence should show semantic category, page, confidence, related section, title, and tags. Local QA must not depend on private storage paths.",
    },
    {
      id: chunkIds[3]!,
      page_number: 8,
      section_path: byTitle.get(sectionIds.qa) ?? "Local validation checklist",
      chunk_text:
        "Validation should include lint, fixture tests, local fixture route, desktop and mobile screenshots, and confirmation that no live document is required.",
    },
  ];
}

function buildSuggestedQuestionCategories(
  analysis: DocOracleAnalysis,
  pages: DocOraclePageRow[],
  sections: DocOracleSectionRow[],
  glossary: DocOracleGlossaryRow[],
  visuals: DocOracleVisualRow[],
): SuggestedQuestionCategory[] {
  const deterministic = buildCategorizedSuggestedQuestions({
    analysis,
    pages,
    sections,
    glossary,
    visuals,
    fallbackPrompts: buildLegacyFallbackPrompts(sections, glossary),
  });
  return deterministic.length
    ? deterministic
    : [
        {
          id: "fixture-overview",
          label: "Fixture overview",
          description: "Questions for local Doc Oracle QA.",
          tone: "teal",
          questions: [
            {
              id: "fixture-purpose",
              question: "What does this fixture prove about the redesign?",
              sourcePages: [1, 8],
              sourceSections: ["Redesign goals and document scope"],
            },
          ],
        },
      ];
}

export type DocOracleFixtureData = {
  item: KnowledgeItem;
  analysis: DocOracleAnalysis;
  pages: DocOraclePageRow[];
  sections: DocOracleSectionRow[];
  glossary: DocOracleGlossaryRow[];
  visuals: DocOracleVisualRow[];
  chunkCount: number;
  chunks: ReturnType<typeof buildFixtureChunks>;
  suggestedQuestionCategories: SuggestedQuestionCategory[];
};

export function getDocOracleFixtureData(userId = DEFAULT_FIXTURE_USER_ID): DocOracleFixtureData {
  const item = buildFixtureItem(userId);
  const analysis = buildFixtureAnalysis();
  const pages = buildFixturePages();
  const sections = buildFixtureSections();
  const glossary = buildFixtureGlossary();
  const visuals = buildFixtureVisuals();
  const chunks = buildFixtureChunks(sections);
  const suggestedQuestionCategories = buildSuggestedQuestionCategories(analysis, pages, sections, glossary, visuals);
  return {
    item,
    analysis,
    pages,
    sections,
    glossary,
    visuals,
    chunks,
    chunkCount: chunks.length,
    suggestedQuestionCategories,
  };
}

export function getDocOracleFixtureChatSessions() {
  return {
    sessions: [
      {
        id: DOC_ORACLE_FIXTURE_CHAT_SESSION_ID,
        title: "Fixture QA chat",
        created_at: FIXTURE_NOW,
        updated_at: FIXTURE_NOW,
        message_count: 2,
        last_message: "The fixture uses local synthetic rows that mirror Doc Oracle tables.",
      },
    ],
  };
}

export function getDocOracleFixtureChatMessages() {
  const data = getDocOracleFixtureData();
  const visual = data.visuals[1]!;
  return {
    session: {
      id: DOC_ORACLE_FIXTURE_CHAT_SESSION_ID,
      title: "Fixture QA chat",
      created_at: FIXTURE_NOW,
      updated_at: FIXTURE_NOW,
      document_id: DOC_ORACLE_FIXTURE_DOCUMENT_ID,
    },
    messages: [
      {
        id: fixtureUuid(0xd501),
        role: "user" as const,
        content: "What should I verify in this redesign fixture?",
        citations: [],
        related_pages: [],
        related_visuals: [],
        created_at: FIXTURE_NOW,
      },
      {
        id: fixtureUuid(0xd502),
        role: "assistant" as const,
        content:
          "Verify the Overview, Pages, Sections, Glossary, Visuals, Chat, Mind Map, Infographic, and Audio Summary tabs. The fixture is local-only and mirrors Doc Oracle row contracts without reading a live authenticated document.",
        citations: [
          {
            chunk_id: chunkIds[3],
            page: 8,
            section: "Local validation checklist",
            excerpt: "desktop and mobile screenshots",
          },
        ],
        related_pages: [1, 4, 6, 8],
        related_visuals: [
          {
            id: visual.id,
            title: visual.title ?? "Fixture visual",
            type: visual.type,
            page: visual.source_page_number,
            image_path: visual.image_path,
            description: visual.description,
            semantic_category: visual.semantic_category,
          },
        ],
        created_at: FIXTURE_NOW,
        userQuestion: "What should I verify in this redesign fixture?",
      },
    ],
    total: 2,
  };
}

export function getDocOracleFixtureChatAnswer(question: string) {
  const data = getDocOracleFixtureData();
  const visual = data.visuals[3]!;
  const trimmed = question.trim() || "this question";
  return {
    answer:
      `For "${trimmed}", use this fixture to inspect the local Doc Oracle rendering path. It proves that the redesign can render completed analysis data, page cards, visual evidence, and grounded citation UI without a live authenticated document.\n\n## What to inspect\n- Overview counts, summary, structure map, topics, and suggested questions.\n- Page thumbnails and page detail modal.\n- Visual cards, related sections, and preview modal.\n- Chat citations and related evidence chips.\n\n## Why this is supported by the document\nThe fixture checklist explicitly requires local route verification, desktop/mobile screenshots, and confirmation that no live document is required [p.8].`,
    citations: [
      {
        chunk_id: chunkIds[3],
        page: 8,
        section: "Local validation checklist",
        excerpt: "confirmation that no live document is required",
      },
      {
        chunk_id: chunkIds[0],
        page: 1,
        section: "Redesign goals and document scope",
        excerpt: "local-only Doc Oracle analysis",
      },
    ],
    related_pages: [1, 4, 6, 8],
    related_visuals: [
      {
        id: visual.id,
        title: visual.title ?? "Fixture visual",
        type: visual.type,
        page: visual.source_page_number,
        image_path: visual.image_path,
        description: visual.description,
        semantic_category: visual.semantic_category,
      },
    ],
    sessionId: DOC_ORACLE_FIXTURE_CHAT_SESSION_ID,
    model: "fixture-local",
  };
}

export function getDocOracleFixtureMindMap(): {
  nodes: MindMapDbNode[];
  edges: MindMapDbEdge[];
  generated_at: string;
  status: "ready";
  can_generate: false;
  gemini_used: false;
  gemini_error: null;
} {
  const userId = DEFAULT_FIXTURE_USER_ID;
  const mkNode = (
    n: number,
    label: string,
    nodeType: string,
    x: number,
    y: number,
    pageNumbers: number[],
    description: string,
    extra?: Partial<MindMapDbNode>,
  ): MindMapDbNode => ({
    id: fixtureUuid(0xd600 + n),
    user_id: userId,
    document_id: DOC_ORACLE_FIXTURE_DOCUMENT_ID,
    analysis_id: DOC_ORACLE_FIXTURE_ANALYSIS_ID,
    node_key: `fixture:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    node_type: nodeType,
    description,
    importance_score: 0.8,
    page_numbers: pageNumbers,
    section_ids: [],
    visual_asset_ids: [],
    glossary_term_ids: [],
    source_chunk_ids: [],
    keywords: label.toLowerCase().split(/\s+/).slice(0, 4),
    position_x: x,
    position_y: y,
    collapsed: false,
    metadata: { evidence: pageNumbers.map((page) => ({ page, quote: `Fixture evidence on page ${page}` })) },
    created_at: FIXTURE_NOW,
    updated_at: FIXTURE_NOW,
    ...extra,
  });

  const nodes = [
    mkNode(1, "Doc Oracle fixture", "document_root", 0, 0, [1], "Synthetic root node for local redesign QA."),
    mkNode(2, "Schema-faithful rows", "concept", -260, -160, [4], "The fixture mirrors analysis, pages, sections, glossary, visuals, and chunks.", {
      section_ids: [sectionIds.structure],
      source_chunk_ids: [chunkIds[1]!],
    }),
    mkNode(3, "Mobile redesign", "section", 260, -140, [5], "Compact navigation and mobile workspace behavior.", {
      section_ids: [sectionIds.mobile],
      visual_asset_ids: [visualIds.mobile],
    }),
    mkNode(4, "Visual evidence", "visual", -240, 180, [6], "Local SVG-backed visual assets for visual QA.", {
      section_ids: [sectionIds.evidence],
      visual_asset_ids: [visualIds.matrix, visualIds.states],
      source_chunk_ids: [chunkIds[2]!],
    }),
    mkNode(5, "Validation checklist", "requirement", 260, 160, [8], "Lint, fixture tests, desktop/mobile screenshots, and local route verification.", {
      section_ids: [sectionIds.qa],
      source_chunk_ids: [chunkIds[3]!],
    }),
  ];

  const mkEdge = (n: number, source: MindMapDbNode, target: MindMapDbNode, label: string): MindMapDbEdge => ({
    id: fixtureUuid(0xd700 + n),
    user_id: userId,
    document_id: DOC_ORACLE_FIXTURE_DOCUMENT_ID,
    analysis_id: DOC_ORACLE_FIXTURE_ANALYSIS_ID,
    source_node_id: source.id,
    target_node_id: target.id,
    relationship_type: "supports",
    label,
    description: `${source.label} supports ${target.label}.`,
    confidence: 0.92,
    metadata: {},
    created_at: FIXTURE_NOW,
    updated_at: FIXTURE_NOW,
  });

  return {
    nodes,
    edges: [
      mkEdge(1, nodes[0]!, nodes[1]!, "mirrors schema"),
      mkEdge(2, nodes[0]!, nodes[2]!, "tests mobile"),
      mkEdge(3, nodes[0]!, nodes[3]!, "renders visuals"),
      mkEdge(4, nodes[0]!, nodes[4]!, "validates local QA"),
    ],
    generated_at: FIXTURE_NOW,
    status: "ready",
    can_generate: false,
    gemini_used: false,
    gemini_error: null,
  };
}

export function getDocOracleFixtureInfographicFocusOptions() {
  const data = getDocOracleFixtureData();
  return {
    document_type: data.analysis.document_type ?? "fixture",
    summary: data.analysis.summary ?? "",
    focus_options: [
      {
        id: "schema-contracts",
        label: "Schema contracts",
        description: "Show how Doc Oracle tabs map to Supabase-shaped rows.",
        source_pages: [4],
        source_sections: ["Information architecture and tab contracts"],
      },
      {
        id: "mobile-qa",
        label: "Mobile QA",
        description: "Highlight compact navigation and first-viewport behavior.",
        source_pages: [5],
        source_sections: ["Mobile workspace interaction model"],
      },
      {
        id: "evidence-surfaces",
        label: "Evidence surfaces",
        description: "Summarize citations, related pages, and visual evidence.",
        source_pages: [6, 7],
        source_sections: ["Grounded evidence and visual intelligence"],
      },
    ],
  };
}

export function getDocOracleFixtureAudioFocusOptions() {
  return {
    document_summary:
      "A local Doc Oracle QA fixture with completed analysis rows, visual assets, chat evidence, mind map data, and validation checklist.",
    focus_options: [
      {
        id: "qa-briefing",
        label: "QA briefing",
        description: "A short narration of what to verify in the redesign.",
        source_pages: [1, 8],
        source_sections: ["Redesign goals and document scope", "Local validation checklist"],
      },
      {
        id: "schema-walkthrough",
        label: "Schema walkthrough",
        description: "Explain the table families behind the Doc Oracle panels.",
        source_pages: [4],
        source_sections: ["Information architecture and tab contracts"],
      },
    ],
  };
}

export function getDocOracleFixtureGeneratedInfographic(aspectRatio: string, style: string) {
  return {
    image_url: `/api/document-brain/fixture-assets/generated-infographic.svg?aspect=${encodeURIComponent(aspectRatio)}`,
    storage_path: null,
    prompt_used: "Fixture-only infographic prompt based on local Doc Oracle QA rows.",
    model: "fixture-local-svg",
    aspect_ratio: aspectRatio,
    style,
  };
}

export function getDocOracleFixtureGeneratedAudio() {
  return {
    audio_url: `/api/document-brain/fixture-assets/silence.wav`,
    storage_path: null,
    transcript:
      "This is a fixture audio summary. Verify that the Doc Oracle redesign opens locally, shows completed analysis data, and renders every QA tab without a live authenticated document.",
    chapters: [
      {
        title: "Fixture purpose",
        text: "The route renders synthetic Doc Oracle rows with the same data shape as the live tables.",
        source_pages: [1],
      },
      {
        title: "Validation path",
        text: "Use desktop and mobile screenshots to confirm the redesign is visually stable.",
        source_pages: [8],
      },
    ],
    source_pages: [1, 4, 8],
    source_sections: ["Redesign goals and document scope", "Local validation checklist"],
    provider: "fixture-local",
    voice_gender: "female",
    duration_seconds: 18,
  };
}

export function getDocOracleFixtureAudioHistory() {
  const generated = getDocOracleFixtureGeneratedAudio();
  return {
    items: [
      {
        id: fixtureUuid(0xd801),
        audio_url: generated.audio_url,
        transcript: generated.transcript,
        chapters: generated.chapters,
        source_pages: generated.source_pages,
        source_sections: generated.source_sections,
        created_at: FIXTURE_NOW,
      },
    ],
  };
}

function svgResponse(title: string, subtitle: string, accent: string, lines: string[]): string {
  const escaped = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const rows = lines
    .slice(0, 6)
    .map(
      (line, i) =>
        `<text x="72" y="${250 + i * 42}" font-family="Inter, Arial, sans-serif" font-size="25" fill="#27323a">${escaped(line)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#f7f5f0"/>
  <rect x="42" y="42" width="1116" height="816" rx="30" fill="#ffffff" stroke="#d7d2c7" stroke-width="3"/>
  <rect x="42" y="42" width="1116" height="122" rx="30" fill="${accent}"/>
  <text x="72" y="116" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${escaped(title)}</text>
  <text x="72" y="196" font-family="Inter, Arial, sans-serif" font-size="24" fill="#59656f">${escaped(subtitle)}</text>
  ${rows}
  <circle cx="1038" cy="690" r="78" fill="${accent}" opacity="0.18"/>
  <circle cx="1088" cy="742" r="46" fill="${accent}" opacity="0.28"/>
  <text x="72" y="812" font-family="Inter, Arial, sans-serif" font-size="20" fill="#7d8790">Local Doc Oracle fixture asset - synthetic</text>
</svg>`;
}

export function getDocOracleFixtureAsset(assetId: string): { body: string | Uint8Array; contentType: string } | null {
  const normalized = assetId.replace(/^\/+/, "");
  if (normalized === "source.pdf") {
    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 119 >>
stream
BT /F1 18 Tf 72 700 Td (Doc Oracle local QA fixture) Tj 0 -30 Td (Synthetic PDF shell for visual verification.) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000411 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
481
%%EOF`;
    return { body: pdf, contentType: "application/pdf" };
  }
  if (normalized === "silence.wav") {
    return {
      body: Uint8Array.from([
        82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 64, 31, 0, 0, 64,
        31, 0, 0, 1, 0, 8, 0, 100, 97, 116, 97, 0, 0, 0, 0,
      ]),
      contentType: "audio/wav",
    };
  }
  const generated = normalized === "generated-infographic.svg";
  if (generated) {
    return {
      body: svgResponse("Doc Oracle QA Map", "Generated locally from fixture data", "#3f7f78", [
        "1. Open fixture route",
        "2. Inspect every tab",
        "3. Capture desktop and mobile",
        "4. Confirm no live document dependency",
      ]),
      contentType: "image/svg+xml",
    };
  }
  const pageMatch = normalized.match(/^page-(\d+)\.svg$/);
  if (pageMatch) {
    const page = Number(pageMatch[1]);
    return {
      body: svgResponse(`Page ${page}`, "Rendered page thumbnail", "#4f6f52", [
        "Doc Oracle redesign fixture",
        page === 4 ? "Table contracts and schema rows" : "Synthetic page screenshot",
        page === 5 ? "Mobile workspace navigation" : "Local visual verification",
        page === 8 ? "Validation checklist" : "No Supabase Storage required",
      ]),
      contentType: "image/svg+xml",
    };
  }
  const visualMap: Record<string, [string, string, string, string[]]> = {
    "visual-journey.svg": [
      "Local QA Journey",
      "Route to screenshot evidence",
      "#6f5f9b",
      ["Fixture route", "Workspace props", "Client API mocks", "Visual proof"],
    ],
    "visual-matrix.svg": [
      "Tab Contract Matrix",
      "Supabase-shaped row families",
      "#3f6f9b",
      ["Overview: analysis + rows", "Pages: document_pages", "Chat: chunks + sessions", "Mind map: nodes + edges"],
    ],
    "visual-mobile.svg": [
      "Mobile Workspace",
      "Compact first viewport",
      "#a35f3f",
      ["Top shell", "Segmented tabs", "Readable summary", "Sticky chat composer"],
    ],
    "visual-states.svg": [
      "Grounded Answer State Map",
      "Citations and related evidence",
      "#7a7f3f",
      ["Retrieve chunks", "Cite page", "Attach visuals", "State uncertainty"],
    ],
  };
  const visual = visualMap[normalized];
  if (visual) {
    return {
      body: svgResponse(visual[0], visual[1], visual[2], visual[3]),
      contentType: "image/svg+xml",
    };
  }
  return null;
}
