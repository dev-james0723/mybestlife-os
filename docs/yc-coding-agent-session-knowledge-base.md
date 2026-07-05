# Codex session: fixing My Best Life OS Knowledge Base

Production page: https://www.mybestlife-os.com/en/knowledge-base

Agent used: Codex

Note: this production route is authenticated, so unauthenticated visitors are redirected to the login page.

## Original task

I asked Codex to investigate why saving a social URL in the My Best Life OS Knowledge Base was failing in production. The visible error was just a toast saying "Failed to add URL." I wanted the agent to find the real cause, fix it if it was safe, and explain what went wrong.

The page matters because Knowledge Base is one of the main surfaces in My Best Life OS. It is where I save links, documents, social posts, code, videos, notes, and voice memos, then use AI to summarize, retrieve, connect, and ask questions across them.

## Why this session matters

I am proud of this session because Codex behaved like a real engineering partner instead of a text generator. It did not stop at the UI error. It read the codebase, followed the save path, checked the type model, inspected the database behavior, and found the exact boundary that was stale.

The bug was not a frontend bug. It was not Supabase being down either. The app had learned to save newer content types such as `social`, `repository`, `code`, `dataset`, `presentation`, and `quote`, but the production database still had an older check constraint on `knowledge_items.content_type`. Social URLs were classified correctly by the app and then rejected by the database.

That is the kind of coding-agent work I care about: a real production symptom, a cross-layer investigation, a narrow fix, and concrete validation.

## Session flow

1. Codex inspected the protected Next.js route for `/en/knowledge-base` and confirmed the page is user scoped behind authentication.
2. It traced the add flow from the UI modal into `AddKnowledgeModal`, then into `addKnowledgeFromUrl()` in the server mutation layer.
3. It checked the source-aware classifier and confirmed that social URLs were supposed to map to `content_type = 'social'`.
4. It compared the TypeScript content model with the production database constraint.
5. It found the stale `knowledge_items_content_type_check` constraint that still only allowed older values such as `podcast`, `article`, `video`, `file`, `photo`, and `note`.
6. It applied a focused production migration to align the constraint with the current app model.
7. It re-read the constraint definition and ran a rollback-only insert smoke test for `content_type = 'social'` with `source_type = 'social_instagram_reel'`.
8. It confirmed the smoke test succeeded and left no test rows behind.

The final result was simple but important: the Knowledge Base could save the richer source types the product already supported, especially social posts.

## Screenshots

The screenshots below show the main Knowledge Base workspace, graph view, retrieval panel, assistant panel, and add modal.

### Screenshot 1: Main library view

![My Best Life OS Knowledge Base screenshot](https://yc-kb-screenshots.vercel.app/main-library.png)

### Screenshot 2: Constellation graph view

![Knowledge Base Constellation graph view](https://yc-kb-screenshots.vercel.app/constellation-graph.png)

### Screenshot 3: Ask My Knowledge Base panel

![Ask My Knowledge Base assistant panel](https://yc-kb-screenshots.vercel.app/ask-panel.png)

### Screenshot 4: Knowledge retrieval panel

![Knowledge Base retrieval panel](https://yc-kb-screenshots.vercel.app/retrieval-panel.png)

### Screenshot 5: Add Knowledge modal

![Add Knowledge modal with URL, file, text, and voice tabs](https://yc-kb-screenshots.vercel.app/add-knowledge-modal.png)

## What the Knowledge Base can do

### Multi-source capture

The Knowledge Base can save URLs, files, rich text, pasted code, and voice memos. The main capture area supports click-to-add and drag-and-drop for files, links, and text. The Add Knowledge modal sends each input through the right path: URL, file, text, or voice.

The URL classifier recognizes YouTube videos and Shorts, GitHub repositories, X/Twitter posts, Facebook posts and videos, Instagram posts and Reels, Threads posts, Reddit posts, articles, and plain links. Text ingestion can detect code and markup. File ingestion handles documents, PDFs, images, audio, video, spreadsheets, presentations, and general files.

### Provider-aware ingestion and fallbacks

The URL pipeline uses a provider cascade. It tries live embeds, authenticated previews, snapshots, or metadata previews, depending on what the source supports. If a post is private, deleted, login-gated, rate-limited, or unsupported, the item can still fall back to useful metadata or a user snapshot instead of becoming a broken card.

YouTube items can keep their static thumbnails and optionally fetch transcripts. GitHub repository items can analyze repository metadata and README content. Social posts use official embed paths where possible.

### AI enrichment after capture

New items are inserted quickly with a processing state. Then the AI pipeline runs in the background and can generate TLDRs, summaries, content overviews, tags, insights, quotes, questions answered, action items, title suggestions, AI thumbnails, and knowledge-to-knowledge connections.

The processing depends on the source. A YouTube video, a GitHub repository, a code snippet, a social post, a PDF, and a voice memo do not all get treated as the same text blob.

### Retrieval, assistant, and graph views

The page includes an "Ask My Knowledge Base" panel for asking questions across saved material. It runs hybrid retrieval, persists retrieval runs, passes retrieved evidence to the AI assistant, and returns cited answers. If semantic retrieval is unavailable, it can fall back to a context-pack answer or a local deterministic answer.

The page also supports gallery, board, table, and constellation views. These views share the same filtering pipeline, so switching views does not silently change the dataset. The Constellation view turns saved knowledge, tags, categories, collections, sources, and AI-derived connections into a graph.

### Live processing UX

The Knowledge Base subscribes to Supabase realtime updates for `knowledge_items` and document extraction jobs. It also has a polling backup while items are processing, so the UI can still update when realtime is delayed or unavailable. That matters because file extraction, AI summaries, thumbnail generation, transcript generation, snapshot capture, and document parsing are all slow operations.

## Evidence from the repo

Files checked for this session summary:

- `app/src/app/[locale]/(protected)/knowledge-base/page.tsx`
- `app/src/components/knowledge/KnowledgeLayout.tsx`
- `app/src/components/knowledge/AddKnowledgeModal.tsx`
- `app/src/lib/knowledge/mutations.ts`
- `app/src/lib/knowledge/classify.ts`
- `app/src/lib/knowledge/providers/cascade.ts`
- `app/src/components/knowledge/KnowledgeAIPanel.tsx`
- `app/src/app/api/knowledge/retrieve/route.ts`
- `app/src/app/api/knowledge/assistant/route.ts`
- `app/src/hooks/use-knowledge-filtered-items.ts`
- `app/src/components/knowledge/constellation/ConstellationView.tsx`
- `app/src/lib/knowledge/constellation/buildConstellationData.ts`
- `docs/knowledge-base-structure-and-logic.md`

## Outcome

This session turned a vague production error into a fixed database contract. It also showed why the Knowledge Base is the My Best Life OS feature I am most proud of: it combines capture, source classification, previews, storage, extraction, retrieval, citations, visual organization, graph exploration, and failure recovery in one working surface.

For me, the important part is not that Codex wrote a block of code. It helped debug a real system with real state, made a small production-safe change, and validated the fix.
