# Knowledge Base structure and retrieval logic

## Page purpose

The Knowledge Base route is the user's saved intelligence library. It stores articles, notes, files, social posts, GitHub repositories, code snippets, voice memos, videos, and AI-enriched summaries. The page should not behave like a static directory only. Its primary job is fast retrieval: a user should be able to describe an idea, task, problem, or use case and quickly find the most relevant knowledge, skills, codebases, templates, and resources.

## Route and file structure

- Route: `app/src/app/[locale]/(protected)/knowledge-base/page.tsx`
- Loading state: `app/src/app/[locale]/(protected)/knowledge-base/loading.tsx`
- Main client shell: `app/src/components/knowledge/KnowledgeLayout.tsx`
- Main inquiry UI: `app/src/components/knowledge/KnowledgeInquiryAgent.tsx`
- Result controls: `app/src/components/knowledge/KnowledgeTopControlBar.tsx`
- Active filter chips: `app/src/components/knowledge/KnowledgeActiveFiltersBar.tsx`
- Content router: `app/src/components/knowledge/KnowledgeContent.tsx`
- Gallery card: `app/src/components/knowledge/KnowledgeCard.tsx`
- Board view: `app/src/components/knowledge/KnowledgeBoardView.tsx`
- Table view: `app/src/components/knowledge/KnowledgeTableView.tsx`
- Directory/sidebar: `app/src/components/knowledge/KnowledgeSidebar.tsx`
- AI chat side panel: `app/src/components/knowledge/KnowledgeAIPanel.tsx`
- Store: `app/src/stores/knowledge-store.ts`
- Shared list filtering: `app/src/hooks/use-knowledge-filtered-items.ts`
- Legacy/list utilities: `app/src/lib/knowledge/knowledge-list-utils.ts`
- Deterministic inquiry matcher: `app/src/lib/knowledgeMatching.ts`
- Speech hook: `app/src/hooks/useSpeechRecognition.ts`
- Source labels and categories: `app/src/lib/knowledge/labels.ts`
- Data queries: `app/src/lib/knowledge/queries.ts`
- Core types: `app/src/types/knowledge.ts` and `app/src/types/knowledge-source.ts`

## Server data flow

`page.tsx` creates a server Supabase client, checks the server page user, redirects unauthenticated users to `/{locale}/login`, then fetches:

- `getKnowledgeItems(user.id)`
- `getSmartCollections(user.id)`

Those arrays are passed into `KnowledgeLayout`, which hydrates the Zustand store. The page also subscribes to realtime changes for `knowledge_items` and `document_extraction_jobs`. A polling backup refreshes processing rows when realtime is unavailable.

## Client state model

`useKnowledgeStore` owns:

- Raw data: `items`, `smartCollections`
- View mode: `gallery`, `board`, `table`, `constellation`
- Filters: content types, source categories, quick filters, smart collection, taxonomy tag, search query
- Selection and modals: selected item, add modal, AI panel, mobile sidebar
- Sort: latest, updated, relevance, linked, title A-Z, content type, source date
- Constellation-specific graph state

The new inquiry UI writes into the existing `searchQuery` and `sortBy` state instead of creating a parallel list state. This keeps gallery, board, table, active chips, and constellation search behavior coherent.

## Layout structure

Top-level structure:

1. `PageShell` renders the themed page heading and actions.
2. `KnowledgeSidebar` renders the collapsible directory on desktop and a sheet on mobile.
3. The main column renders `KnowledgeInquiryAgent` first for text/voice natural-language retrieval.
4. The result card renders `KnowledgeTopControlBar`, `KnowledgeActiveFiltersBar`, and `KnowledgeContent`.
5. `KnowledgeAIPanel` opens as a right panel on desktop and a full-screen overlay on mobile.
6. `KnowledgeDetailSheet` opens when a user selects an item.
7. `AddKnowledgeModal` opens from page actions or shortcuts.

Constellation view hides the inquiry agent and list controls so the graph has maximum space and stable layout.

## User journey

The optimized journey is:

1. User lands on Knowledge Base and sees the inquiry box before filters.
2. User types or speaks a natural-language request.
3. The agent moves through listening, transcribing, analyzing, and matching states.
4. The agent ranks the top matches and explains why each one matched.
5. The same inquiry also updates the shared `searchQuery`, so the main list filters and sorts by relevance.
6. User can open an item, copy a prompt, or escalate the same inquiry to the AI side panel.
7. User can still refine by type, quick filters, categories, smart collections, and tags.

