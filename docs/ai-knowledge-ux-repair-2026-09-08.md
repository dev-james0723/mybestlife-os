# AI Knowledge UX repair receipt — 2026-09-08

## Execution state

- **Implemented and validated locally only.**
- No Git commit, push, Vercel deployment, production migration, production write, successful external AI-chat session, or prompt submission was performed. One isolated DeepSeek prefill probe was attempted and blocked by CloudFront with HTTP 403.
- Browser verification used an optimized local Next.js production build, synthetic authentication/data, a local HTTP fixture, a mocked clipboard, and intercepted `window.open` calls.
- The worktree was already substantially dirty. This task preserved unrelated changes and did not stage or revert them.

## Delivered behavior

### Prompt detail actions

- Removed the detail-level **Run with AI** CTA from both the modal and the shareable `/ai-knowledge/[id]` route.
- Added a **Copy prompt** action.
- Added five named new-tab actions in this exact order: **ChatGPT, Gemini, Claude, Grok, DeepSeek**.
- Added recognizable local provider glyphs to every provider button on both detail surfaces. The full provider names remain visible and each button retains a descriptive accessible label.
- The dispatcher opens the tab synchronously during the click event, then copies the prompt, which preserves browser user activation more reliably on Safari/iPadOS.
- ChatGPT, Gemini, Claude, and Grok receive a URL-encoded `q` value when it is within the encoded URL limit. The clipboard is always populated as a fallback.
- DeepSeek opens its clean public chat URL and copies the prompt because no supported public prompt-prefill URL contract was found. Its toast tells the user to paste.

Provider glyph path sources were retrieved on 2026-09-08 from the matching SVGs at `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/`. The marks identify destinations only and do not imply provider endorsement.

### AI prompt creator

- Replaced the eight-field wizard surface with three lightweight questions:
  1. desired outcome or an existing rough prompt;
  2. optional context;
  3. optional output format and tone.
- Only the first answer is required. Optional steps can be skipped.
- No AI request occurs until the user selects **Build my prompt**.
- The client sends only `goalOrRoughPrompt`, `context`, `outputFormat`, and `toneStyle`; the server schema rejects extra legacy fields.
- AI output remains editable before saving.
- Saved variable metadata is reconciled from the final edited `{placeholder}` set, so removed placeholders are discarded and newly typed placeholders get safe defaults.

### Labels and controls

- Category selectors render localized human names such as **Life & Personal Growth**, never internal enum values such as `life_personal_growth`.
- Filter triggers render **All categories**, **All subcategories**, and **Filter by tag** instead of exposing the internal `__all__` sentinel.
- Removed the redundant command-palette button from the page header; the search field remains the single visible search/keyboard-shortcut entry point.
- Repaired the shared GSAP dialog transform so centered modals keep their percentage translation and all lower actions remain reachable.

## Intended file scope

- `app/src/app/[locale]/(protected)/ai-knowledge/page.tsx`
- `app/src/app/[locale]/(protected)/ai-knowledge/[id]/page.tsx`
- `app/src/app/api/ai/knowledge/prompt-wizard/synthesize/route.ts`
- `app/src/components/ai-knowledge/AIProviderIcon.tsx`
- `app/src/components/ai-knowledge/AiKnowledgeFilterBar.tsx`
- `app/src/components/ai-knowledge/BlankPromptForm.tsx`
- `app/src/components/ai-knowledge/CustomPromptEditDrawer.tsx`
- `app/src/components/ai-knowledge/PromptDetailDrawer.tsx`
- `app/src/components/ai-knowledge/prompt-wizard/PromptCreatorWizard.tsx`
- `app/src/hooks/use-gsap-popup.ts`
- `app/src/lib/ai/clipboard.ts`
- `app/src/lib/ai/dispatcher.ts`
- `app/src/lib/ai/prompt-wizard-synthesize.ts`
- `app/src/lib/ai/tool-registry.ts`
- `app/src/lib/i18n/ai-knowledge-ui.ts`
- Focused tests in `app/src/lib/ai/*.test.ts` and `app/src/lib/i18n/ai-knowledge-ui.test.ts`
- Verification assets in `artifacts/ai-knowledge-ux-2026-09-08/`
- `app/.gitignore` entry for isolated AI Knowledge Next.js output directories

