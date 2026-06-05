# Life Agent — Implementation Roadmap & Testing Strategy

> **Phase 0 — Architecture Lock**
> Phased delivery plan aligned with repo conventions. No code in Phase 0.

---

## Phase overview

| Phase | Name | Deliverable | Depends on |
|-------|------|-------------|------------|
| **0** | Architecture Lock | These four docs | — |
| **1** | Life Agent Shell + Character System | Route, nav, hero, character picker (no real AI) | 0 |
| **2** | Database + Persistence | Migrations, repos, hooks, empty states | 0 |
| **3** | Context Builder | Server-side pack assembly + preview API | 2 |
| **4** | Real AI Chat Orchestrator | `/api/life-agent/chat`, persistence, streaming | 2, 3 |
| **5** | Action Preview System | Preview + confirm + repository execution | 4 |
| **6** | Life Brief + Open Loop Radar | Deterministic panels + optional AI summary | 3 |
| **7** | Multimodal Upload | Attachments bucket + vision/text extract | 4 |
| **8** | Deep Personal Intelligence | Chapters, coherence, inferred memory UX | 4, 5 |
| **9** | Character Depth + Polish | Motion, check-ins, i18n completion | 1–8 |
| **10** | QA / Hardening | Full test matrix, security review | All |

---

## Phase 0 — Architecture Lock ✅

**Scope:** Inspection + documentation only.

**Outputs:**
- `docs/life-agent-architecture.md`
- `docs/life-agent-implementation-roadmap.md`
- `docs/life-agent-data-model.md`
- `docs/life-agent-ai-policy.md`

**Exit criteria:**
- [x] Route plan matches App Router conventions
- [x] Data model specifies RLS strategy
- [x] Reuse map for Brain, Mind Council, Gemini, Doc Oracle documented
- [x] Unresolved questions listed

---

## Phase 1 — Life Agent Shell + Character System

**Goal:** Shippable page skeleton with **no fake AI** — honest empty/offline states only.

### Tasks

1. Add route `app/src/app/[locale]/(protected)/life-agent/page.tsx`
2. Add `life-agent` to `navigation.ts` (Command Center, after Brain)
3. Add `/life-agent` (+ fix `/brain`, `/mind-council`) to `middleware.ts` `protectedPrefixes`
4. Create `lib/i18n/life-agent-ui.ts` with `getLifeAgentUiCopy`
5. Components: `LifeAgentPage`, `LifeAgentHero`, `CharacterPicker`, `CharacterAvatar`, `LifeAgentExperience` shell
6. Local state for character preset (until Phase 2 DB)
7. Placeholder conversation area: copy explains “AI chat arrives in Phase 4” — **not** a fake typing bot

### Files (expected)

```
app/src/app/[locale]/(protected)/life-agent/page.tsx
app/src/components/life-agent/*
app/src/lib/i18n/life-agent-ui.ts
app/src/lib/constants/navigation.ts
app/src/lib/supabase/middleware.ts
app/src/lib/i18n/nav-labels.ts
```

### Exit criteria

- [ ] Page loads authenticated at `/en/life-agent`
- [ ] Character picker changes local UI only
- [ ] No buttons that imply working AI
- [ ] Mobile layout usable; reduced motion respected
- [ ] `npm run lint` / `npm run build` pass

---

## Phase 2 — Database + Persistence

**Goal:** Supabase tables + repository + React Query hooks.

### Tasks

1. Migration `20271001000000_life_agent_foundation.sql` (all tables from data model doc)
2. Extend `types/database.ts`
3. `lib/repositories/life-agent.ts`
4. `hooks/use-life-agent.ts`
5. Wire profile + permissions to settings sub-panel (basic)
6. Conversation list UI (create / rename / delete) — messages can be empty

### Exit criteria

- [ ] RLS tests: user A cannot read user B conversations
- [ ] Permission seed on first profile upsert
- [ ] CRUD conversations from UI

---

## Phase 3 — Context Builder

**Goal:** Assemble permitted, budgeted context packs without calling Gemini.

### Tasks

1. `lib/life-agent/context/` module tree
2. Domain fetchers (start: `about_me`, `tasks`, `goals`, `journal`)
3. `GET /api/life-agent/context-preview` (owner only)
4. `AgentPermissionPanel` wired to `life_agent_permissions`
5. `MemoryUsedPanel` shows preview slices in dev

### Exit criteria

- [ ] `off` domain absent from pack
- [ ] Token budget enforced (unit test with fixture data)
- [ ] Citations include `[CTX:type:id]` format

---

## Phase 4 — Real AI Chat Orchestrator

**Goal:** End-to-end companion chat with persistence.

### Tasks