## Content schema

`KnowledgeItem` supports:

- Identity and ownership: `id`, `userId`
- Core content: `title`, `contentType`, `rawContent`
- Source metadata: `sourceUrl`, `sourceDomain`, `sourceType`, `provider`, `label`, `category`, `sourceMetadata`
- AI enrichment: `aiTldr`, `aiSummary`, `aiContentOverview`, `aiTags`, `aiKeyInsights`, `aiKeyQuotes`, `aiQuestionsAnswered`, `aiActionItems`
- Manual enrichment: `manualTags`
- Media and previews: `thumbnailUrl`, `screenshotUrl`, `embedHtml`, `renderMode`, `previewStatus`
- Processing state: `status`, `processingStep`, `errorDetails`, `documentBrainJob`
- Document/video affordances: `youtubeTranscript`, `aiVideoChatStarters`, `askEnabled`
- Graph metadata: `connections`
- Dates: `dateAdded`, `dateModified`

Current limitations:

- There are no first-class `useCases`, `skillType`, `resourceType`, `difficulty`, or `relatedTechnologies` fields.
- The matcher infers those concepts from title, summaries, tags, source labels, category, collections, and raw content.
- Future semantic retrieval would be stronger if ingestion wrote structured retrieval metadata per item.

## Filtering logic

`useKnowledgeFilteredItems` applies filters in this order:

1. Quick filters
2. Content type filters
3. Source category filters
4. Smart collection filter
5. Tag taxonomy filter
6. Search/inquiry filter
7. Sort

The hook returns `items`, `filteredItems`, and a small filter summary. `KnowledgeContent` uses that output for gallery, board, and table. Constellation also uses this shared model so view switching does not feel like a dataset jump.

## Search and matching logic

The old search path was mostly substring-based. A long inquiry such as "I am designing a SaaS payment page..." could fail because no item contains the full query as a single string.

The new `knowledgeMatching.ts` module adds deterministic intent scoring:

- Normalizes and tokenizes the inquiry.
- Expands known concepts and synonyms.
- Scores item fields with weights:
  - Title: highest weight
  - Tags: high weight
  - Category/source/collection: medium-high weight
  - Questions/action items/summaries/overview: medium weight
  - Raw content/key insights/key quotes: lower weight
- Detects concepts such as SaaS, payment/billing, Cloud Code or agent skills, codebase/repository, frontend UX, templates, and research/reference.
- Produces normalized relevance from 0 to 100.
- Produces confidence levels: low, medium, high, very-high.
- Generates item-specific reasons from actual field hits, matched keywords, matched concepts, category, source type, and inquiry intent.
- Suggests a next action per item.

`knowledge-list-utils.ts` now uses the matcher for list search and relevance sorting, while preserving legacy substring checks as a fallback.

## Category logic

Source-aware category data comes from `KnowledgeCategory`:

- article
- video
- audio
- image
- social_media
- repository
- code
- markup
- note
- file

`labels.ts` centralizes source-type presentation and category order. The sidebar counts item categories and renders only categories that exist in the current library. Cards render source-aware labels first, then fall back to legacy content-type labels.

## Card structure

`KnowledgeCard` renders:

- Preview/media area, using render mode when available
- Source/type badge
- Depth/status badges
- Title
- Error/processing/summary text
- Up to three tags plus overflow count
- Optional document-oracle region
- Footer metadata: source/domain, relative age, connections

Known limitation: the main gallery cards do not yet show full "why this matched" explanations. Those explanations are shown in the new inquiry agent's ranked result cards. A future pass could add a compact relevance strip to `KnowledgeCard` when search is active.

## UI states

Existing states:

- Page loading skeleton
- Empty library
- No filtered matches
- Processing item card state
- Error item card state
- Add modal upload/recording/transcription states
- AI panel thinking/error/fallback states
- Mobile sidebar open/closed
- Desktop directory collapsed/expanded

New inquiry states:

- idle
- listening
- transcribing
- analyzing
- matching
- results ready
- no strong matches
- error

Speech fallback states:

- Browser does not expose SpeechRecognition
- Browser or Permissions-Policy blocks microphone access
- Speech recognition starts but errors

## Animation and interaction logic

The page already uses Framer Motion. The new agent uses small opacity/position entry transitions, pulse states, and loading spinners. Tailwind `motion-safe` classes are used where possible so animation is reduced when the user requests reduced motion. Existing sidebar collapse and AI panel transitions already use Framer Motion and reduced-motion handling.

