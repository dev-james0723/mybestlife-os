# Ask Your Knowledge Base and Intelligent Retrieval report

Date: 2026-06-06

Scope: local audit of the Knowledge Base question surfaces, AI Knowledge prompt workspace, retrieval-related data model, embedding infrastructure, UI, theme, and motion.

## Summary

The app already has two adjacent Knowledge Base question surfaces.

- `KnowledgeInquiryAgent` is the "find relevant knowledge" surface. It supports typed and voice inquiry, agent-like states, deterministic ranked results, confidence labels, reasons, matched concepts/keywords, suggested actions, prompt copy, item open, and escalation to Ask AI.
- `KnowledgeAIPanel` is the "answer using my library" chat surface. It opens from the page header or inquiry results, stores chat locally, calls `/api/knowledge/assistant`, and falls back to local keyword logic if AI is unavailable.

The main limitation is architectural: these surfaces are not backed by one shared semantic retrieval engine. The inquiry agent uses client-side deterministic keyword/concept scoring. The AI panel fetches all items and connections server-side, builds a capped text context pack, then asks Gemini to answer from that pack. This is useful for small libraries, but it will miss paraphrases, struggle with large libraries, and cannot provide citation-grade evidence.

The broader app already has the pieces needed for real Intelligent Retrieval: Brain embeddings with `text-embedding-004` and `match_brain_nodes`, Quote Library embeddings with `match_quotes`, and Doc Oracle document chunks. Knowledge Base itself is missing the equivalent Knowledge retrieval document table, item/chunk embeddings, match RPC, shared retrieve API, and structured answer citations.

AI Knowledge is currently a prompt library and prompt execution workspace, not a retrieval engine. The best connection is: Knowledge Base owns retrieval; AI Knowledge supplies reusable prompts/templates that can be applied to retrieved evidence.

## Existing feature map

### Knowledge Base route

- Route: `app/src/app/[locale]/(protected)/knowledge-base/page.tsx`
- Server flow: creates Supabase server client, gets the page user, redirects unauthenticated users, fetches `getKnowledgeItems(user.id)` and `getSmartCollections(user.id)`, then renders `KnowledgeLayout`.
- The page exports `maxDuration = 120`, matching the heavy upload/PDF processing path.

### Knowledge layout

File: `app/src/components/knowledge/KnowledgeLayout.tsx`

What it renders:

- left Knowledge sidebar
- `KnowledgeInquiryAgent` above the list for non-Constellation views
- top controls, active filters, and `KnowledgeContent`
- `KnowledgeAIPanel` as desktop side panel or mobile full-screen overlay
- detail sheet and add modal

Data behavior:

- Hydrates Zustand with initial items and collections.
- Subscribes to realtime changes for `knowledge_items` and `document_extraction_jobs`.
- Uses polling backup for processing items and extraction jobs.
- Skips live refresh while Constellation is active to avoid disturbing graph layout.

### Ask Your Knowledge Base inquiry agent

File: `app/src/components/knowledge/KnowledgeInquiryAgent.tsx`

Implemented features:

- Natural-language textarea.
- Browser SpeechRecognition and webkitSpeechRecognition voice input.
- Locale-aware speech language mapping for English, zh-TW, zh-CN, Japanese, Korean, French, Italian, Spanish, and Vietnamese.
- States: idle, listening, transcribing, analyzing, matching, results-ready, no-strong-matches, error.
- Query writes into shared `searchQuery` and switches sort to `relevance`, so gallery/board/table use the same inquiry.
- Top 5 ranked result cards.
- Result cards show category/type, confidence, title, relevance score, summary, "why this matches", matched concepts, matched keywords, tags, and suggested action.
- Actions: open item, ask AI, copy prompt.
- Framer Motion result-card entry animation.
- Pulse and spinner busy states.

Implementation details:

- Uses `matchKnowledgeItems(items, inquiry, smartCollections, { limit: 5, minScore: 8 })`.
- Treats normalized score `28` as the strong-match threshold.
- Analyzing/matching transitions are timer-driven UI states, not real async retrieval phases.

### Deterministic matcher

File: `app/src/lib/knowledgeMatching.ts`

Implemented features:

- Normalization, tokenization, stop-word removal.
- Fixed concept expansion for SaaS, payment/billing, Cloud Code/agent skills, codebases, frontend UX, templates/resources, and research/references.
- Weighted scoring across title, tags, category, source, collection, questions, actions, summary, overview, raw content, insights, and quotes.
- Exact query bonus and field diversity boost.
- Normalized relevance score, confidence label, reasons, matched terms/concepts, matched fields, and suggested action.

