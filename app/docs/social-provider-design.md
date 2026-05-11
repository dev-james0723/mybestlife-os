# Social Embed Provider Architecture — Design Document

> Authoritative design for the cascade-based provider architecture replacing
> the current single-shot `ingestSocialPost()` flow. Implementation reference
> for tasks #3, #4, #5, #7, #8, #10, #13, #14.

## 0. Scope and goals

This document specifies the cascade-based provider architecture that replaces the current single-shot `ingestSocialPost()` flow in `src/lib/knowledge/providers/social.ts` and the surrounding `if/else` switch in `addKnowledgeFromUrl()` (`src/lib/knowledge/mutations.ts:333-424`).

It applies to every URL ingest path — not just social — because the cascade also has to terminate cleanly with a snapshot or metadata fallback for arbitrary HTTPS URLs.

**Hard constraints (locked):**
1. Vercel serverless. `@sparticuz/chromium` + `playwright-core` cold-start budget is real (~600–900 ms cold + ~1.5–2.5 s page goto). Snapshot work happens in `after()` callbacks or dedicated route handlers, never on the synchronous insert path.
2. Even with valid Meta OAuth, IG/FB iframes break inside our `allow-scripts` sandbox. `MetaEmbedProvider` returns *data*, not an iframe — the *visual* is filled by `ScreenshotSnapshotProvider`.
3. Tokens are AES-256-GCM at rest. Providers receive a `connection` from the cascade — never `process.env`, never DB rows.

## 1. Type contracts

### 1.1 `RenderMode` and `PreviewStatus`

