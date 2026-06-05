# OS Buddy to Japaneseweb Migration Prompt

## What This Is

This document extracts the OS Buddy behavior from `/Users/ouxianxing/My_life_os` and rewrites it as an implementation prompt for `dev-james0723/japaneseweb`.

Use this prompt in the target repository when you want another coding agent to implement the feature. It is intentionally specific to the target app's identity:

- Product: `日文快上手`
- UI language: Traditional Chinese
- Learning content: Japanese, kana, romaji, Traditional Chinese explanations
- Core flow: daily Japanese Communication OS, "今日開機", boot layers, SRS review, decks, grammar, journal, sentence mining, Talk Me, roleplay, notebook, stats, weekly/monthly review
- Design system: Liquid Glass, dark Japanese study room, Tailwind utility classes, `GlassPanel`, `btn-primary`, `btn-ghost`, `speaker-button`, `chip`

## Source OS Buddy Summary

Source feature roots in `My_life_os`:

- `app/src/components/os-buddy/OSBuddyDock.tsx`
- `app/src/components/os-buddy/OSBuddyBubble.tsx`
- `app/src/components/os-buddy/OSBuddySprite.tsx`
- `app/src/components/os-buddy/OSBuddyMenu.tsx`
- `app/src/components/os-buddy/OSBuddyShortcutController.tsx`
- `app/src/components/os-buddy/games/*`
- `app/src/hooks/use-os-buddy*.ts`
- `app/src/lib/os-buddy/*`
- `app/src/stores/os-buddy-store.ts`
- `app/src/app/api/os-buddy/companion-line/route.ts`
- `app/public/os-buddy/pets/*`
- `app/public/assets/os-buddy/clean-desk/*`

The feature is not just a mascot. It is a global companion system with:

- floating docked pixel avatar
- mood to animation mapping
- speech bubble queue with cooldowns and CTA support
- user profile persistence plus localStorage fallback
- drag, keyboard, tap, long-press, context menu, pinch zoom
- global show/hide shortcuts
- context-aware speech line generation
- event reaction bus
- page-specific hints
- time-of-day mood
- idle and return detection
- free roam
- birthday mode
- mini-games
- optional camera/gesture AirPilot control

## Target Repo Facts

Target repository inspected: `dev-james0723/japaneseweb`.

Relevant target files:

- `app/(app)/layout.tsx`: authenticated shell; renders `Sidebar`, `TopBar`, `MotionShell`, `SelectionInspector`
- `app/(app)/dashboard/page.tsx`: "今日開機" dashboard and phase mission
- `app/(app)/dashboard/BootSequence.tsx`: boot layer flow and layer completion actions
- `app/(app)/review/ReviewSession.tsx`: SRS review flow and rating buttons
- `app/(app)/settings/page.tsx`, `app/(app)/settings/SettingsForm.tsx`: settings surface
- `components/SelectionInspector.tsx`: selected Japanese text inspector and save flow
- `components/SpeakerButton.tsx`: Japanese TTS button
- `components/QuickSaveButton.tsx`: quick vocabulary save
- `components/GlassPanel.tsx`: target glass shell component
- `app/globals.css`: target Liquid Glass tokens and reusable classes
- `lib/os/types.ts`, `lib/os/queries.ts`, `lib/actions/os.ts`: Japanese OS phase, daily mode, boot layers
- `supabase/migrations/0001_init.sql`: profile base schema
- `supabase/migrations/0006_japanese_os_foundation.sql`: Japanese OS settings, boot logs, grammar, journal, Talk Me, mining, reviews, audits

The target package currently has `motion`, `gsap`, `lucide-react`, `@supabase/ssr`, `@supabase/supabase-js`, `openai`, `@google/generative-ai`, and Tailwind. It does not currently have `zustand`, `framer-motion`, or `@mediapipe/tasks-vision`.

## Copy-Paste Implementation Prompt

You are working in the `dev-james0723/japaneseweb` repository. Implement a target-adapted version of the OS Buddy feature from `My_life_os`, preserving the behavior contract but adapting the speech, flow, UI, persistence, and events to this Japanese learning app.

### Product Goal

Add a global "OS Buddy" companion to `日文快上手`. It should feel like a small, warm study companion for the user's Japanese Communication OS:

- It lives in the authenticated app shell on every app page.
- It reacts to the current Japanese learning flow.
- It nudges the next useful learning action without sounding like a dashboard.
- It uses Traditional Chinese UI copy, with short Japanese phrases only when they help learning.
- It respects the target Liquid Glass design, existing dark study-room UI, and mobile layout.

Do not make a marketing page. Build the real in-app companion.

### Implementation Principles

- Keep source-compatible behavior names where practical: `OSBuddyDock`, `OSBuddyBubble`, `OSBuddySprite`, `OSBuddyMenu`, `useOSBuddy`, `emitOSBuddyEvent`.
- Use the target repo's existing styling patterns, especially `GlassPanel`, `btn-primary`, `btn-ghost`, `chip`, `speaker-button`, and CSS variables in `app/globals.css`.
- Use `motion/react` for simple sprite motion because the target already has `motion`. Do not add `framer-motion` unless absolutely necessary.
- Avoid adding `zustand` unless you intentionally choose closest source parity. Preferred target implementation: a small client-side React context/reducer or `useSyncExternalStore` module with the same public actions as the source store.
- AI speech generation is optional but should be implemented if time allows. The local deterministic fallback must be complete and good enough.
- The feature must work when Supabase update fails by using localStorage fallback, then re-sync later where practical.
- Do not break `SelectionInspector`; OS Buddy should not cover selected text popovers in common placements.

