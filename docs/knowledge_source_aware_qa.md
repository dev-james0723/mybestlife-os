# Knowledge Source-Aware Ingestion — Manual QA Checklist

Use this checklist after any non-trivial change to the Knowledge ingestion
pipeline (classifier, provider adapters, derivatives, rendering). It
intentionally mirrors the "target user experience" section of the spec.

## 1. Setup

- [ ] App running locally (`cd app && npm run dev`; Next prints the URL, default http://localhost:3000)
- [ ] Logged in as a real user (non-bypass) so Supabase writes succeed
- [ ] `GEMINI_API_KEY` present in `app/.env.local` — needed for AI derivatives
- [ ] (Optional) `GITHUB_TOKEN` to avoid GitHub rate-limit surprises
- [ ] Automated tests pass: `cd app && npm run test:knowledge`
- [ ] Type check passes: `cd app && npx tsc --noEmit`

## 2. Add Knowledge — URL tab

### Detection badge
- [ ] Pasting nothing → no badge, default blurb shows
- [ ] Pasting `https://example.com/foo` → badge reads **Article**
- [ ] Pasting `https://www.nytimes.com/...` → badge reads **Article**
- [ ] Pasting `https://www.youtube.com/watch?v=…` → badge reads **YouTube Video**
- [ ] Pasting `https://youtube.com/shorts/…` → badge reads **YouTube Shorts**
- [ ] Pasting `https://x.com/u/status/1` → badge reads **X Post**
- [ ] Pasting `https://x.com/u/status/1/video/1` → badge reads **X Video Post**
- [ ] Pasting `https://www.instagram.com/p/abc` → badge reads **Instagram Post**
- [ ] Pasting `https://www.instagram.com/reel/abc` → badge reads **Instagram Reel**
- [ ] Pasting `https://fb.watch/abc` → badge reads **Facebook Video Post**
- [ ] Pasting `https://www.reddit.com/r/x/comments/1/t` → badge reads **Reddit Post**
- [ ] Pasting `https://github.com/vercel/next.js` → badge reads **GitHub Repository**

### Provider-specific options
- [ ] YouTube URL shows a **Generate transcript** toggle (off by default)
- [ ] Social URLs show the "AI chat is disabled for social posts" hint
- [ ] GitHub URL shows the "we'll fetch the README and summarise it" hint

### Submit flow
- [ ] Article URL: card created with title, source domain, summary within a
      few seconds. `Ask the Document` appears in the detail sheet.
- [ ] Article URL that returns 403/404: card still created with degraded
      status ("Partial" or "Extraction failed" chip visible on the card)
- [ ] YouTube URL with transcript OFF: card created with metadata + summary +
      Ask-the-Video. `Transcript: not requested` state shown in detail sheet.
- [ ] YouTube URL with transcript ON: card created, transcript body visible,
      Ask-the-Video uses transcript.
- [ ] YouTube URL where transcript fails: card still created, transcript
      status reads **Unavailable**.
- [ ] YouTube Shorts URL: "YouTube Shorts" label used throughout.
- [ ] X Post URL: card created with author handle, post embed renders inside
      the detail sheet. Social summary populated. **No Ask-the-Document
      button**.
- [ ] Instagram / Facebook URL: card created with available metadata + hero
      image. If embed is unavailable, "View original" link still works.
- [ ] Reddit post URL: card created with subreddit + author + post body.
- [ ] GitHub repo URL: card created, README renders like GitHub (Preview
      tab). Switch to Source shows raw markdown. "Open on GitHub" link works.
- [ ] GitHub repo with no README: card still created with metadata only.

## 3. Add Knowledge — Text tab

- [ ] Type plain prose → detection badge shows **Plain Text**. Display-mode
      picker NOT shown.
- [ ] Paste Markdown (headings + list) → badge shows **Markdown**, display-
      mode picker appears (default Preview).
- [ ] Paste HTML → badge shows **HTML**, display-mode picker appears (default
      Preview).
- [ ] Paste Python snippet → badge shows **Python**, no display-mode picker.
- [ ] Paste JavaScript snippet → badge shows **JavaScript**.
- [ ] Paste CSS → badge shows **CSS**.
- [ ] Switch display-mode to Source on Markdown/HTML — preference saved on
      submit, card honours it on reload.
- [ ] Title auto-generation still works (debounced).

## 4. Detail Sheet rendering

- [ ] Source badge in the header matches the item's source type (colour +
      icon).
- [ ] Extraction partial/failed banner visible when `extraction_status !==
      'success'`.
- [ ] Article items show **Ask the Document** button; YouTube items show
      **Ask the Video**; social items show **neither**.
- [ ] Article items with a sourceUrl show a **View original** outbound link.
- [ ] YouTube items show **View on YouTube**.
- [ ] GitHub items show **Open on GitHub**.
- [ ] Social items embed using provider's script (X widgets.js, Instagram
      embed, Reddit embed, Facebook SDK) inside the sandboxed iframe.
- [ ] Markdown items: Preview tab renders formatted markdown (headings,
      lists, code). Source tab shows raw markdown.
- [ ] HTML items: Preview renders safely in sandboxed iframe. Source shows
      the raw HTML code block with copy action.
- [ ] Python/JS/Java/PHP/CSS items: show Source only (no Preview tab), with
      a Copy button and a language badge.

## 5. Mobile fullscreen (the long-standing bug)

- [ ] **iOS Safari** — open an HTML item → tap Full page → overlay covers
      the entire viewport, close button visible, content scrolls, notch is
      respected, rotating to landscape keeps chrome accessible.
- [ ] **iOS Safari** — open a Markdown item → Full page → markdown renders
      readable, scroll works, ESC/close button returns to card.
- [ ] **iOS Safari** — open a Python item → Full page → code block fills
      the screen with proper scroll (no clipping).
- [ ] **Android Chrome** — same three checks as iOS.
- [ ] Desktop browser — Full page still works, ESC closes, tab order is
      sensible.

## 6. Ask the Document

- [ ] Article: sending a question returns an answer grounded in summary +
      body. Mention a specific phrase in the article to verify grounding.
- [ ] Markdown / HTML / Code: Ask the Document answers with content from
      the raw source.
- [ ] GitHub: Ask the Document answers questions about README contents.
- [ ] Social posts: clicking Ask the Document does NOT appear in UI. Direct
      `POST /api/knowledge/document-chat` with `itemId` of a social post
      returns HTTP 403 (`ask_disabled`).

## 7. Partial / failure states

- [ ] Article fetch failure: card still created, status = failed, retry
      button works.
- [ ] Social embed unavailable (provider script blocked): fallback card
      shows extracted text + View original.
- [ ] GitHub repo not found / private: error surfaced as a retryable state,
      not a silent drop.
- [ ] Code item with zero content: no AI summary generated; status moved to
      error with "content_extraction" step.

## 8. Sidebar / filters

- [ ] New **Categories** section appears below Library.
- [ ] Clicking **Social Media** filters to only social items.
- [ ] Multiple categories can be active at once.
- [ ] Counts reflect the actual number of items in each category.

## 9. Migration smoke checks

- [ ] Run the migration twice in a row — second run is a no-op (idempotent).
- [ ] Existing cards (created before the migration) still render properly;
      legacy `contentType` is used for their badge when `sourceType` is
      null.
- [ ] Existing YouTube cards don't lose their thumbnail / transcript.
