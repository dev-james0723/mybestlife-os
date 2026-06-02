import { describe, expect, it } from "vitest";

import {
  buildLocalOSBuddyCompanionResponse,
  normalizeOSBuddyMiniGame,
  selectOSBuddyCompanionKind,
  type OSBuddyCompactContext,
} from "./os-buddy-companion";

type ContextOverrides = Omit<Partial<OSBuddyCompactContext>, "schedule" | "memories"> & {
  schedule?: Partial<OSBuddyCompactContext["schedule"]>;
  memories?: Partial<OSBuddyCompactContext["memories"]>;
};

function baseContext(overrides: ContextOverrides = {}): OSBuddyCompactContext {
  const base: OSBuddyCompactContext = {
    locale: "en",
    buddyName: "Xiaoba",
    today: "2026-06-02",
    schedule: {
      load: "Balanced",
      itemCount: 1,
      overdueCount: 0,
      scheduledMinutes: 60,
      freeWindows: ["2h free 2 PM-4 PM"],
      items: [
        {
          title: "Draft product notes",
          sourceType: "task",
          startTime: null,
          endTime: null,
          overdue: false,
          priority: "medium",
        },
      ],
    },
    weather: {
      status: "ok",
      location: "Tsuen Wan",
      temperature: 29,
      condition: "Cloudy",
      rainChance: 20,
      alertLevel: null,
      alertKey: null,
    },
    quotes: [{ text: "Stay hungry, stay foolish.", author: "Steve Jobs", favorite: true }],
    memories: {
      journal: ["Career courage - calm - next: send one email"],
      ideas: ["Tiny companion pet UX"],
      gratefulThings: ["A good cup of tea"],
    },
    games: ["food-catch", "focus-tap", "clean-desk"],
  };

  return {
    ...base,
    ...overrides,
    schedule: { ...base.schedule, ...overrides.schedule },
    memories: { ...base.memories, ...overrides.memories },
  };
}

describe("selectOSBuddyCompanionKind", () => {
  it("prioritizes moderate or severe weather alerts", () => {
    const kind = selectOSBuddyCompanionKind({
      context: baseContext({
        weather: {
          status: "ok",
          location: "Tsuen Wan",
          temperature: 31,
          condition: "Heavy rain",
          rainChance: 88,
          alertLevel: "moderate",
          alertKey: "heavyRain",
        },
      }),
      recentKinds: ["weather", "quote"],
      random: 0.99,
    });

    expect(kind).toBe("weather");
  });

  it("prioritizes overdue reminders", () => {
    const kind = selectOSBuddyCompanionKind({
      context: baseContext({ schedule: { overdueCount: 2 } }),
      now: new Date("2026-06-02T15:00:00+08:00"),
      random: 0.99,
    });

    expect(kind).toBe("reminder");
  });

  it("prioritizes an item starting within 90 minutes", () => {
    const kind = selectOSBuddyCompanionKind({
      context: baseContext({
        schedule: {
          items: [
            {
              title: "Team sync",
              sourceType: "external",
              startTime: "09:45",
              endTime: "10:15",
            },
          ],
        },
      }),
      now: new Date("2026-06-02T09:00:00+08:00"),
      random: 0.99,
    });

    expect(kind).toBe("reminder");
  });

  it("avoids repeating the last two non-urgent categories", () => {
    const kind = selectOSBuddyCompanionKind({
      context: baseContext(),
      recentKinds: ["schedule", "quote"],
      now: new Date("2026-06-02T15:00:00+08:00"),
      random: 0,
    });

    expect(["schedule", "quote"]).not.toContain(kind);
  });

  it("handles missing personal data without throwing", () => {
    const kind = selectOSBuddyCompanionKind({
      context: baseContext({
        schedule: {
          load: null,
          itemCount: 0,
          overdueCount: 0,
          scheduledMinutes: 0,
          freeWindows: [],
          items: [],
        },
        weather: null,
        quotes: [],
        memories: { journal: [], ideas: [], gratefulThings: [] },
        games: [],
      }),
      random: 0.5,
    });

    expect(kind).toBe("fallback");
  });
});

describe("buildLocalOSBuddyCompanionResponse", () => {
  it("has a quote fallback for an empty library", () => {
    const response = buildLocalOSBuddyCompanionResponse({
      kind: "quote",
      context: baseContext({ quotes: [] }),
      random: 0,
    });

    expect(response.kind).toBe("quote");
    expect(response.message).toContain("Quote Library");
  });

  it("has a weather fallback when weather is unavailable", () => {
    const response = buildLocalOSBuddyCompanionResponse({
      kind: "weather",
      context: baseContext({ weather: null }),
      random: 0,
    });

    expect(response.kind).toBe("weather");
    expect(response.message.length).toBeGreaterThan(10);
  });

  it("creates a game CTA instead of auto-opening games", () => {
    const response = buildLocalOSBuddyCompanionResponse({
      kind: "game",
      context: baseContext(),
      random: 0,
    });

    expect(response.kind).toBe("game");
    expect(response.cta).toEqual({ label: "Play Food Catch", game: "food-catch" });
  });

  it("compliments from compact memory snippets", () => {
    const response = buildLocalOSBuddyCompanionResponse({
      kind: "compliment",
      context: baseContext(),
      random: 0,
    });

    expect(response.kind).toBe("compliment");
    expect(response.message).toContain("gratitude");
  });
});

describe("normalizeOSBuddyMiniGame", () => {
  it("maps legacy pixel-catch input to food-catch", () => {
    expect(normalizeOSBuddyMiniGame("pixel-catch")).toBe("food-catch");
    expect(normalizeOSBuddyMiniGame("food-catch")).toBe("food-catch");
  });
});
