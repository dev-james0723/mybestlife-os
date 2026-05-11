/**
 * Lightweight test runner for the two pure Bio Lab modules:
 *   - src/lib/bio-lab/history-summary.ts
 *   - src/lib/bio-lab/hub-suggestion-rules.ts
 *
 * We deliberately avoid pulling in vitest/jest just for these two files.
 * `node --experimental-strip-types` runs TypeScript directly; both modules
 * have only `import type` runtime dependencies, so they import cleanly here.
 *
 * Usage (from app/):
 *   npm run test:bio-lab
 *   node --experimental-strip-types scripts/test-bio-lab-pure.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed (details printed)
 */

import assert from "node:assert/strict";

import {
  buildToolSparkline,
  formatLastUsedLabel,
  summariseBioLabHistory,
  type BioLabHistorySummaryInput,
} from "../src/lib/bio-lab/history-summary.ts";
import {
  computeHubSuggestion,
  MAX_AGE_HOURS,
} from "../src/lib/bio-lab/hub-suggestion-rules.ts";
import type {
  BioLabStateScanRow,
  BioLabMindSweepRow,
  BioLabFocusSprintRow,
  BioLabSystemResetRow,
} from "../src/lib/repositories/bio-lab.ts";

// ============================================================
// Tiny test harness
// ============================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    failures.push(`✗ ${name}\n${indent(message, "    ")}`);
    process.stdout.write(`  ✗ ${name}\n`);
  }
}