Limitations:

- It is not semantic retrieval.
- Concept coverage is narrow and hand-authored.
- It cannot reliably match paraphrases, multilingual equivalents, implicit intent, or adjacent ideas.
- It cannot return citation snippets or evidence spans.
- It runs over in-memory items in the browser.
- Raw content is capped client-side.
- No focused tests cover ranking, multilingual behavior, or concept expansion.

### Shared list filtering

Files:

- `app/src/hooks/use-knowledge-filtered-items.ts`
- `app/src/lib/knowledge/knowledge-list-utils.ts`

Implemented features:

- Filter pipeline: quick filters, content type, source category, smart collection, taxonomy tag, search/inquiry, sort.
- Search first attempts deterministic matching, then falls back to substring checks.
- Relevance sort combines deterministic score with older substring boosts.

Limitations:

- The main list does not show the same "why matched" evidence that the inquiry cards show.
- Relevance filtering is still local and deterministic.
- There is no async semantic result merge.
- Users cannot choose whether the inquiry searches all items or only the current filtered subset.

## Ask AI panel and server context

### Client panel

File: `app/src/components/knowledge/KnowledgeAIPanel.tsx`

Implemented features:

- Desktop side panel and mobile full-screen overlay.
- Suggested starter questions.
- LocalStorage chat history per user, capped to 80 messages.
- Clear conversation action.
- Auto-scroll to newest message.
- Calls `/api/knowledge/assistant`.
- Handles unauthenticated/dev-bypass state.
- Local fallback for recent, this week, summaries, connections, and keyword matches.

Limitations:

- Messages render as plain text, even though the server asks Gemini to use Markdown.
- No structured citations, source chips, retrieved evidence cards, confidence, or "open source" action.
- No streaming or cancellation.
- Chat history is local-only and not linked to item IDs/chunk IDs.
- "Ask AI" naming overlaps with global AI Assistant and AI Knowledge.

### Server route

File: `app/src/app/api/knowledge/assistant/route.ts`

Implemented behavior:

- Node runtime, 120-second max duration.
- Validates chat messages and requires authenticated Knowledge user.
- Requires Gemini API key.
- Fetches all Knowledge items and all user Knowledge connections.
- Builds a Knowledge context pack.
- Sends the last question plus the context pack to Gemini.
- System instruction says to answer only from provided Knowledge Base data.

### Context pack

File: `app/src/lib/knowledge/knowledge-assistant-context.ts`

Implemented behavior:

- Detects query hints: recent, this week, summarize, connections.
- Scores all items with keyword/title/tag/summary/raw content fields, recency boosts, and connection-count boosts.
- Includes full compact inventory of all items.
- Includes up to 60 stored connection lines.
- Includes rich excerpts for 22 to 28 top-scored items.
- Caps final context block at 92,000 characters.

Limitations:

- No vector search.
- Fetches all items and connections for every chat request.
- Top excerpts may omit the right evidence when heuristic scoring fails.
- Full inventory consumes context without giving detailed evidence.
- No structured retrieved-evidence object is returned.
- No tests for context selection or answer-grounding constraints.

## Data model and retrieval readiness

### Knowledge item model

File: `app/src/types/knowledge.ts`

Useful retrieval fields already exist:

- title, content type, raw content
- source URL/domain/file path/provider/source type/category/label/source metadata
- AI TLDR, summary, content overview, tags, insights, quotes, questions answered, action items
- YouTube transcript and video chat starters
- extraction status, transcript status, ask-enabled flag
- render mode, preview status, screenshot URL
- document extraction job summary
- connections

Missing retrieval-specific fields:

- canonical retrieval document per item
- chunk IDs
- embeddings
- evidence snippets
- source offsets/page ranges for generic KB items
- structured use cases, technologies, resource type, difficulty, audience, and output format

### Source-aware ingestion

Migration: `app/supabase/migrations/20260503000000_knowledge_source_and_providers.sql`

Strengths:

- Adds fine-grained source type, provider, label, category, metadata, embed HTML, extraction/transcript status, ask-enabled flag, display mode, title source, and generated title.
- Adds indexes by user/source type, category, and provider.

Limitations:

- These fields help filtering and card display, but they do not create semantic recall.

### Doc Oracle

Migration: `app/supabase/migrations/20270611190000_document_brain_docoracle.sql`

Useful retrieval structures:

- document analyses
- pages
- sections
- glossary terms
- visual assets with retrieval tags
- document chunks
- chat sessions/messages

Key limitation:

- `document_chunks` has chunk text and metadata, but no embedding column or `match_document_chunks` RPC in the audited files.

### Existing embedding patterns

Brain:

- Migration: `app/supabase/migrations/20270503000000_brain_node_embeddings.sql`
- Table: `brain_node_embeddings`
- Embedding: `vector(768)`, Gemini `text-embedding-004`
- HNSW cosine index
- RPC: `match_brain_nodes`
- RLS owner-only, `SECURITY INVOKER`

Quote Library:

- Migration: `app/supabase/migrations/20260620180000_quote_library_embeddings.sql`
- Column: `quotes.embedding vector(768)`
- HNSW cosine index
- RPC: `match_quotes`

These are the cleanest local templates for Knowledge Base semantic retrieval.

## AI Knowledge connection

AI Knowledge is currently a prompt library and prompt execution workspace.

Files:

- `app/src/app/[locale]/(protected)/ai-knowledge/page.tsx`
- `app/src/components/ai-knowledge/PromptRunDialog.tsx`
- `app/src/app/api/ai/knowledge/prompt-run/route.ts`
- `app/src/stores/prompt-store.ts`
- `app/src/lib/repositories/ai-knowledge-prompts.ts`

Implemented AI Knowledge features:

- Library, My Prompts, Favorites, Folders, Recent, and Activity tabs.
- Category rail, filter bar, search, grid/list layouts, command palette.
- Prompt detail drawer.
- Create prompt modal and create routes.
- Prompt folders and multi-select toolbar.
- Prompt run dialog with variable interpolation.
- Prompt run API records run history and calls Gemini.

Current limitations relative to Ask KB:

- Prompt runs do not retrieve Knowledge Base context.
- Prompt variables are user-entered only. There is no "retrieved evidence" variable type.
- Prompt results are not linked back to Knowledge Base source items or chunks.
- No flow exists for "run this prompt on the top Ask KB results".
- AI Knowledge search is prompt metadata search, not semantic prompt retrieval.

Recommended model:

- Knowledge Base owns retrieval.
- AI Knowledge owns reusable reasoning templates.
- Ask KB retrieves evidence first.
- AI Knowledge prompts can then be applied to that evidence.
- Prompt runs should optionally store `retrieval_run_id`, source item IDs, chunk IDs, answer mode, and citation metadata.

## UI, design, theme, and motion

### What works

- Retrieval is visually promoted above filters.
- Existing OS primitives are used in the inquiry area.
- The result cards have a useful hierarchy: type, confidence, title, score, summary, reasons, chips, suggested action, controls.
- Voice states are clear and include unsupported/permission error fallbacks.
- Desktop layout uses a two-column inquiry surface.
- Mobile stacks the inquiry and makes the AI panel full-screen.
- Motion is restrained: result-card fade/slide, side-panel slide, pulse states, and loaders.

### UI limitations

- Inquiry and Ask AI still feel like separate tools instead of one retrieval-to-answer flow.
- "Ask AI" is too generic and overlaps with global AI Assistant and AI Knowledge.
- Gallery/table/board do not show "why this matched" when search is active.
- No visible search scope: all library, filtered subset, collection, document-only, videos-only, this week, etc.
- No retrieval mode: keyword, semantic, hybrid, exact source/title.
- No citation preview before answer generation.
- "Copy prompt" is power-user friendly but less direct than "Apply prompt", "Compare", "Summarize", or "Create task".
- Chat messages do not render Markdown.
- No source chips or citation cards attached to assistant messages.
- No saved answer/artifact surface.

### Theme observations

- The Knowledge Base theme is a restrained OS/card surface with neutral cards, muted panels, border tokens, and primary accents.
- Some older buttons hardcode violet (`bg-violet-600`) while newer controls use OS primitives. This slightly weakens theme consistency.
- Status colors are sensible: emerald for ready, rose for error/listening, primary for busy.
- The card usage is acceptable because cards represent repeated results and tool surfaces, not decorative section wrappers.

### Motion limitations