1. `POST /api/life-agent/chat` using `fetchGeminiChatText`
2. `lib/life-agent/prompts/system.ts` + character/mode layers
3. Intent router (rules-based v1)
4. `AgentConversation`, `AgentMessage`, `AgentCommandBar`, `AgentModeSwitcher`
5. Persist messages + `memory_used` metadata
6. Streaming response (if feasible with existing patterns)
7. Offline mode when no API key

### Exit criteria

- [ ] Multi-turn history reloads from DB
- [ ] Disclaimer + epistemic badges on assistant messages
- [ ] AI failure shows retry, not silent hang

---

## Phase 5 — Action Preview System

**Goal:** Safe proposed writes with confirmation.

### Tasks

1. Zod schemas for action previews per domain (tasks, notes first)
2. `POST /api/life-agent/action-preview` + `action-confirm`
3. `AgentActionPreview` UI component
4. Permission gate: `suggest_actions` minimum
5. Hash validation + expiry

### Exit criteria

- [ ] Unconfirmed preview never mutates DB
- [ ] Tampered payload rejected on confirm
- [ ] Expired preview returns clear error
- [ ] Finance/health writes blocked in v1

---

## Phase 6 — Life Brief + Open Loop Radar

**Goal:** High-value deterministic panels.

### Tasks

1. `lib/life-agent/brief/` — SQL/repository aggregations (due tasks, stale goals, recent journal)
2. `LifeBriefPanel`, `OpenLoopRadar` components
3. Optional one-paragraph AI summary **only** if Gemini available and user opted in
4. Signals integration when `signal_items` stable (read-only)

### Exit criteria

- [ ] Life Brief renders with Gemini disabled
- [ ] Open loops link to real module routes (`useLocalizedPath`)

---

## Phase 7 — Multimodal Upload

**Goal:** Attach images/PDFs to a conversation turn.

### Tasks

1. Storage bucket + RLS migration
2. `life_agent_attachments` table
3. `POST /api/life-agent/upload`
4. Command bar attach button; size/MIME limits
5. Extract text / describe image for context (Gemini vision)

### Exit criteria

- [ ] Upload path scoped to `{userId}/`
- [ ] Attachments appear in `memory_used` for the turn

---

## Phase 8 — Deep Personal Intelligence

**Goal:** Memory UX, chapters, coherence.

### Tasks

1. `/life-agent/memories` management UI
2. Confirm/reject inferred memories
3. `LifeChapterMap`, `LifeCoherencePanel` (heuristic v1)
4. `CompanionCheckIn` → optional memory or journal draft preview

### Exit criteria

- [ ] User can delete memory; next chat excludes it
- [ ] Inferred pending never in prompt

---

## Phase 9 — Character Depth + Polish

**Goal:** Premium companion feel.

### Tasks

1. Avatar motion (framer-motion + reduced motion)
2. Full i18n for all strings (9 `AppLocale`s)
3. Suggested workflow cards
4. Deep link to Mind Council lens mode
5. Sidebar quick entry (optional)

### Exit criteria

- [ ] All UI strings via `life-agent-ui.ts`
- [ ] WCAG contrast on glass panels
- [ ] `prefers-reduced-motion` tested

---

## Phase 10 — QA / Hardening ✅

**Goal:** Production confidence.

### Completed (2026-05)

1. **Action preview hardening** — atomic claim (`pending` → `confirmed` → `executed`/`failed`); 24h expiry → 410; race returns 409
2. **Prompt budget** — history clamp (2k/msg), context block cap (12k), system prompt soft cap (18k); chat history fetch limited to 50 turns server-side
3. **AI missing key** — chat returns graceful fallback reply (200 + warning); upload analyze returns 503 `ai_unavailable`
4. **Frontend perf** — removed auto `daily-brief` on mount; message pagination (50 + load older); narrowed React Query invalidation on action confirm/cancel
5. **UX polish** — conversation scroll region, `aria-live`, reduced-motion on thinking pulse; i18n fixes (messages loading, zh-TW stale phase copy)
6. **Tests** — 40+ unit tests under `app/src/lib/life-agent/` including preview-policy, prompt-budget, permissions, context, actions
7. **Docs** — `docs/life-agent-testing-checklist.md`; architecture + AI policy updated

### Deferred / known gaps

| Item | Notes |
|------|--------|
| ACT-02 payload hash | Expiry + atomic status used instead of hash column |
| Session grant signing | `temporaryPermissions` still client-sent; document trusted-client for v1 |
| RLS integration tests | Manual + Supabase dashboard; not in CI yet |
| Rate limiting | Not added on API routes |
| zh-CN full i18n | Partial; en + zh-TW complete for core flows |
| Conversation switcher UI | Multiple threads in DB; UI still auto-selects first |