### Phase 1 Scope

Implement these in the first pass:

1. Global dock, sprite, bubble, menu, pet assets, drag/persist, keyboard controls.
2. OS Buddy profile persistence columns and settings UI.
3. Event bus and reactions adapted to `japaneseweb`.
4. Local companion speech lines adapted to Japanese learning.
5. Context hints by route.
6. Shortcut controller: desktop double Space and mobile two-finger double tap.
7. Mini-games adapted to study context: Kana Catch, Focus Tap, Study Desk Reset, Play Ball.
8. Reduced-motion support and mobile-safe placement.

Mark AirPilot/camera gesture control as Phase 2 optional unless explicitly requested.

### Files To Add

Add these folders/files:

```text
components/os-buddy/OSBuddyDock.tsx
components/os-buddy/OSBuddyBubble.tsx
components/os-buddy/OSBuddySprite.tsx
components/os-buddy/OSBuddyMenu.tsx
components/os-buddy/OSBuddyPetPicker.tsx
components/os-buddy/OSBuddyShortcutController.tsx
components/os-buddy/OSBuddyShortcutSettings.tsx
components/os-buddy/OSBuddySettingsSection.tsx
components/os-buddy/OSBuddyFocusBadge.tsx
components/os-buddy/games/OSBuddyGameOverlayHost.tsx
components/os-buddy/games/KanaCatchOverlay.tsx
components/os-buddy/games/FocusTapOverlay.tsx
components/os-buddy/games/StudyDeskResetOverlay.tsx
components/os-buddy/games/OSBuddyPlayBallOverlay.tsx
hooks/use-os-buddy.ts
hooks/use-os-buddy-context-hints.ts
hooks/use-os-buddy-companion.ts
hooks/use-os-buddy-time-mood.ts
hooks/use-user-idle-for-os-buddy.ts
lib/os-buddy/os-buddy-types.ts
lib/os-buddy/os-buddy-pets.ts
lib/os-buddy/os-buddy-animation-map.ts
lib/os-buddy/os-buddy-assets.ts
lib/os-buddy/os-buddy-events.ts
lib/os-buddy/os-buddy-reactions.ts
lib/os-buddy/os-buddy-context-hints.ts
lib/os-buddy/os-buddy-companion.ts
lib/os-buddy/os-buddy-companion-schema.ts
lib/os-buddy/os-buddy-shortcuts.ts
lib/os-buddy/os-buddy-tap-resolver.ts
lib/os-buddy/os-buddy-stats.ts
lib/os-buddy/os-buddy-birthday.ts
lib/os-buddy/os-buddy-free-roam.ts
lib/os-buddy/os-buddy-free-roam-config.ts
lib/os-buddy/os-buddy-store.ts
app/api/os-buddy/companion-line/route.ts
public/os-buddy/pets/xiaoba/*.gif
public/os-buddy/pets/doge/*.gif
public/assets/os-buddy/clean-desk/desk-clean.png
public/assets/os-buddy/clean-desk/desk-messy.png
supabase/migrations/0010_os_buddy.sql
```

If you avoid `zustand`, `lib/os-buddy/os-buddy-store.ts` should expose a hook/API equivalent to:

```ts
useOSBuddyStore(selector)
useOSBuddyActions()
getOSBuddyState()
```

The rest of the code should not care whether the implementation uses context, external store, or Zustand.

### Dependencies

Use existing target dependencies when possible:

- React 19
- Next 16 App Router
- Tailwind
- `motion/react`
- `lucide-react`
- Supabase browser/server clients
- `zod`

Do not add `@mediapipe/tasks-vision` in Phase 1.

### Database Migration

Create `supabase/migrations/0010_os_buddy.sql`:

```sql
alter table public.profiles
add column if not exists os_buddy_pet_id text default 'xiaoba',
add column if not exists os_buddy_name text default 'Koto',
add column if not exists os_buddy_enabled boolean default true,
add column if not exists os_buddy_position jsonb default '{"x": null, "y": null, "anchor": "bottom-right"}'::jsonb,
add column if not exists os_buddy_onboarding_completed boolean default false,
add column if not exists os_buddy_interaction_stats jsonb default '{}'::jsonb,
add column if not exists os_buddy_unlocked_pets jsonb default '["xiaoba", "doge"]'::jsonb,
add column if not exists os_buddy_birthday_enabled boolean default false,
add column if not exists os_buddy_birthday_month int,
add column if not exists os_buddy_birthday_day int,
add column if not exists os_buddy_birthday_year int,
add column if not exists os_buddy_birthday_show_age boolean default false,
add column if not exists os_buddy_birthday_reminder_enabled boolean default true,
add column if not exists os_buddy_birthday_timezone text,
add column if not exists os_buddy_birthday_last_celebrated_on text,
add column if not exists os_buddy_birthday_last_reminder_on text,
add column if not exists os_buddy_free_roam_enabled boolean default false,
add column if not exists os_buddy_free_roam_intensity text default 'balanced'
  check (os_buddy_free_roam_intensity in ('subtle', 'balanced', 'lively')),
add column if not exists os_buddy_free_roam_return_home boolean default true,
add column if not exists os_buddy_free_roam_near_home_only boolean default true,
add column if not exists os_buddy_shortcut_settings jsonb default '{
  "desktopToggle": {
    "key": " ",
    "code": "Space",
    "label": "Space",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "pressCount": 2
  },
  "twoFingerDoubleTapEnabled": true
}'::jsonb;

update public.profiles
set os_buddy_shortcut_settings = '{
  "desktopToggle": {
    "key": " ",
    "code": "Space",
    "label": "Space",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "pressCount": 2
  },
  "twoFingerDoubleTapEnabled": true
}'::jsonb
where os_buddy_shortcut_settings is null;
```