- The analyzing/matching phases are timer illusions today. After real retrieval exists, those states should map to real phases.
- Framer Motion transitions do not appear to read reduced-motion state directly in the audited components.
- There is no animated retrieval evidence build-up, source-chip reveal, or answer citation reveal.

## Intelligent Retrieval architecture

### Add retrieval documents

Create a Knowledge Base retrieval table similar to Brain and Quote Library:

```sql
knowledge_retrieval_documents (
  id uuid primary key,
  user_id uuid not null,
  item_id uuid not null references knowledge_items(id) on delete cascade,
  document_kind text not null,
  title text,
  body text not null,
  source_url text,
  source_type text,
  category text,
  tags text[],
  page_number integer,
  section_path text,
  chunk_index integer,
  content_hash text not null,
  embedding vector(768),
  embedding_model text not null default 'text-embedding-004',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

Document kinds should include item summary, source excerpt, transcript chunk, document chunk, visual asset, code, and note.

Add:

- HNSW cosine index on `embedding`.
- owner-only RLS policies.
- stable content-hash upsert behavior.
- batch backfill endpoint or script.

### Add semantic match RPC

Add an RPC following the Brain/Quote pattern:

```sql
match_knowledge_retrieval_documents(
  query_embedding vector(768),
  match_count integer default 24,
  match_threshold double precision default 0.35,
  filter_item_ids uuid[] default null,
  filter_categories text[] default null
)
```

Return item ID, retrieval document ID, title, snippet/body preview, source metadata, page/section info, and similarity.

### Add shared retrieve API

Add `POST /api/knowledge/retrieve`.

Expected request:

```json
{
  "query": "What did I save about SaaS checkout UX?",
  "scope": {
    "itemIds": [],
    "categories": [],
    "currentFilters": true
  },
  "mode": "hybrid",
  "limit": 12
}
```

Expected response:

```json
{
  "query": "...",
  "mode": "hybrid",
  "results": [
    {
      "itemId": "...",
      "retrievalDocumentId": "...",
      "title": "...",
      "snippet": "...",
      "sourceUrl": "...",
      "pageNumber": 12,
      "scores": {
        "semantic": 0.78,
        "metadata": 64,
        "recency": 0.1,
        "combined": 0.82
      },
      "why": ["Semantic match to checkout flow", "Tag match: stripe"]
    }
  ]
}
```

Then:

- `KnowledgeInquiryAgent` uses this endpoint for real retrieval.
- `KnowledgeAIPanel` uses this endpoint before answer generation.
- The main list can keep deterministic local fallback while semantic results load.
- Answer synthesis sends only retrieved evidence to Gemini.

### Hybrid ranking

Suggested default blend:

- 55 percent semantic similarity.
- 25 percent deterministic metadata score.
- 10 percent date/recency boost when query asks for latest/recent/this week.
- 10 percent connection/authority boost from Knowledge connections and Brain edges.

Query intent should adjust weights:

- recent/latest: date weight up.
- exact title/source/URL/GitHub: metadata/source weight up.
- compare/summarize/what did I learn: chunk diversity up.
- where did I save: item-level recall up.

## Connection plan

### Ask KB plus Brain

Brain embeddings should enhance, not replace, Knowledge retrieval.

Implement:

- Represent Knowledge cards as Brain nodes with source type `knowledge_item`.
- Use `match_brain_nodes` for cross-domain context: projects, goals, quotes, notes, tasks.
- Add an optional "Connected context" strip in Ask KB answers.
- Keep cross-domain retrieval explicit and scoped.

### Ask KB plus Doc Oracle

Doc Oracle should feed Knowledge retrieval.

On extraction completion:

- Create retrieval documents from document analysis, sections, pages, chunks, visual assets, and retrieval tags.
- Preserve page numbers and section paths.
- Let Ask KB answer across all documents.
- Keep Doc Oracle as the deep single-document workspace.

### Ask KB plus AI Knowledge

Add "Apply prompt to retrieved evidence".

Possible entry points:

- Inquiry result card: `Apply prompt`.
- Ask KB panel: `Use prompt template`.
- AI Knowledge run dialog: `Use current Ask KB retrieval`, `Search Knowledge Base first`, `Attach selected items`.

Persist provenance on prompt runs:

```sql
ai_prompt_runs.retrieval_run_id uuid null
ai_prompt_runs.knowledge_item_ids uuid[] default '{}'
ai_prompt_runs.knowledge_chunk_ids uuid[] default '{}'
```

## Feature backlog

### P0

- Add tests for current deterministic matcher and context pack.
- Add `knowledge_retrieval_documents`.
- Add Knowledge semantic match RPC.
- Add `/api/knowledge/retrieve`.
- Refactor Ask AI to retrieve first and synthesize from evidence.
- Return structured citations from assistant endpoint.

### P1

- Rename "Ask AI" to "Ask Knowledge" or "Ask this library".
- Add retrieval scope selector.
- Add retrieved source chips before answer generation.
- Render Markdown in chat responses.
- Add citation cards under assistant answers.
- Add AI Knowledge "apply prompt" bridge.
- Add relevance strips to gallery/table/board during search.

### P2

- Saved retrieval recipes.
- Pin retrieval results.
- Compare selected items.
- "What changed since last week?"
- "Find contradictions in my saved notes."
- "Turn these sources into tasks/project plan."
- "Build a study pack from these items."
- Cross-domain retrieval with Brain, Goals, Projects, Quote Library, and Journal.

## Main risks

- Retrieval quality: deterministic matching works for demo phrasing but misses paraphrases.
- Context loss: `/api/knowledge/assistant` may omit the right evidence due to heuristic excerpt selection.
- Performance: fetching all items and all connections on every chat request will not scale.
- Provenance: answers have no structured citations.
- Product clarity: Knowledge Inquiry, Ask AI, AI Assistant, Doc Oracle, and AI Knowledge sound too similar.
- Privacy/surprise: future cross-domain retrieval must show scope clearly.
- Test coverage: no focused tests exist for Ask KB retrieval or context packing.

## Suggested implementation sequence

1. Add tests around `knowledgeMatching.ts` and `knowledge-assistant-context.ts`.
2. Create the retrieval document migration and match RPC.
3. Backfill retrieval documents from existing Knowledge items.
4. Add `/api/knowledge/retrieve` with deterministic-only mode first.
5. Add semantic mode and hybrid score merge.
6. Refactor `KnowledgeInquiryAgent` to consume retrieval results.
7. Refactor `/api/knowledge/assistant` to synthesize from retrieved evidence only.
8. Add citation rendering in `KnowledgeAIPanel`.
9. Add AI Knowledge prompt application to retrieved evidence.
10. Run lint, unit tests, and browser checks for `/en/knowledge-base` at mobile and desktop widths.

## Evidence files

- `app/src/app/[locale]/(protected)/knowledge-base/page.tsx`
- `app/src/components/knowledge/KnowledgeLayout.tsx`
- `app/src/components/knowledge/KnowledgeInquiryAgent.tsx`
- `app/src/lib/knowledgeMatching.ts`
- `app/src/hooks/use-knowledge-filtered-items.ts`
- `app/src/lib/knowledge/knowledge-list-utils.ts`
- `app/src/components/knowledge/KnowledgeAIPanel.tsx`
- `app/src/app/api/knowledge/assistant/route.ts`
- `app/src/lib/knowledge/knowledge-assistant-context.ts`
- `app/src/types/knowledge.ts`
- `app/src/lib/knowledge/queries.ts`
- `app/src/app/[locale]/(protected)/ai-knowledge/page.tsx`
- `app/src/app/api/ai/knowledge/prompt-run/route.ts`
- `app/src/components/ai-knowledge/PromptRunDialog.tsx`
- `app/src/stores/prompt-store.ts`
- `app/src/lib/repositories/ai-knowledge-prompts.ts`
- `app/supabase/migrations/20260416200000_knowledge_items_ai_fields.sql`
- `app/supabase/migrations/20260503000000_knowledge_source_and_providers.sql`
- `app/supabase/migrations/20270503000000_brain_node_embeddings.sql`
- `app/supabase/migrations/20260620180000_quote_library_embeddings.sql`
- `app/supabase/migrations/20270611190000_document_brain_docoracle.sql`
- `docs/knowledge-base-structure-and-logic.md`

## Validation status

This is an analysis/report artifact. No product code behavior was changed.

Validation performed:

- Local code and docs were inspected with `rg`, `nl`, `sed`, `ls`, and `cat`.
- No runtime tests were run because this task did not modify executable code.

Recommended validation before implementation:

- Unit tests for deterministic matching, context-pack ranking, and future hybrid retrieval.
- Lint and existing unit tests.
- Browser checks for `/en/knowledge-base` at mobile and desktop widths.