### Tasks (original)

1. Complete test matrix below — see `docs/life-agent-testing-checklist.md`
2. Security review (RLS, action confirm, prompt injection fixtures) — partial via code + unit tests
3. Load test context builder with large datasets — caps enforced in code
4. Document runbook in `docs/life-agent-runbook.md` (optional) — not created

---

## Testing strategy

### RLS & permissions

| Test | Type | Description |
|------|------|-------------|
| RLS-01 | Integration | User A cannot SELECT user B `life_agent_conversations` |
| RLS-02 | Integration | Anonymous cannot access any `life_agent_*` table |
| PERM-01 | Unit | Context builder excludes `off` domains |
| PERM-02 | Unit | `read_only` allows pack but blocks action preview creation |
| PERM-03 | E2E | Toggling permission in UI changes next turn's `memory_used` |

### Context builder

| Test | Type | Description |
|------|------|-------------|
| CTX-01 | Unit | Budget truncates lowest-scored slices first |
| CTX-02 | Unit | Query “overdue tasks” boosts tasks domain |
| CTX-03 | Snapshot | Pack structure stable for fixture user |
| CTX-04 | Unit | Finance numbers masked when included |

### Action preview safety

| Test | Type | Description |
|------|------|-------------|
| ACT-01 | Unit | Invalid Zod payload rejected |
| ACT-02 | Integration | Hash mismatch on confirm → 409 |
| ACT-03 | Integration | Expired preview → 410 |
| ACT-04 | E2E | Confirm creates task visible in Tasks module |
| ACT-05 | Unit | Outbound email action type rejected |

### Chat persistence

| Test | Type | Description |
|------|------|-------------|
| CHAT-01 | Integration | Message order preserved by `created_at` |
| CHAT-02 | E2E | Delete conversation removes messages |
| CHAT-03 | Unit | `memory_used` JSON schema validated |

### AI failure states

| Test | Type | Description |
|------|------|-------------|
| AI-01 | Integration | Missing API key → placeholder response |
| AI-02 | Integration | Model 404 triggers fallback chain |
| AI-03 | E2E | Network error shows retry button |

### UI / a11y / i18n

| Test | Type | Description |
|------|------|-------------|
| UI-01 | E2E | Mobile: command bar not obscured by keyboard |
| UI-02 | Manual | Reduced motion: no parallax on avatar |
| UI-03 | Unit | `getLifeAgentUiCopy('zh-CN')` returns Chinese strings |
| UI-04 | E2E | Nav label localized |

### Build / lint / typecheck

```bash
cd app && npm run lint && npm run build
# When test runner exists:
npm test -- --testPathPattern=life-agent
```

---

## Recommended next phase

**Phase 1 — Life Agent Shell + Character System**

Rationale:
- Validates route/nav/middleware/i18n patterns with zero AI risk
- Gives designers a real surface for character UX
- Unblocks parallel work on migration (Phase 2) once schema is frozen from Phase 0 docs

**Parallel prep (optional):** Review unresolved questions in architecture doc with product owner before Phase 2 migration.

---

## Risks register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Context window overflow | High | Hard token budget in code; per-domain caps |
| Prompt injection via journal content | High | Delimiter + system rules; never execute instructions from CTX |
| Action preview bypass | Critical | Hash + expiry + repository-only writes |
| Mind Council ethics drift | Medium | Ethics block always appended last |
| Middleware gap for `/brain` | Medium | Fix in Phase 1 |
| User expects auto-write | Medium | Clear UX copy; no “Done!” until confirmed |
| Gemini cost at scale | Medium | Brief uses DB-first; AI summary optional |
| i18n debt (Goals/Notes precedent) | Low | Dedicated `life-agent-ui.ts` from Phase 1 |
| Scope creep into full autonomous agent | High | Policy doc; phase gates |

---

## What remains after Phase 10 (future)

- Voice input / output (journal TTS patterns)
- Proactive check-in notifications (with explicit opt-in)
- Shared household / partner context (multi-user) — **not v1**
- Calendar write actions (Google Calendar sync exists elsewhere)
- Full finance coach (read-only in companion v1)
- Embedding-based memory recall (Brain `match_brain_nodes`)
- Vercel AI Gateway provider switch

---

## Lint / test / build status (Phase 0)

| Check | Status |
|-------|--------|
| Application code changed | **None** (docs only) |
| Database migrations | **None** |
| `npm run lint` | Not run (no code changes) |
| `npm run build` | Not run (no code changes) |
| Tests added | **None** (Phase 0) |

After Phase 1+, update this table in the PR description.