Then update `lib/supabase/database.types.ts` profile types or regenerate the Supabase types if the project has a generation workflow.

### Type Contract

Use this public type contract:

```ts
export type OSBuddyPetId = "xiaoba" | "doge";

export type OSBuddyAnimationState =
  | "idle"
  | "waiting"
  | "waving"
  | "jumping"
  | "failed"
  | "review"
  | "running"
  | "running-left"
  | "running-right";

export type OSBuddyMood =
  | "idle"
  | "thinking"
  | "creating"
  | "reading"
  | "success"
  | "error"
  | "sleepy"
  | "playful"
  | "focused"
  | "celebrating"
  | "dragging-left"
  | "dragging-right";

export type OSBuddyPosition = {
  x: number | null;
  y: number | null;
  anchor: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "custom";
};
```

Mood to GIF mapping:

```ts
idle -> idle
thinking -> waiting
creating -> running
reading -> review
success -> jumping
error -> failed
sleepy -> waiting
playful -> waving
focused -> review
celebrating -> jumping
dragging-left -> running-left
dragging-right -> running-right
```

Default target-specific pet behavior:

- Keep asset ids `xiaoba` and `doge` for file compatibility.
- User-visible default name should be `Koto`.
- `xiaoba` display description: "陪你開機、複習、採句同輸出嘅像素學習夥伴。"
- `doge` display description: "更活潑嘅學習夥伴，適合需要多一點能量嘅日文日。"

### Global Shell Integration

Modify `app/(app)/layout.tsx`:

- Keep existing `Sidebar`, `TopBar`, `MotionShell`, `SelectionInspector`.
- Add:

```tsx
<OSBuddyShortcutController />
<OSBuddyDock />
```

Place them near the end of the authenticated shell, after `SelectionInspector`, or immediately before it if z-index testing shows the inspector should sit above Buddy.

Suggested z-indexes in target:

- Dock: `z-[70]`
- Bubble: within dock
- SelectionInspector already uses `z-[80]`; keep it above normal Buddy bubbles.
- Buddy menu: `z-[90]`
- Mini-game overlays: `z-[95]`

### Dock Behavior

Recreate these source behaviors:

- Default position: bottom-right on `japaneseweb` to avoid the desktop sidebar.
- Clamp position to viewport with 12px edge gap.
- Button target min size: at least 44px.
- Single click/tap: after `320ms`, call companion line and show a bubble.
- Double tap within `320ms` and `24px`: toggle walk mode.
- Triple tap: toggle Play Ball after a `360ms` grace window.
- Quad tap: reserved for Phase 2 AirPilot; in Phase 1 show a small bubble: "AirPilot 之後再開。先完成今日一層。"
- Long press `600ms`: open menu.
- Right click/context menu: open menu at cursor.
- Drag threshold: `6px`; while dragging, mood follows left/right; on release, persist custom position.
- Keyboard on focused buddy:
  - Enter or Space: trigger single click reaction.
  - Arrow keys: move 16px; Shift plus arrow moves 48px; persist position.
  - M: open menu.
  - Escape: close bubble/menu/picker/game.
- Global zoom:
  - `+` or `=` increases scale by `0.16`.
  - `-` or `_` decreases scale by `0.16`.
  - Touch pinch near Buddy scales it.
  - Clamp scale from `1` to viewport-safe max, with absolute cap `12`.
- If Buddy is walking, pointer movement updates target. Double tap anywhere returns Buddy home.
- If route changes, interrupt free roam, close mini-game overlays, clear transient state.

### Bubble Behavior

Use source bubble semantics:

- `role="status"`
- `aria-live="polite"`
- supports close button
- supports optional CTA
- supports `data-kind`
- flips above/below depending on dock position
- flips left/right depending on screen half
- default duration `3200ms`
- context/user triggered duration usually `4200ms`
- CTA bubble duration around `6200ms`
- unsolicited bubble cooldown `20000ms`

Bubble kinds for target:

```ts
type OSBuddyBubbleType =
  | "user-triggered"
  | "system"
  | "context"
  | "success"
  | "error"
  | "game"
  | "birthday";

type OSBuddyCompanionKind =
  | "boot"
  | "review"
  | "deck"
  | "grammar"
  | "mining"
  | "journal"
  | "roleplay"
  | "tts"
  | "streak"
  | "settings"
  | "game"
  | "fallback";
```

Copy the pixel-bubble CSS from source but adapt colors to target CSS variables:

- `--accent-lime` for success/review
- `--accent-sky` for TTS/listening
- `--accent-sakura` for compliment/journal
- `--accent-amber` for streak/reminder
- `--danger` for error
- target dark surface base `#171612` or existing `--surface-ink`

Make sure bubble text has:

- `letter-spacing: 0`
- `text-wrap: balance`
- `max-width` around `238px` desktop and `190px` mobile
- no clipped Chinese/Japanese text
- reduced-motion disables pop/wobble animation

### Companion Context For Japaneseweb

Build a compact context from existing target data:

```ts
type OSBuddyJapaneseContext = {
  displayName: string | null;
  today: string;
  pathname: string;
  os: {
    currentPhase: number;
    phaseName: string;
    dailyMode: "min" | "standard" | "deep";
    targetJlpt: string;
    bootCompletion: number;
    nextIncompleteLayer: "boot" | "input" | "review" | "output" | "debug" | null;
    completedLayers: string[];
  };
  review: {
    dueCount: number;
    weakCount: number;
    sentencePromptCount: number;
    lastRating?: "again" | "hard" | "good" | "easy" | null;
  };
  decks: {
    recentTitles: string[];
    weeklyNewVocab: number;
    weeklyQuota: number;
  };
  learning: {
    recentMinedSentences: string[];
    recentJournalSnippets: string[];
    recentGrammar: string[];
    talkMeMinutesThisWeek: number;
  };
  preferences: {
    showRomaji: boolean;
    preferredVoice: string;
    defaultJlptLevel: string;
  };
  games: OSBuddyMiniGame[];
};
```

Use existing server queries where possible:

- `fetchOsSettings`
- `fetchTodayBootLog`
- `fetchWeeklyStats`
- `fetchStreak`
- `profiles`
- `reviews`
- `sentence_review_prompts`
- `decks`
- `mined_sentences`
- `journal_entries`
- `grammar_points`
- `talk_me_sessions`

Keep context compact. Do not send raw full journal entries or long selected text into the speech bubble route.

### Companion Kind Selection

Selection priority:

1. If user just completed a layer: `boot`.
2. If due reviews or weak cards exist: `review`.
3. If on `/review`: `review`.
4. If on `/decks` or `/decks/new`: `deck`.
5. If on `/grammar`: `grammar`.
6. If on `/mining` or selected text was saved: `mining`.
7. If on `/journal`: `journal`.
8. If on `/roleplay`: `roleplay`.
9. If TTS just played or Talk Me was logged: `tts`.
10. If streak or boot days improved: `streak`.
11. If on `/settings`: `settings`.
12. Occasionally suggest `game`.
13. Fallback.

Avoid repeating the same kind more than twice. Keep a recent kind history of 6.

### Local Speech Bubble Copy

Use Traditional Chinese as the main speech language. Japanese can appear as short learning material, not as UI scaffolding.

Global click lines:

- "我喺度。今日先開一層就得。"
- "Koto 陪你慢慢砌返個日文系統。"
- "先做最細一步，日文會自己累積。"
- "如果卡住，去複習一張或者採一句真日文。"
- "今日都開機，已經贏咗一半。"

Boot flow lines:

- No layer done: "先做開機層：用日文講今日日期、天氣同心情。"
- Next layer boot: "開機暖身先。今日用一句「今日は...です」開始。"
- Next layer input: "輸入層到你。聽一段真日文，再抽一句可模仿。"
- Next layer review: "到複習層。先主動回想，再揭曉答案。"
- Next layer output: "輸出層唔使長，三句日記已經有效。"
- Next layer debug: "除錯層只修一個痛點。太多反而散。"
- All done: "今日五層完成。收工前記低一個明日焦點。"

Review lines:

- Due reviews: "有 {dueCount} 張待複習。先打一張最弱嘅。"
- Weak cards: "{weakCount} 張救援卡。慢慢拆音、字、義。"
- Again rating: "忘記唔係失敗，係系統提醒你要再見一次。"
- Hard rating: "吃力卡最值錢。短間隔返嚟就啱。"
- Good rating: "記得。下一張保持主動回想。"
- Easy rating: "太易就放遠啲，留空間畀難卡。"
- Review complete: "複習完成。今日大腦已經做咗一輪整理。"

Deck lines:

- "建立詞庫時，主題越具體，AI 越準。"
- "新詞唔好貪多。要有例句、聲音同回憶鉤。"
- "今日新詞 {weeklyNewVocab}/{weeklyQuota}。夠用就去輸出。"
- "一個好詞庫，要可以講得出口。"

Grammar lines:

- "文法唔係規則表，係句子引擎。加一個自己的例句。"
- "相似句型先分功能，再分語感。"
- "今日只要搞清一個 pattern 就好。"

Mining lines:

- "採句時揀你真係會講出口嗰句。"
- "呢句可以變成 cloze 卡，再放返複習。"
- "先保存一句真日文，之後再整理都得。"

Journal lines:

- "日記唔使完美。先寫出嚟，再俾教授修。"
- "今日試三句：事實、心情、下一步。"
- "用一個新詞寫自己的句子，記憶會深好多。"

Roleplay lines:

- "角色扮演先求完成任務，唔求句句完美。"
- "講唔出就用短句。自然度係練返嚟。"
- "今日目標：聽懂、回應、再追問一句。"

TTS and listening lines:

- "聽完要跟讀一次，聲音先會入肌肉。"
- "如果讀音卡住，開 Romaji 望一眼就好。"
- "影子跟讀五秒，都算輸出。"

Streak lines:

- "連續 {streak} 日。唔好用完美破壞連續。"
- "保底日都算數。精簡模式係為咗唔斷線。"

Settings lines:

- "你可以喺設定改我個名、位置同快捷鍵。"
- "Romaji 可以做腳手架，但記得慢慢拆。"

Game lines:

- "要唔要玩一小局？玩完返去複習。"
- "一分鐘 reset 下注意力，再開下一層。"

Fallback:

- "Koto 喺度。先做一件最細嘅日文事。"

### AI Speech Route

Add `app/api/os-buddy/companion-line/route.ts`.

Use local fallback first. Then optionally call the target repo's existing AI client. If using OpenAI, use the existing `lib/ai/openai.ts` style and a Zod schema. If using Gemini, use existing Gemini env helpers. Return JSON only.

System instruction:

```text
You are OS Buddy inside 日文快上手, a Japanese learning OS. You are a tiny pixel study companion. Write Traditional Chinese UI copy with occasional short Japanese examples only when helpful. Be warm, concise, practical, and focused on Japanese learning progress.

Rules:
- Return only JSON matching the schema.
- message: one short speech-bubble line, 8-42 Traditional Chinese characters or up to 24 English/Japanese mixed words.
- Use only the compact context provided.
- Never invent counts, streaks, tasks, or user feelings.
- Do not sound like a corporate assistant or dashboard.
- If kind is review, encourage active recall.
- If kind is boot, point to the next incomplete daily layer.
- If kind is journal/mining/roleplay, encourage output over perfection.
- Omit CTA unless kind is game.
```

Response schema:

```ts
{
  message: string; // max 220
  kind: OSBuddyCompanionKind;
  source: "ai" | "local" | "fallback";
  cta?: { label: string; game: OSBuddyMiniGame } | null;
}
```

If API key is missing, auth fails, AI fails, schema validation fails, or timeout exceeds 12 seconds, return local fallback.

### Event Bus

Implement:

```ts
export const OS_BUDDY_EVENT_NAME = "japaneseweb:os-buddy-event";
export function emitOSBuddyEvent(event: OSBuddyEvent) { ... }
export function subscribeToOSBuddyEvents(listener: (event: OSBuddyEvent) => void) { ... }
```

Target event types:

```ts
type OSBuddyEvent =
  | { type: "boot:start"; mode: DailyMode }
  | { type: "boot:layer:complete"; layer: BootLayer }
  | { type: "boot:layer:uncomplete"; layer: BootLayer }
  | { type: "review:start"; count: number }
  | { type: "review:rating"; rating: "again" | "hard" | "good" | "easy" }
  | { type: "review:complete"; remembered: number; total: number }
  | { type: "deck:create:start"; mode?: "manual" | "ocr" | "ai" }
  | { type: "deck:create:success"; title?: string }
  | { type: "deck:create:error"; error?: string }
  | { type: "vocab:save:start"; text?: string }
  | { type: "vocab:save:success"; text?: string }
  | { type: "vocab:save:error"; error?: string }
  | { type: "selection:inspect:start"; text?: string }
  | { type: "selection:inspect:success"; text?: string }
  | { type: "selection:inspect:error"; error?: string }
  | { type: "tts:play"; text?: string }
  | { type: "tts:error"; error?: string }
  | { type: "mining:save"; sentence?: string }
  | { type: "journal:correct:start" }
  | { type: "journal:correct:success" }
  | { type: "journal:correct:error"; error?: string }
  | { type: "roleplay:start" }
  | { type: "roleplay:complete" }
  | { type: "talk-me:logged"; minutes?: number }
  | { type: "grammar:add"; pattern?: string }
  | { type: "streak:milestone"; count: number }
  | { type: "focus:start"; durationMinutes?: number }
  | { type: "focus:pause" }
  | { type: "focus:resume" }
  | { type: "focus:complete" }
  | { type: "user:idle" }
  | { type: "user:return" }
  | { type: "buddy:clicked" }
  | { type: "buddy:drag:start" }
  | { type: "buddy:drag:end" }
  | { type: "buddy:longpress" }
  | { type: "buddy:walk:start" }
  | { type: "buddy:walk:return" }
  | { type: "buddy:walk:end" }
  | { type: "buddy:free-roam:start" }
  | { type: "buddy:free-roam:end"; reason?: string }
  | { type: "game:start"; game: OSBuddyMiniGame }
  | { type: "game:complete"; game: OSBuddyMiniGame; score?: number }
  | { type: "birthday:today"; age?: number }
  | { type: "birthday:upcoming"; daysUntil: number; age?: number }
  | { type: "birthday:set" }
  | { type: "birthday:clear" };
```

### Event Integration Points

Modify target client components:

- `BootSequence.tsx`
  - On mode pick, emit `boot:start`.
  - On layer toggle true, emit `boot:layer:complete`.
  - On layer toggle false, emit `boot:layer:uncomplete`.

- `ReviewSession.tsx`
  - On mount, emit `review:start`.
  - On each rating, emit `review:rating`.
  - On done, emit `review:complete`.

- `SelectionInspector.tsx`
  - Before inspect fetch, emit `selection:inspect:start`.
  - On inspect success, emit `selection:inspect:success`.
  - On inspect failure, emit `selection:inspect:error`.
  - On save success/failure, emit `vocab:save:success` or `vocab:save:error`.

- `SpeakerButton.tsx`
  - On successful audio play, emit `tts:play`.
  - On failure, emit `tts:error`.

- `QuickSaveButton.tsx`
  - Emit `vocab:save:start`, `vocab:save:success`, `vocab:save:error`.