function group(label: string, body: () => void) {
  process.stdout.write(`\n${label}\n`);
  body();
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

// ============================================================
// Fixtures — minimal, hand-written rows
// ============================================================

const REF_NOW = new Date("2026-04-19T15:00:00.000Z"); // Sunday 11am EDT / 8am PDT

/**
 * Build an ISO timestamp that is exactly N days before REF_NOW.
 *
 * We deliberately compute the offset in UTC (not via setHours) so the test
 * is timezone-independent. The optional `hourOffsetWithinDay` parameter
 * shifts the timestamp within that day in UTC hours — used to control which
 * row sorts first when multiple share a day.
 */
function isoDaysAgo(days: number, hourOffsetWithinDay = 0): string {
  const ms = REF_NOW.getTime() - days * 24 * 3600 * 1000;
  const shifted = ms + hourOffsetWithinDay * 3600 * 1000;
  return new Date(shifted).toISOString();
}

function stateScan(
  overrides: Partial<BioLabStateScanRow> = {},
): BioLabStateScanRow {
  return {
    id: `ss-${Math.random().toString(36).slice(2, 8)}`,
    user_id: "u-test",
    mood: 3,
    energy: 3,
    focus: 3,
    stress: 2,
    note: "",
    ai_assisted: false,
    ai_metadata: null,
    created_at: isoDaysAgo(0),
    ...overrides,
  };
}

function mindSweep(
  overrides: Partial<BioLabMindSweepRow> = {},
): BioLabMindSweepRow {
  return {
    id: `ms-${Math.random().toString(36).slice(2, 8)}`,
    user_id: "u-test",
    items: [],
    triage_insight: null,
    ai_assisted: false,
    ai_metadata: null,
    created_at: isoDaysAgo(0),
    ...overrides,
  };
}

function focusSprint(
  overrides: Partial<BioLabFocusSprintRow> = {},
): BioLabFocusSprintRow {
  return {
    id: `fs-${Math.random().toString(36).slice(2, 8)}`,
    user_id: "u-test",
    intention: "",
    work_seconds: 1500,
    break_seconds: 300,
    outcome: "completed",
    focus_rating: 3,
    reflection_note: "",
    ai_assisted: false,
    ai_metadata: null,
    created_at: isoDaysAgo(0),
    ...overrides,
  };
}

function systemReset(
  overrides: Partial<BioLabSystemResetRow> = {},
): BioLabSystemResetRow {
  return {
    id: `sr-${Math.random().toString(36).slice(2, 8)}`,
    user_id: "u-test",
    steps: [],
    ai_assisted: false,
    ai_metadata: null,
    created_at: isoDaysAgo(0),
    ...overrides,
  };
}

const emptyInput: BioLabHistorySummaryInput = {
  stateScans: [],
  mindSweeps: [],
  focusSprints: [],
  systemResets: [],
  now: REF_NOW,
};

// ============================================================
// summariseBioLabHistory
// ============================================================

group("summariseBioLabHistory", () => {
  test("empty input → safe defaults, no streak, no history", () => {
    const s = summariseBioLabHistory(emptyInput);
    assert.equal(s.windowTotal, 0);
    assert.equal(s.streakDays, 0);
    assert.equal(s.didSomethingToday, false);
    assert.equal(s.hasAnyHistory, false);
    assert.equal(s.anyAiAssistedRecently, false);
    assert.deepEqual(s.unifiedTimeline, []);
    assert.deepEqual(s.recentByTool, {
      "state-scan": 0,
      "mind-sweep": 0,
      "focus-sprint": 0,
      "system-reset": 0,
    });
  });

  test("counts per-tool sessions inside the 7-day window", () => {
    const s = summariseBioLabHistory({
      ...emptyInput,
      stateScans: [stateScan({ created_at: isoDaysAgo(0) })],
      focusSprints: [
        focusSprint({ created_at: isoDaysAgo(2) }),
        focusSprint({ created_at: isoDaysAgo(6) }),
      ],
      systemResets: [
        systemReset({ created_at: isoDaysAgo(8) }), // outside 7-day window
      ],
    });
    assert.equal(s.recentByTool["state-scan"], 1);
    assert.equal(s.recentByTool["focus-sprint"], 2);
    assert.equal(s.recentByTool["system-reset"], 0); // 8 days ago
    assert.equal(s.windowTotal, 3);
    assert.equal(s.hasAnyHistory, true);
  });

  test("lastUsedByTool always reflects newest, even outside window", () => {
    const s = summariseBioLabHistory({
      ...emptyInput,
      systemResets: [
        systemReset({ created_at: isoDaysAgo(20) }),
        systemReset({ created_at: isoDaysAgo(40) }),
      ],
    });
    assert.equal(s.recentByTool["system-reset"], 0);
    assert.ok(s.lastUsedByTool["system-reset"]);
    assert.equal(s.lastUsedByTool["system-reset"], isoDaysAgo(20));
    assert.equal(s.lastUsedByTool["state-scan"], null);
  });

  test("streak counts consecutive local days; survives 'no session today, did yesterday'", () => {
    const s = summariseBioLabHistory({
      ...emptyInput,
      stateScans: [
        stateScan({ created_at: isoDaysAgo(1) }),
        stateScan({ created_at: isoDaysAgo(2) }),
        stateScan({ created_at: isoDaysAgo(3) }),
      ],
    });
    assert.equal(s.didSomethingToday, false);
    assert.equal(s.streakDays, 3, "should anchor on yesterday and walk back");
  });

  test("streak breaks on first gap day", () => {
    const s = summariseBioLabHistory({
      ...emptyInput,
      stateScans: [
        stateScan({ created_at: isoDaysAgo(0) }), // today
        stateScan({ created_at: isoDaysAgo(1) }), // yesterday
        // gap day -2 missing
        stateScan({ created_at: isoDaysAgo(3) }),
      ],
      now: REF_NOW,
    });
    assert.equal(s.didSomethingToday, true);
    assert.equal(s.streakDays, 2, "must stop at the gap on day -2");
  });

  test("streak is 0 if no session today nor yesterday", () => {
    const s = summariseBioLabHistory({
      ...emptyInput,
      stateScans: [stateScan({ created_at: isoDaysAgo(3) })],
    });
    assert.equal(s.streakDays, 0);
  });

  test("anyAiAssistedRecently flips only when AI helped inside the window", () => {
    const recentAi = summariseBioLabHistory({
      ...emptyInput,
      mindSweeps: [
        mindSweep({ created_at: isoDaysAgo(2), ai_assisted: true }),
      ],
    });
    assert.equal(recentAi.anyAiAssistedRecently, true);

    const oldAi = summariseBioLabHistory({
      ...emptyInput,
      mindSweeps: [
        mindSweep({ created_at: isoDaysAgo(20), ai_assisted: true }),
      ],
    });
    assert.equal(oldAi.anyAiAssistedRecently, false);
  });

  test("unifiedTimeline is newest-first across all four tools", () => {
    const s = summariseBioLabHistory({
      ...emptyInput,
      stateScans: [stateScan({ id: "ss-old", created_at: isoDaysAgo(2) })],
      mindSweeps: [mindSweep({ id: "ms-mid", created_at: isoDaysAgo(1) })],
      focusSprints: [
        focusSprint({ id: "fs-new", created_at: isoDaysAgo(0, 14) }),
      ],
    });
    const ids = s.unifiedTimeline.map((e) => e.id);
    assert.deepEqual(ids, ["fs-new", "ms-mid", "ss-old"]);
  });

  test("unifiedTimeline is capped at 30 entries", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      stateScan({ id: `ss-${i}`, created_at: isoDaysAgo(i % 7, 9 + (i % 5)) }),
    );
    const s = summariseBioLabHistory({ ...emptyInput, stateScans: many });
    assert.equal(s.unifiedTimeline.length, 30);
  });
});