Some listed tracked files already contained unrelated local edits before this task. The list records the task's intended touch points, not ownership of every line in their complete Git diff.

## Validation

### Optimized production build

Command shape:

```bash
NEXT_OUTPUT_DIR=.next-ai-knowledge-prod-v2 \
NEXT_PUBLIC_DEV_LOGIN_BYPASS=true \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54325 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=local-fixture \
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-fixture \
npm run build
```

Result: **PASS**. Next.js 16.2.6 compiled successfully, completed TypeScript analysis, generated `193/193` static pages, collected traces, and finalized route optimization. The temporary output is ignored. Next.js-added temporary `tsconfig.json` include lines were removed afterward.

### Browser verification

```bash
node artifacts/ai-knowledge-ux-2026-09-08/verify-ai-knowledge.cjs
```

Result: **PASS — 6 checks**.

- Human category/filter labels and one command-palette entry point.
- Copy intent plus exact provider ordering, destinations, URL-query behavior, and one glyph per provider button.
- Manual form human category label.
- Three-question wizard, optional skips, explicit single synthesis, visible-fields-only request, and editable review.
- Standalone prompt detail parity and provider glyphs.
- Mobile horizontal-overflow guard and reachability of all five provider actions.
- Browser console errors: none.
- Browser page errors: none.

The machine-readable result is `artifacts/ai-knowledge-ux-2026-09-08/verification-result.json`.

### Static checks

- Focused ESLint: **0 errors**. One existing warning remains at `CustomPromptEditDrawer.tsx:67` for synchronous state initialization in an effect.
- Focused Vitest: **3 files, 8 tests passed**.
- `npm run check:i18n`: **PASS** (`check-i18n: OK`).
- `node --check artifacts/ai-knowledge-ux-2026-09-08/verify-ai-knowledge.cjs`: **PASS**.
- Scoped `git diff --check`: **PASS**.

## Visual evidence

- `artifacts/ai-knowledge-ux-2026-09-08/ai-knowledge-desktop.png`
- `artifacts/ai-knowledge-ux-2026-09-08/prompt-provider-actions.png`
- `artifacts/ai-knowledge-ux-2026-09-08/prompt-provider-actions-mobile.png`
- `artifacts/ai-knowledge-ux-2026-09-08/shareable-prompt-detail.png`
- `artifacts/ai-knowledge-ux-2026-09-08/manual-category-label.png`
- `artifacts/ai-knowledge-ux-2026-09-08/three-question-wizard.png`
- `artifacts/ai-knowledge-ux-2026-09-08/three-question-wizard-review.png`

`verification-failure.png` is a superseded diagnostic from the first production-browser run; it captured the off-center dialog before the GSAP transform repair. `deepseek-prefill-probe.png` records the unsuccessful DeepSeek live probe rather than a passing result.

## Residual boundaries

- The local browser harness proves UI behavior, icon presence, clipboard intent, and generated destination URLs. Because it mocks clipboard permission and intercepts external tabs, it does **not** prove real Safari/iPad clipboard permission, popup behavior, provider login state, or provider-side prefill rendering.
- External providers can change their web URL behavior. Clipboard copy remains the fallback for all five actions.
- A direct DeepSeek probe was blocked by CloudFront with HTTP 403, and no documented prompt-prefill query contract was found; automatic insertion is therefore not claimed for DeepSeek.
- A signed-in production-device playthrough remains pending until deployment is explicitly approved and performed.

## Next action

Review the screenshots. If approved, the next separate step is to select the exact task files from the dirty worktree, commit them, and deploy with explicit user authorization.

The installed Vercel CLI is `54.18.3` while `59.12.0` is current in this environment. Upgrade before a future deployment for best compatibility; no global CLI change was made in this task.
