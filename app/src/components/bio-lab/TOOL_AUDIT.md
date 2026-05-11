# Bio Lab Tool Audit (Phase 1)

This file is a maintainer reference for the four "regulation toolkit" tools
that live under `components/bio-lab/`. It is hand-written, not generated.
Update it whenever the data shape, persistence layer, or i18n key surface of
any of the four tools changes.

## Where these tools live

- **Surface:** Garden page (`app/[locale]/(protected)/garden/page.tsx`).
- **Launcher:** `BioLabToolsSection` → `BioLabToolCard` → `useBioLabStore.openTool(id)`.
- **Modal shell:** `BioLabToolSheet` (one shadcn `Sheet`; mounts the panel
  matching `useBioLabStore.activeTool`). Closed via `closeTool()` or overlay.
- **Deep link:** `?tool=<id>` synced both ways by `GardenBioLabQuerySync`.
- **Tool ids:** `"focus-sprint" | "mind-sweep" | "state-scan" | "system-reset"`
  (see `lib/bio-lab/tool-types.ts`).

## Persistence (Phase 1 → Phase 2 transition)

| Tool          | Phase 0 (today)                                                      | Phase 1+ (after this migration)                                  |
| ------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| State Scan    | zustand-persist `localStorage` (key `mylifeos-bio-lab`), max 40      | Supabase `bio_lab_state_scans` (RLS, `DEFAULT auth.uid()`); local stays as offline cache |
| Mind Sweep    | zustand-persist `localStorage`, max 120 entries                      | Supabase `bio_lab_mind_sweeps` (one row per sweep, items in JSONB) |
| Focus Sprint  | **Not persisted** — reflect outcome dispatched but discarded on close | Supabase `bio_lab_focus_sprints` (intent, durations, outcome, ai_assisted) |
| System Reset  | **Not persisted** — no history kept                                  | Supabase `bio_lab_system_resets` (sequence id, completed steps, ai_assisted) |

All four Phase 1 tables include `ai_assisted boolean` + `ai_metadata jsonb`
columns so we can later analyze AI-assisted vs. manual sessions without
schema churn.

## Per-tool current shape

### State Scan (`state-scan-panel.tsx`)

- **Local state:** `mood`, `energy`, `focus`, `stress` (each 1–5 number, init
  3); `note` (string, max `BIO_LAB_STATE_NOTE_MAX = 2000`); `savedFlash`
  (boolean, 1.6s window).
- **Inputs:** four native `<input type="range" min=1 max=5>` + textarea.
- **Save:** `useBioLabStore.addStateScanEntry({ mood, energy, focus, stress, note })`.
- **Display:** "Last check-in" card from `stateScanHistory[0]`.
- **i18n keys:** `bio-lab-flows-ui.ts` → `state.{lead, scaleHint, mood, energy, focus, stress, note, notePlaceholder, save, saved, lastTitle, scaleLow, scaleHigh}`.

### Mind Sweep (`mind-sweep-panel.tsx`)

- **Local state:** `draft` (string, max `BIO_LAB_MIND_SWEEP_DRAFT_MAX = 4000`),
  `kind` (`MindSweepKind = "task" | "worry" | "idea" | "reminder"`).
- **Inputs:** textarea + chip group + add button. ⌘/Ctrl+Enter shortcut.
- **List:** `entries` from store; per-row `<select>` to change kind; remove button.
- **Persistence ops:** `add(text, kind)`, `updateKind(id, kind)`, `remove(id)`.
- **i18n keys:** `mind.{lead, placeholder, add, kindLabel, kinds.{task,worry,idea,reminder}, empty, remove, changeKind, draftKeyboardHint}`.

### Focus Sprint (`focus-sprint-panel.tsx`)

- **State machine:** `useReducer` over `FocusStep = "pick" | "intention" | "work" | "break" | "reflect"`.
- **Picks:** `FOCUS_PRESETS` = `[{p25:25/5},{p50:50/10},{p90:90/15}]` + custom (1–180 / 0–60).
- **Intention:** Textarea, max `BIO_LAB_INTENTION_MAX = 500`, **optional** (Skip button or Start sprint).
- **Timer:** `setInterval(1000ms)` ticking `state.remaining`. `tick` action transitions work→break→reflect when `remaining` hits 0.
- **Visibility:** auto-pauses on `document.visibilitychange`.
- **End confirm:** `<AlertDialog>` → "End sprint" jumps to reflect.
- **Reflect:** outcome chip (`completed | partial | blocked`) required + optional note (max `BIO_LAB_REFLECT_NOTE_MAX = 2000`).
- **Persistence:** **NONE TODAY.** `saveReflection` calls `dispatch(resetPick)` then `onClose()` — the outcome is discarded.
- **i18n keys:** `focus.{pickLead, presetLabel(w,b), customWork, customBreak, customInvalid, continue, intentionTitle, intentionPlaceholder, intentionSkip, intentionContinue, phaseWork, phaseBreak, timeRemaining, pause, resume, endSession, endConfirmTitle, endConfirmBody, confirmEnd, cancel, reflectTitle, reflectLead, outcomeCompleted, outcomePartial, outcomeBlocked, reflectNotePlaceholder, saveReflection, newSprint}`.

### System Reset (`system-reset-panel.tsx`)

- **State:** single `index` cursor over `SYSTEM_RESET_STEPS = ["breathe","hydrate","clear-space","next-step","restart"]`.
- **Navigation:** Manual Back / Next; `useLayoutEffect` focuses the step title on each change.
- **Completion:** `index === total` shows "restart" body + Close button.
- **Persistence:** **NONE TODAY.**
- **i18n keys:** `reset.{lead, progress(c,t), next, back, done, steps.<id>.{title, body}}`.

## i18n architecture

- Source files: `lib/i18n/bio-lab-flows-ui.ts` (panel copy) + `lib/i18n/bio-lab-tools-ui.ts` (section copy).
- 9 locales: `en`, `zh-TW`, `zh-CN`, `ja`, `ko`, `fr`, `it`, `es`, `vi`.
- English is the source of truth; `zh-TW` and `zh-CN` are translated; the
  other 6 fall back to English silently via `mergeCopy` (no TODO markers).
- New copy files in Phase 1+ should write English + `zh-TW` + `zh-CN` minimum
  to match the existing pattern; the supplementary spec asks for all 9 — those
  translations are written in `lib/i18n/bio-lab-completion-ui.ts` and the
  Phase 2 panel copy.

## What Phase 1 adds (no UI changes yet)

- `lib/bio-lab/completion-types.ts` — discriminated unions for tool results.
- `lib/bio-lab/next-step-rules.ts` + `hooks/use-next-step-suggestion.ts` — pure rule engine.
- `components/bio-lab/shared/tool-completion-card.tsx` — reusable completion shell.
- `lib/repositories/bio-lab.ts` + `hooks/use-bio-lab-history.ts` — Supabase read/write.
- `supabase/migrations/20260420000000_bio_lab_sessions.sql` — 4 tables + RLS.
- `lib/ai/bio-lab/*` — server prompts/schemas + 5 API route handlers + 4 client fetchers.
- `lib/i18n/bio-lab-completion-ui.ts` — 9-locale copy for the completion card + AI badges.

The four panel components are not modified in Phase 1. They will be wired
to the new infrastructure during Phase 2.