// ============================================================
// formatLastUsedLabel
// ============================================================

group("formatLastUsedLabel", () => {
  const strings = {
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: (n: number) => `${n}d ago`,
    longAgo: "30d+",
  };

  test("null input → null output (badge hides itself)", () => {
    assert.equal(formatLastUsedLabel(null, strings, REF_NOW), null);
  });

  test("today → 'Today'", () => {
    assert.equal(formatLastUsedLabel(isoDaysAgo(0), strings, REF_NOW), "Today");
  });

  test("yesterday → 'Yesterday'", () => {
    assert.equal(
      formatLastUsedLabel(isoDaysAgo(1), strings, REF_NOW),
      "Yesterday",
    );
  });

  test("3 days ago → '3d ago'", () => {
    assert.equal(formatLastUsedLabel(isoDaysAgo(3), strings, REF_NOW), "3d ago");
  });

  test("30+ days ago → '30d+'", () => {
    assert.equal(formatLastUsedLabel(isoDaysAgo(45), strings, REF_NOW), "30d+");
  });

  test("invalid ISO → null", () => {
    assert.equal(formatLastUsedLabel("not-a-date", strings, REF_NOW), null);
  });
});

// ============================================================
// buildToolSparkline
// ============================================================

group("buildToolSparkline", () => {
  test("empty rows → 7 zero cells, last cell isToday", () => {
    const cells = buildToolSparkline([], REF_NOW);
    assert.equal(cells.length, 7);
    assert.deepEqual(
      cells.map((c) => c.count),
      [0, 0, 0, 0, 0, 0, 0],
    );
    assert.equal(cells.at(-1)?.isToday, true);
    assert.equal(cells[0]?.isToday, false);
  });

  test("counts collapse to local-day buckets", () => {
    // Offsets are negative so the events stay anchored within REF_NOW's
    // local day on hosts at any UTC offset (we explicitly tested this
    // previously broke on UTC+8 where REF_NOW lands at 23:00 local).
    const cells = buildToolSparkline(
      [
        { created_at: isoDaysAgo(0) },
        { created_at: isoDaysAgo(0, -1) },
        { created_at: isoDaysAgo(2) },
      ],
      REF_NOW,
    );
    assert.equal(cells.at(-1)?.count, 2, "two sessions today");
    assert.equal(cells.at(-3)?.count, 1, "one session 2 days ago");
    assert.equal(cells.at(-2)?.count, 0, "yesterday is empty");
  });

  test("rows older than 7 days are ignored", () => {
    const cells = buildToolSparkline(
      [{ created_at: isoDaysAgo(20) }, { created_at: isoDaysAgo(0) }],
      REF_NOW,
    );
    const total = cells.reduce((acc, c) => acc + c.count, 0);
    assert.equal(total, 1);
  });

  test("invalid created_at strings are silently dropped", () => {
    const cells = buildToolSparkline(
      [
        { created_at: "not-a-date" },
        { created_at: isoDaysAgo(0) },
      ],
      REF_NOW,
    );
    const total = cells.reduce((acc, c) => acc + c.count, 0);
    assert.equal(total, 1);
  });
});

// ============================================================
// computeHubSuggestion
// ============================================================

