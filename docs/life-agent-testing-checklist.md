# Life Agent — Testing Checklist

> Use before release or after major Life Agent changes.
> Automated: `cd app && npm run test -- src/lib/life-agent`
> Full gate: `npm run lint --prefix app && npm run test --prefix app && npm run build --prefix app`

---

## 1. Safety (must pass)

| # | Check | How |
|---|--------|-----|
| S-01 | No DB write without user confirming action preview | Send chat → see preview cards → confirm → verify row in Tasks/Notes/etc. |
| S-02 | Cancel preview leaves data unchanged | Cancel card → status cancelled, no new task |
| S-03 | `read_only` domain blocks preview | Set Tasks to read-only → model suggestion for task not offered / 403 on API preview |
| S-04 | `off` domain absent from context | context-preview (dev) or memory-used panel — domain not listed |
| S-05 | `ask_every_time` needs grant | Deny domain → no context; grant in UI → included |
| S-06 | Invalid action JSON rejected | Unit: `life-agent-actions.test.ts` |
| S-07 | Expired preview → 410 | Unit: `preview-policy.test.ts`; manual: backdate row in DB |
| S-08 | Double confirm → 409 | Two rapid confirms on same id |
| S-09 | No “I created…” without execute | Read assistant reply after suggest-only turn |
| S-10 | No manipulative dependency copy | Check-in safety note; no “I need you” strings |
| S-11 | Inferred ≠ fact in intelligence | Inner conflicts use “possible tension” framing |

---

## 2. Permissions & RLS

| # | Check | How |
|---|--------|-----|
| R-01 | Unauthenticated API → 401 | `curl` without session |
| R-02 | User A cannot read user B conversation | Supabase RLS test or two accounts |
| R-03 | Upload path scoped to `auth.uid()` | Try foreign path in storage |

---

## 3. Chat & context

| # | Check | How |
|---|--------|-----|
| C-01 | Message order preserved | Send 3 messages, reload page |
| C-02 | Load older messages | >50 messages thread → button loads prior |
| C-03 | Missing API key fallback | Unset `GEMINI_API_KEY` → chat returns explanation, not 500 |
| C-04 | Long message clamped | Send 10k chars → no provider error |
| C-05 | memory_used visible | After chat, panel lists sources |

---

## 4. Workflows & intelligence

| # | Check | How |
|---|--------|-----|
| W-01 | Daily brief does not auto-run on mount | Fresh visit → no network until card selected |
| W-02 | Open loops / plan day run on demand | Click workflow → POST once |
| W-03 | Intelligence panels use real context | Empty user → empty states, no fake names |
| W-04 | Upload analyze 503 without key | Same as C-03 for file upload |

---

## 5. Character & presence (Phase 9)

| # | Check | How |
|---|--------|-----|
| P-01 | Check-in persists arrival | Reload → calm UI if anxious/heavy |
| P-02 | Character traits save to profile | Adjust sliders → save → reload |
| P-03 | Continuity only from confirmed memory | No card without `user_confirmed` memory |
| P-04 | Celebration after executed action | Confirm task preview → green card |
| P-05 | Reduced motion | OS setting → no avatar breathe / pulse |

---

## 6. Mobile & a11y

| # | Check | How |
|---|--------|-----|
| U-01 | Command bar reachable | iPhone viewport, keyboard open |
| U-02 | Permissions sheet works | xl:hidden sheet opens |
| U-03 | Conversation scrolls inside panel | Long thread does not stretch entire page |
| U-04 | aria-live announces new messages | Screen reader spot check |

---

## 7. i18n

| # | Check | How |
|---|--------|-----|
| I-01 | en + zh-TW core strings | Toggle language on Life Agent page |
| I-02 | No “Phase N” placeholder in zh-TW | Scan command bar tooltips |

---

## 8. Automated tests (current)

```
src/lib/life-agent/life-agent-actions.test.ts
src/lib/life-agent/life-agent-context.test.ts
src/lib/life-agent/open-loop-radar.test.ts
src/lib/life-agent/upload-route-intent.test.ts
src/lib/life-agent/intelligence/intelligence.test.ts
src/lib/life-agent/continuity.test.ts
src/lib/life-agent/character-state.test.ts
src/lib/life-agent/prompt-budget.test.ts
src/lib/life-agent/preview-policy.test.ts
```

---

## 9. Known limitations (v1)

- `temporaryPermissions` in confirm body is client-trusted (no signed grant token).
- No payload hash column on previews (expiry + status machine only).
- Conversation list UI not shipped (DB supports multiple threads).
- zh-CN copy incomplete.
- No API rate limiting.