- Mining, journal, grammar, roleplay, Talk Me forms:
  - Emit the corresponding events when actions start/succeed/fail.

### Reaction Rules

Implement `handleOSBuddyReaction`:

- AI/deck generation start: mood `thinking`, bubble "Koto 幫你整理詞庫中。"
- AI/deck success: temporary `success`, bubble "詞庫準備好。記得加例句同聲音。"
- Error: temporary `error`, bubble "暫時做唔到。保留輸入，等陣再試。"
- Review rating `again`: temporary `error`, bubble "忘記係再學一次嘅入口。"
- Review rating `hard`: temporary `thinking`, bubble "呢張值得短間隔再見。"
- Review rating `good`: temporary `success`, no bubble if another bubble is active.
- Review rating `easy`: temporary `celebrating`, bubble "太易，放遠啲。"
- Boot layer complete: temporary `celebrating`, bubble "一層完成。下一層慢慢嚟。"
- User idle after 3 minutes: mood `sleepy`.
- User return: mood `idle`, bubble "歡迎返嚟。做一件最細嘅日文事。"
- Focus start: mood `focused`, show focus badge, bubble "你專心，我保持安靜。"
- Focus complete: mood `success`, bubble "專注完成。記低一個收穫。"
- TTS play: temporary `reading`, bubble "聽完跟讀一次。"
- Roleplay complete: temporary `celebrating`, bubble "任務對話完成。自然度會慢慢上嚟。"

### Context Hints By Route

Use `useOSBuddyContextHints` with:

- idle hint delay `45000ms`
- pause after hint `120000ms`
- recent bubble gap `20000ms`
- do not show if menu, mini-game, dialog, selection inspector, birthday mode, or active bubble exists

Hints:

- `/dashboard`: "今日開機睇下一層未完成邊個。"
- `/review`: "複習前先回想，唔好即刻揭答案。"
- `/decks`: "詞庫要有聲音、例句同圖像鉤。"
- `/decks/new`: "主題越具體，新詞越貼近你會用嘅日文。"
- `/grammar`: "每個文法點至少寫一句自己的例句。"
- `/journal`: "日記先求輸出，再求自然。"
- `/mining`: "採一句你真係想講出口嘅真日文。"
- `/talk-me`: "聽完抽一句可模仿句，唔好只記時數。"
- `/roleplay`: "角色扮演先完成任務，再修語法。"
- `/notebook`: "筆記本要變成可複習嘅卡，唔好只收藏。"
- `/stats`: "睇數據只為揀下一個痛點。"
- `/weekly-review`: "本週只揀一個下週焦點。"
- `/monthly-audit`: "月檢討要調整系統，唔係責怪自己。"
- `/settings`: "你可以喺度改我個名、位置同快捷鍵。"

### Time Mood

After 90 seconds, then every 5 minutes:

- Morning 6-12: bubble "今日用一句日文開機。"
- Evening 18-23: bubble "收尾一層，今日就完整。"
- Late night 23-6: set mood `sleepy`, bubble "夜深了，保底一張就好。"

Only show one time bubble every 6 hours. Do not show during active review, game, focus, menu, dialog, or birthday mode.

### Global Shortcut

Port the shortcut system:

- Default desktop shortcut: Space x2 within `500ms`.
- Mobile shortcut: two-finger double tap within `350ms`, tap duration max `260ms`, movement max `32px`, second tap center distance max `72px`.
- Do not trigger inside inputs, textarea, select, buttons, links, menus, tabs, dialogs, command panels, or any element marked `data-os-buddy-shortcut-ignore`.
- In settings, allow recording a custom shortcut:
  - Modifier shortcuts can be single press.
  - Bare keys must be double press.
  - Disallow bare Escape, Tab, Enter, Backspace, Delete, arrows, Home, End, PageUp, PageDown.
  - Disallow browser-reserved Cmd/Ctrl D/F/L/N/P/Q/R/S/T/W and digit shortcuts.

### Settings UI

Integrate into `app/(app)/settings/page.tsx`.

Add a second `GlassPanel` after the existing `SettingsForm`:

```tsx
<GlassPanel className="p-6 md:p-8">
  <OSBuddySettingsSection />
</GlassPanel>
```

Settings controls:

- Enable OS Buddy toggle.
- Pet selector.
- Rename input, max 24 chars.
- Preview sprite.
- Reset position.
- Free roam:
  - enabled
  - intensity: subtle, balanced, lively
  - return home after roam
  - stay near home
- Shortcuts:
  - current desktop shortcut
  - record shortcut
  - reset default
  - enable two-finger double tap
- Birthday mode:
  - enabled
  - month/day/year optional
  - show age if year exists
  - reminder enabled

Use target controls and Tailwind styles, not source shadcn components unless already installed.

### Menu UI

Long press/right click menu items:

- 更換 OS Buddy
- 重新命名
- 生日模式
- 重設位置
- 玩 Kana Catch
- 玩 Focus Tap
- 整理學習桌
- Play Ball
- 隱藏 OS Buddy

Menu must close on outside pointer down and Escape.

### Mini-Games

Adapt games to the Japanese learning app.

`KanaCatchOverlay`:

- Source behavior: falling objects, player moves Buddy horizontally, 120 seconds, score and combo.
- Target copy: "移動 OS Buddy 接住假名 / 單字卡。"
- Use falling labels from recent vocabulary if available; fallback to kana like `あ`, `か`, `さ`, `今日`, `勉強`, `復習`.
- Arrow left/right and pointer movement both work.
- Escape closes.

`FocusTapOverlay`:

- Source behavior: 8 rounds, wait for cue, perfect window `850ms`.
- Target copy: "只在提示出現時點擊。練主動回想前嘅注意力。"
- Score out of 8.

`StudyDeskResetOverlay`:

- Source behavior: drag Buddy across desk, reveal clean desk, 60 seconds, progress grid 10x6.
- Use copied desk images or create target-compatible neutral dark study desk images.
- Target copy: "拖動 OS Buddy 清出學習桌。"

`PlayBallOverlay`:

- Source behavior: countdown 3, draggable ball, thrown ball bounces, Buddy chases, 50 percent caught/missed outcome, then resets.
- Target zones if later connected to gestures:
  - review
  - deck
  - mining
  - journal
  - settings

On game complete:

- Increment `gamesPlayed`.
- Add `first-game` badge.
- Emit `game:complete`.
- Return mood to `idle` or `success`.

### Free Roam

Implement optional free roam from source:

```ts
subtle:
  idleDelayMs 90000
  session 8000-12000
  cooldown 8-12 min
  maxSessionsPerHour 3
  desktopRadiusPx 160
  mobileRadiusPx 96
  speed 28-40 px/s

balanced:
  idleDelayMs 60000
  session 12000-20000
  cooldown 4-7 min
  maxSessionsPerHour 6
  desktopRadiusPx 220
  mobileRadiusPx 120
  speed 35-55 px/s

lively:
  idleDelayMs 45000
  session 20000-35000
  cooldown 2-4 min
  maxSessionsPerHour 10
  desktopRadiusPx 300
  mobileRadiusPx 160
  speed 45-70 px/s
```

Block or interrupt free roam during:

- menu open
- mini-game open
- dialog open
- focus mode
- active review card answer/rating sequence
- route change
- user drag/click
- keyboard activity
- scroll
- hidden tab
- reduced motion
- active moods: thinking, creating, reading, focused, success, error, celebrating

Use `requestAnimationFrame`, sine easing, viewport clamping, and return-home if configured.

### Birthday Mode

Implement source behavior:

- Profile validates month/day/year.
- Year optional, min 1900, max current year.
- Leap day fallback default Feb 28.
- Upcoming reminder window: 7 days.
- Today celebration:
  - only once per date key
  - mood `celebrating`
  - bubble kind `birthday`
  - badge `birthday-celebrated`
- On birthday today, three clicks within 5 seconds extends birthday mode by 8 seconds and shows "生日像素加成。"

### Stats And Badges

Use localStorage and profile JSONB:

```ts
type OSBuddyInteractionStats = {
  clicks?: number;
  drags?: number;
  gamesPlayed?: number;
  lastInteractionAt?: string;
  badges?: string[];
};

type OSBuddyBadge =
  | "secret-pixel-mode"
  | "first-game"
  | "fast-hands"
  | "clean-desk"
  | "birthday-celebrated";
```

Flush stats to Supabase with a 1500ms debounce. Never let stats failures break UI.

Secret mode:

- 7 clicks within 5 seconds
- mood `celebrating` for 8 seconds
- bubble "隱藏像素模式解鎖。"
- CSS ring pulse
- badge `secret-pixel-mode`

### Assets

Copy source assets:

```text
public/os-buddy/pets/xiaoba/idle.gif
public/os-buddy/pets/xiaoba/waiting.gif
public/os-buddy/pets/xiaoba/waving.gif
public/os-buddy/pets/xiaoba/jumping.gif
public/os-buddy/pets/xiaoba/failed.gif
public/os-buddy/pets/xiaoba/review.gif
public/os-buddy/pets/xiaoba/running.gif
public/os-buddy/pets/xiaoba/running-left.gif
public/os-buddy/pets/xiaoba/running-right.gif
public/os-buddy/pets/doge/...
public/assets/os-buddy/clean-desk/desk-clean.png
public/assets/os-buddy/clean-desk/desk-messy.png
```

Sprite CSS:

- `image-rendering: pixelated`
- transparent GIFs
- width md around 58px mobile, 74px desktop
- fallback visual if image fails

### CSS To Add

Add a section to `app/globals.css` for:

- `.os-buddy-sprite-img`
- `.os-buddy-dock > button`
- `.os-buddy-dock--free-roaming .os-buddy-sprite`
- `.os-buddy-free-roam-bounce`
- `.os-buddy-sprite-fallback`
- `.os-buddy-sprite--birthday`
- `.os-buddy-pixel-bubble`
- bubble arrow pseudo elements
- bubble variants by `data-kind`
- `.os-buddy-pixel-bubble-text`
- close button
- CTA button
- bubble pop and wobble animations
- `.os-buddy--secret`
- reduced motion overrides
- mobile `max-width` rules

Do not create decorative orbs or background blobs. Keep the pixel bubble crisp and compact above the Liquid Glass app.

### Phase 2 Optional: AirPilot

Do not implement in Phase 1 unless asked. If asked later:

- Add `@mediapipe/tasks-vision`.
- Port `OSBuddyAirControlOverlay`, `use-os-buddy-air-control`, and `lib/os-buddy/air-control/*`.
- Use MediaPipe Tasks Vision version `0.10.35`.
- WASM URL: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm`
- Gesture model URL: `https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task`
- Quad tap toggles camera AirPilot.
- Commands include cursor, hover, grab, drag, release, follow, page-cursor, page-select, page-scroll, zoom-osbuddy, pause, resume, exit, select, play-ball, celebrate, dash-left, dash-right, lost-hand.
- Privacy rule: persist only calibration coefficients/settings, never video or frames.

### Acceptance Criteria

Functional:

- OS Buddy appears on authenticated pages only.
- Default position is bottom-right and never overlaps the sidebar by default.
- User can drag Buddy and the position persists after reload.
- Single click shows a target-specific speech bubble.
- Long press/right click opens menu.
- Enter/Space works when Buddy is focused.
- Arrow keys move Buddy.
- Escape closes bubbles/menu/games.
- Double tap toggles walk mode.
- Triple tap toggles Play Ball.
- Double Space globally shows/hides Buddy.
- Two-finger double tap shows/hides Buddy on mobile.
- Settings can enable/disable, rename, switch pet, reset position, save shortcuts, and configure free roam.
- Review, boot, TTS, selection, quick save, journal, mining, roleplay events cause appropriate mood/bubbles.
- Local speech fallback works without any AI key.

Visual:

- Pixel sprite is crisp, not blurry.
- Bubble text fits on desktop and mobile.
- Bubble flips side and vertical position when near screen edges.
- No incoherent overlap with `TopBar`, `Sidebar`, `SelectionInspector`, dialogs, or mobile nav.
- Reduced motion disables bubble wobble, pop, free-roam bounce, and unnecessary sprite loops.
- Mobile has no horizontal overflow.

Data:

- Supabase migration is idempotent.
- Profile update failure falls back to localStorage.
- Interaction stats do not block rendering.
- No API keys exposed client-side.

Validation commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Manual browser checks at `http://localhost:3001`:

- `/dashboard`
- `/review`
- `/decks`
- `/decks/new`
- `/journal`
- `/mining`
- `/settings`

Use Playwright or browser automation to capture desktop and mobile screenshots:

- Desktop: 1280x900
- Mobile: 390x844
- Reduced motion enabled if tool supports it

Interaction checks:

- click Buddy, verify bubble
- drag Buddy, reload, verify position
- long press/right click, verify menu
- keyboard focus Buddy and press Enter, arrows, M, Escape
- global double Space toggles show/hide outside input
- input fields do not trigger shortcut
- review rating emits reaction
- boot layer toggle emits reaction
- TTS play emits reaction
- selection inspector still works above or beside Buddy
- settings save updates UI

### Not Done Unless Explicitly Requested

- AirPilot camera control
- phone remote pairing
- MediaPipe worker path
- full AI speech personalization beyond compact context
- generating new mascot art
- pushing changes to GitHub

## Extraction Notes For The Implementer

The original source has a few implementation quirks that should be cleaned during migration:

- `use-os-buddy.ts` in source contains a duplicated `const incrementInteraction = useCallback(` line in the read output. Verify the actual source before copying directly.
- `OSBuddyDock.tsx` source read output shows duplicated lines around `distanceFromPointToDockBox` and `shouldReturnHomeFromWalkTap`. Do not blindly paste. Port behavior, not accidental duplicate text.
- Source default position is inconsistent between migration SQL and hook fallback. Use target default `bottom-right`.
- Source uses very high z-indexes. Use target-appropriate z-indexes so `SelectionInspector` remains usable.
- Source uses shadcn components. Target does not have the same UI stack; use target Tailwind primitives.
- Source uses `framer-motion` and `zustand`. Target already has `motion`; avoid adding `framer-motion`. Prefer a local store or add `zustand` only if you intentionally choose parity.

## Commands And Evidence Used For This Extraction

Commands run locally:

```bash
rg -n "OS Buddy|os-buddy|buddy|speech|bubble|Air Remote|air-control" app docs -S
find app/src/components/os-buddy app/src/lib/os-buddy app/src/hooks app/src/stores app/src/app/api/os-buddy app/public/os-buddy -maxdepth 4 -type f
sed -n '1,260p' app/src/components/os-buddy/OSBuddyDock.tsx
sed -n '1,320p' app/src/lib/os-buddy/os-buddy-companion.ts
sed -n '1,260p' app/src/lib/os-buddy/os-buddy-shortcuts.ts
sed -n '400,790p' app/src/app/globals.css
git clone --depth 1 https://github.com/dev-james0723/japaneseweb.git /tmp/codex-japaneseweb-1780614679
find /tmp/codex-japaneseweb-1780614679 -maxdepth 3 -type f
sed -n '1,260p' /tmp/codex-japaneseweb-1780614679/app/'(app)'/layout.tsx
sed -n '1,320p' /tmp/codex-japaneseweb-1780614679/app/'(app)'/dashboard/BootSequence.tsx
sed -n '1,320p' /tmp/codex-japaneseweb-1780614679/app/'(app)'/review/ReviewSession.tsx
sed -n '1,260p' /tmp/codex-japaneseweb-1780614679/app/globals.css
```

GitHub connector evidence:

- Fetched `dev-james0723/japaneseweb` `README.md` through the GitHub connector.

Validation state for this document:

- This is a migration prompt and analysis artifact, not a code implementation.
- No target repository files were modified.
- No remote GitHub writes were performed.