Already added in `src/types/knowledge-source.ts` by the schema migration (Task #1).

### 1.2 `KnowledgePreviewResult` — extending `NormalizedIngest`, NOT replacing

Extend the existing `NormalizedIngest` with these new fields rather than introducing a parallel type:

- `renderMode: RenderMode` (required)
- `previewStatus: PreviewStatus` (required)
- `iframeUrl?: string` — direct iframe URL when applicable
- `embedScriptUrl?: string` — widget hydration script (rare)
- `screenshotUrl?: string` — auto / user / authenticated_preview snapshot
- `extractedText?: string` — long-form readable text (caption / selftext / OG description)
- `caption?: string` — just the user-visible caption (Meta posts), separated from authorLine
- `authorName?: string` — mirrors `metadata.author`
- `authorHandle?: string` — mirrors `metadata.handle`
- `aiTitle?: string` — populated by AI job, not provider
- `oneSentenceSummary?: string` — populated by AI job
- `shortDescription?: string` — populated by AI job
- `tags?: string[]` — populated by AI job
- `detectedLanguage?: string` — provider or AI
- `errorMessage?: string` — user-facing reason for failure states
- `checkedAt: string` (required) — RFC3339
- `rawProviderPayload?: unknown` — debug only
- `screenshotRequested?: boolean` — internal cascade flag (stripped before persistence)
- `canonicalUrl?: string` — promoted from `metadata.canonicalUrl` for ergonomics

**Storage policy:** all of the above EXCEPT `renderMode`, `previewStatus`, `checkedAt`, `screenshotUrl` live inside `source_metadata` JSONB. The four exceptions are top-level columns because they're queried by sidebar filters or health-check sweeps. Matches the existing project pattern of keeping schema lean.

`extractionStatus` is preserved for backwards compatibility — derived from `previewStatus` via `deriveExtractionStatus()`.

### 1.3 `SocialProvider` interface

```ts
// src/lib/knowledge/providers/registry.ts

export interface ProviderContext {
  userId: string;
  connection: DecryptedConnection | null;
  locale: string;
  timeoutMs: number;
  screenshot: ScreenshotService;
  classification: ClassifyResult;
  rawUrl: string;
}

export interface ScreenshotService {
  capture(input: {
    url: string;
    mode: "post" | "fullpage";
    viewport?: { width: number; height: number };
    waitForSelector?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  }): Promise<{
    storagePath: string;
    publicUrl: string;
    width: number;
    height: number;
    capturedAt: string;
  }>;
}

export interface SocialProvider {
  name: string;
  priority: number;
  match(url: URL, classification: ClassifyResult): boolean;
  extract(url: string, ctx: ProviderContext): Promise<NormalizedIngest>;
  requiresAuth?: boolean;
  healthCheck?(result: NormalizedIngest): boolean;
}
```

`match()` reuses the existing `ClassifyResult` from `classify.ts` rather than re-deriving — keeps URL routing in one place.

## 2. Cascade algorithm

### 2.1 Where it plugs in

`addKnowledgeFromUrl()` in `mutations.ts:333` currently has an if/else over `classification.provider`. The whole block is replaced by:

```ts
ingest = await runProviderCascade(url, {
  userId: user.id,
  classification,
  locale: targetLanguage ?? "en",
});
```

The branch on `classification.provider === "youtube"` to compute `youTubeStaticThumb` (line 386) stays — it reads from the URL, not from the ingest result.

### 2.2 The cascade body

```ts
export async function runProviderCascade(
  rawUrl: string,
  opts: { userId: string; classification: ClassifyResult; locale: string },
): Promise<NormalizedIngest> {
  const url = new URL(rawUrl);
  const candidates = REGISTRY
    .filter((p) => p.match(url, opts.classification))
    .sort((a, b) => a.priority - b.priority);

  if (candidates.length === 0) {
    return makeUnavailableResult({ ...opts, previewStatus: "unsupported_url" });
  }

  const errors: Array<{ provider: string; status: PreviewStatus; msg?: string }> = [];

  for (const provider of candidates) {
    const connection = provider.requiresAuth
      ? await loadConnection(opts.userId, provider.name)
      : null;

    if (provider.requiresAuth && !connection) {
      errors.push({ provider: provider.name, status: "api_permission_missing" });
      continue;
    }

    const ctx: ProviderContext = { /* ... */ };
    let result: NormalizedIngest;
    try {
      result = await provider.extract(rawUrl, ctx);
    } catch (err) {
      errors.push({ provider: provider.name, status: "extraction_failed", msg: String(err) });
      continue;
    }
    if (provider.healthCheck && !provider.healthCheck(result)) {
      errors.push({ provider: provider.name, status: "extraction_failed" });
      continue;
    }

    if (isSuccessRenderMode(result.renderMode)) {
      // authenticated_preview → chain a snapshot to fill in the visual
      if (result.renderMode === "authenticated_preview" || result.screenshotRequested) {
        const snap = await SnapshotProvider.extract(rawUrl, ctx);
        if (snap.renderMode === "auto_snapshot") {
          result = mergeAuthDataWithSnapshot(result, snap);
        }
      }
      return result;
    }

    errors.push({ provider: provider.name, status: result.previewStatus, msg: result.errorMessage });
  }

  return makeUnavailableResult({ ...opts, previewStatus: pickWorstStatus(errors) });
}
```

### 2.3 The snapshot chain — Design A (chosen)

`MetaEmbedProvider` sets `screenshotRequested: true` when it returns `authenticated_preview`; the cascade detects the flag and chains `SnapshotProvider`. Rejected alternative: cascade unconditionally runs snapshot after `authenticated_preview`.

**Rationale:** the provider knows whether it needs a snapshot. An explicit flag is opt-in, testable, and visible at the call site. Future providers (LinkedIn, Mastodon) might NOT need snapshots — hard-coding the rule in the cascade pre-commits us.

### 2.4 Snapshot timing on serverless

Cold start for `@sparticuz/chromium` is too expensive for the synchronous insert path. **Pattern: defer to `after()`.**

- `SnapshotProvider.extract()` synchronously returns a placeholder result with `renderMode: "auto_snapshot"`, `screenshotUrl: null`, `previewStatus: "auto_snapshot_success"`.
- It enqueues the actual capture into `after()` — same mechanism `addKnowledgeFromUrl` already uses for the AI job.
- The `after()` callback runs Playwright, uploads the PNG to the `knowledge-files` bucket under `snapshots/{user_id}/{uuid}.png`, inserts a `knowledge_assets` row, and `UPDATE`s `knowledge_items.screenshot_url`.
- The card UI re-renders via Supabase realtime (existing dashboard wiring), or on next navigation.

## 3. Provider registry

| name | priority | match | requiresAuth | renderMode |
|---|---|---|---|---|
| `XEmbedProvider` | 10 | x.com / twitter.com / mobile.twitter.com + `/status/{id}` | no | `true_live_embed` |
| `RedditEmbedProvider` | 10 | reddit.com + `/comments/` | no | `true_live_embed` |
| `YouTubeProvider` | 10 | matches `isYouTubePageUrl()` | no | `true_live_embed` |
| `GitHubProvider` | 20 | matches `parseGitHubRepoUrl()` | optional | `metadata_preview` (text-only) |
| `MetaEmbedProvider` | 30 | instagram / facebook / threads via Meta OAuth | optional | `authenticated_preview` (visual via snapshot) |
| `ThreadsTokenlessProvider` | 35 | threads.net / threads.com (public oEmbed) | no | `true_live_embed` |
| `ScreenshotSnapshotProvider` | 80 | any `https:` | no | `auto_snapshot` |
| `GenericMetadataProvider` | 90 | any `https:` | no | `metadata_preview` |
| `UserSnapshotProvider` | 100 | never matches automatically | no | `user_snapshot` |

Numeric gaps reserve room for future providers (TikTok, LinkedIn, Mastodon) without renumbering.

## 4. File layout

```
src/lib/knowledge/providers/
├── index.ts                         # re-exports
├── types.ts                         # NormalizedIngest (extended)
├── registry.ts                      # NEW — REGISTRY + interfaces + ProviderContext
├── cascade.ts                       # NEW — runProviderCascade()
├── article.ts                       # KEEP (wrapped by GenericMetadataProvider)
├── github-provider.ts               # KEEP (wrapped by GitHubProvider)
├── youtube-provider.ts              # KEEP (wrapped by YouTubeProvider)
├── markup.ts                        # KEEP (text/code path; doesn't go through cascade)
├── snapshot.ts                      # NEW — ScreenshotSnapshotProvider + ScreenshotService
├── user-snapshot.ts                 # NEW — UserSnapshotProvider
├── metadata.ts                      # NEW — GenericMetadataProvider (wraps article.ts)
└── social/
    ├── index.ts                     # NEW
    ├── shared.ts                    # NEW — sanitizeSocialHtml, isAllowedEmbedSrc, decodeHtmlEntities
    ├── x.ts                         # NEW — XEmbedProvider
    ├── reddit.ts                    # NEW — RedditEmbedProvider
    ├── meta.ts                      # NEW — MetaEmbedProvider
    └── threads.ts                   # NEW — ThreadsTokenlessProvider

src/lib/social/
├── connection-store.ts              # NEW — load/decrypt SocialConnection
└── token-crypto.ts                  # NEW — AES-256-GCM wrappers
```

`social.ts` (the old monolith) is deleted; its 800 LOC are split per the table above. `mutations.ts` line 386 (`youTubeStaticThumb`) stays — it's URL-based, not result-based.

## 5. Status mapping

### 5.1 Provider → previewStatus

See full table in design discussion. Highlights:

- **Meta error subcodes** — `MetaEmbedProvider` distinguishes `login_required` (subcode 1357007), `api_permission_missing` (code 100 / subcode 33), `app_review_required` (code 200 / subcode 458), `rate_limited` (code 4 or HTTP 429).
- **YouTube age/geo restriction** — oEmbed 401 with `embeddable: false` → `age_restricted` or `geo_restricted` based on response shape.
- **Reddit private subreddit** — 403 with `quarantined` flag → `private_or_restricted`.
- **GitHub** — 404 → `private_or_restricted` (could be private OR not exist; we err on the polite side).

### 5.2 previewStatus → legacy extractionStatus

```ts
function deriveExtractionStatus(s: PreviewStatus): ExtractionStatus {
  switch (s) {
    case "embed_success":
    case "authenticated_data_success":
    case "auto_snapshot_success":
    case "user_snapshot_success":
      return "success";
    case "metadata_success":
      return "partial";
    case "login_required":
    case "private_or_restricted":
    case "api_permission_missing":
    case "app_review_required":
      return "requires_auth";
    case "age_restricted":
    case "geo_restricted":
    case "deleted_or_unavailable":
      return "blocked";
    case "rate_limited":
    case "screenshot_failed":
    case "metadata_unavailable":
    case "extraction_failed":
      return "failed";
    case "unsupported_url":
      return "unsupported";
  }
}
```

## 6. Open questions — resolutions (lead-decided)

- **6.1 Snapshot chain authority:** Design A (provider opts in via `screenshotRequested`). Done.
- **6.2 ToS for snapshots:** flag for legal review post-implementation; gate IG/FB snapshots on user having connected Meta as a defensive measure (so we use cookies of an account the user owns).
- **6.3 Snapshot storage budget:** retention policy + WebP re-encoding deferred to follow-up; document the bucket-quota concern.
- **6.4 Token rotation UX:** Settings UI surfaces "Reconnect" state (Task #9).
- **6.5 Cold-start warm-up cron:** skip; users tolerate the first-snapshot delay.
- **6.6 `iframeUrl` vs `embedHtml`:** populate both for `true_live_embed`. Migrate to `iframeUrl`-only in a follow-up.
- **6.7 Health check semantics:** false = try next provider (fall-through). Done.
- **6.8 Per-provider timeouts:** X/Reddit/Meta oEmbed = 9s; GitHub = 10s; snapshot inline placeholder = 100ms; snapshot deferred job = 30s; generic metadata = 8s.
- **6.9 Realtime subscription:** add `screenshot_url` to the dashboard subscription (Task #14).
- **6.10 AI fields on result:** keep optional on `NormalizedIngest` for now; provider leaves undefined, AI job populates. Refactor to `KnowledgeAIDerivatives` only if it becomes painful.