## Responsive behavior

Desktop:

- Sidebar is a collapsible left directory.
- Inquiry agent and ranked results render in a two-column tool surface.
- AI panel opens as a right-side panel.

Tablet/mobile:

- Sidebar moves into a sheet.
- Inquiry agent stacks vertically.
- Textarea and microphone/search buttons remain thumb-friendly.
- Result controls wrap into multiple rows.
- AI panel opens as a full-screen overlay.

## Live production audit findings

Production target inspected: `https://www.mybestlife-os.com/en/knowledge-base`.

Observed behavior:

- The route redirects unauthenticated users to `/en/login`, so full production KB UI inspection requires an authenticated browser session.
- The response had `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, which blocks same-origin microphone usage.
- The codebase also has an existing voice memo recorder in Add Knowledge, so the policy was already inconsistent with product behavior.

Implemented fix:

- `app/next.config.ts` now uses `microphone=(self)`.

## Audit findings and priorities

### P0

- Microphone was blocked globally by `Permissions-Policy`, preventing speech input and likely affecting existing voice memo capture in production.
- Natural-language search was brittle because list search primarily checked whether the whole query appeared in each item field.

### P1

- Primary search was visually buried inside the results card, below the page header and beside secondary controls.
- Filters and categories competed with the main retrieval task.
- The AI panel was useful but separate from fast retrieval, so users had to know when to use search vs Ask AI.
- Result cards did not explain why they were relevant.
- No explicit agent state existed for listening, transcribing, analyzing, matching, no strong matches, and errors.
- Missing retrieval metadata fields forced inference from loosely structured text.

### P2

- The sidebar has several overlapping grouping systems: content type, source category, smart collection, and tag taxonomy.
- Gallery cards are dense and can hide retrieval-specific metadata.
- Active filter chips are clear, but they do not distinguish a natural-language inquiry from a short keyword.
- The table view has strong scanability but no relevance explanation column.
- Loading skeletons still reflect the older directory-first mental model.

## Improvement opportunities

- Add structured fields during ingestion: `useCases`, `skillType`, `resourceType`, `difficulty`, `relatedTechnologies`, `audience`, `outputFormats`.
- Persist a retrieval document per item for embeddings.
- Add a compact "why matched" strip to gallery/table when `searchQuery` is active.
- Add saved searches or pinned retrieval recipes.
- Let users choose whether an inquiry searches all knowledge or only the currently filtered subset.
- Add tests around concept expansion and score ordering.
- Add production browser tests with an authenticated session.

## Speech-search architecture

Current version:

- Hook: `useSpeechRecognition`
- API: browser-native `SpeechRecognition` / `webkitSpeechRecognition`
- No new dependency
- Final transcript populates the inquiry input
- Transcript automatically triggers deterministic matching
- User can edit transcript manually after it lands in the textarea
- Unsupported browsers fall back to typed inquiry
- Permission errors show inline status text

Production requirement:

- `Permissions-Policy` must include `microphone=(self)`.
- The page must be served over HTTPS or localhost for microphone APIs.

## Intelligent matching architecture

Current version:

- Deterministic scorer in `knowledgeMatching.ts`
- Concept dictionary and synonym expansion
- Weighted field scoring
- Confidence and score output
- Reason generation from actual matched item metadata
- Suggested next action

Future upgrade path:

1. Keep `KnowledgeMatchResult` as the UI contract.
2. Add a server endpoint that embeds the inquiry and compares it against per-item retrieval documents.
3. Merge semantic scores with deterministic metadata scores.
4. Keep deterministic scoring as a fallback when embedding infrastructure is unavailable.
5. Store reason evidence as field snippets rather than generic text.

## Example matching behavior

Inquiry:

`I am designing a SaaS payment page and need Cloud Code skills for checkout, billing, or Stripe.`

Expected match signals:

- SaaS concept: `saas`, `subscription`, `pricing`, `onboarding`
- Payment concept: `payment`, `checkout`, `billing`, `stripe`
- Skill/code concept: `cloud code`, `claude code`, `codex`, `skill`, `prompt`, `template`, `github`
- Frontend concept: `ui`, `ux`, `design`, `component`, `flow`

Expected result explanation style:

- "Matches the inquiry intent around SaaS, payment and billing, and Cloud Code / agent skills, with overlap on checkout, Stripe, billing."
- "Strongest signal comes from the item's tags."
- "Relevant to designing or implementing a checkout, pricing, or billing step."