group("computeHubSuggestion", () => {
  test("null entry → null suggestion", () => {
    assert.equal(computeHubSuggestion({ mostRecent: null, now: REF_NOW }), null);
  });

  test("State Scan with high stress → System Reset (stress-high-reset)", () => {
    const row = stateScan({ stress: 5, created_at: isoDaysAgo(0) });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.ok(result);
    assert.equal(result?.toolId, "system-reset");
    assert.equal(result?.reasonKey, "stress-high-reset");
    assert.equal(result?.dismissKey, `${row.id}:stress-high-reset`);
  });

  test("State Scan with low energy → System Reset (energy-low-reset)", () => {
    const row = stateScan({ energy: 1, stress: 2, created_at: isoDaysAgo(0) });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result?.reasonKey, "energy-low-reset");
  });

  test("State Scan with high focus → Focus Sprint (focus-ready-sprint)", () => {
    const row = stateScan({
      focus: 5,
      stress: 2,
      energy: 4,
      created_at: isoDaysAgo(0),
    });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result?.toolId, "focus-sprint");
    assert.equal(result?.reasonKey, "focus-ready-sprint");
  });

  test("Neutral State Scan → null (quiet by design)", () => {
    const row = stateScan({
      mood: 3,
      energy: 3,
      focus: 3,
      stress: 2,
      created_at: isoDaysAgo(0),
    });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result, null);
  });

  test("Mind Sweep with 5+ items → Focus Sprint (many-thoughts-sprint)", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      text: `t${i}`,
      kind: "task" as const,
      ai_label_confidence: null,
    }));
    const row = mindSweep({ items, created_at: isoDaysAgo(0) });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "mind-sweep",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result?.toolId, "focus-sprint");
    assert.equal(result?.reasonKey, "many-thoughts-sprint");
  });

  test("Light Mind Sweep (<5 items) → null", () => {
    const row = mindSweep({
      items: [{ text: "t", kind: "task", ai_label_confidence: null }],
      created_at: isoDaysAgo(0),
    });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "mind-sweep",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result, null);
  });

  test("Focus Sprint rated low (≤2) → System Reset (sprint-weak-reset)", () => {
    const row = focusSprint({ focus_rating: 2, created_at: isoDaysAgo(0) });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "focus-sprint",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result?.reasonKey, "sprint-weak-reset");
  });

  test("Focus Sprint rated high (≥4) → State Scan (sprint-strong-rescan)", () => {
    const row = focusSprint({ focus_rating: 5, created_at: isoDaysAgo(0) });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "focus-sprint",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result?.toolId, "state-scan");
    assert.equal(result?.reasonKey, "sprint-strong-rescan");
  });

  test("Focus Sprint mid-rating or null → null", () => {
    const midRow = focusSprint({ focus_rating: 3, created_at: isoDaysAgo(0) });
    const nullRow = focusSprint({
      focus_rating: null,
      created_at: isoDaysAgo(0),
    });
    for (const row of [midRow, nullRow]) {
      const result = computeHubSuggestion({
        mostRecent: {
          kind: "focus-sprint",
          id: row.id,
          createdAt: row.created_at,
          aiAssisted: false,
          row,
        },
        now: REF_NOW,
      });
      assert.equal(result, null);
    }
  });

  test("System Reset → always State Scan (reset-rescan)", () => {
    const row = systemReset({ created_at: isoDaysAgo(0) });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "system-reset",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result?.toolId, "state-scan");
    assert.equal(result?.reasonKey, "reset-rescan");
  });

  test(`freshness gate: entry older than ${MAX_AGE_HOURS}h → null`, () => {
    const old = new Date(REF_NOW.getTime() - (MAX_AGE_HOURS + 1) * 3600 * 1000);
    const row = stateScan({
      stress: 5,
      created_at: old.toISOString(),
    });
    const result = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(result, null);
  });

  test("dismissKey is stable: same row + reason → same key", () => {
    const row = stateScan({ stress: 5, created_at: isoDaysAgo(0) });
    const a = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    const b = computeHubSuggestion({
      mostRecent: {
        kind: "state-scan",
        id: row.id,
        createdAt: row.created_at,
        aiAssisted: false,
        row,
      },
      now: REF_NOW,
    });
    assert.equal(a?.dismissKey, b?.dismissKey);
  });
});

// ============================================================
// Summary
// ============================================================

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.stdout.write(`\nFailures:\n${failures.join("\n\n")}\n`);
  process.exit(1);
}
process.exit(0);
