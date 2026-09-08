import { describe, expect, it } from "vitest";
import {
  adventureOutboxKey,
  defaultAdventureSettings,
  gardenInvitationEligible,
  mergeAdventurePending,
  readAdventureOutbox,
  resolveGardenTimezone,
} from "./persistence";

describe("Garden persistence boundaries", () => {
  it("separates accounts and recovers safely from unavailable or corrupt storage", () => {
    const saved = JSON.stringify([{ day: "2026-09-08", action: "plant:0" }]);
    const storage = {
      getItem: (key: string) =>
        key === adventureOutboxKey("A") ? saved : null,
    };
    expect(readAdventureOutbox(storage, "A")).toHaveLength(1);
    expect(readAdventureOutbox(storage, "B")).toEqual([]);
    expect(readAdventureOutbox({ getItem: () => "invalid" }, "A")).toEqual([]);
    expect(
      readAdventureOutbox(
        {
          getItem: () => {
            throw new Error("Privacy mode");
          },
        },
        "A",
      ),
    ).toEqual([]);
  });
  it("merges work from another tab, orders prerequisites, and removes only the acknowledged action", () => {
    const day = "2026-09-08";
    const result = mergeAdventurePending(
      [
        { day, action: "water:0" },
        { day, action: "deliver" },
      ],
      [
        { day, action: "plant:0" },
        { day, action: "water:0" },
        { day, action: "forage:1" },
      ],
      { day, action: "forage:1" },
    );
    expect(result.map((p) => p.action)).toEqual([
      "plant:0",
      "water:0",
      "deliver",
    ]);
  });
});

describe("Buddy garden invitations", () => {
  it("resolves the default automatic timezone while preserving an explicit account timezone", () => {
    expect(resolveGardenTimezone("auto", "Pacific/Honolulu")).toBe(
      "Pacific/Honolulu",
    );
    expect(resolveGardenTimezone("Europe/London", "Pacific/Honolulu")).toBe(
      "Europe/London",
    );
    expect(resolveGardenTimezone("invalid", "America/New_York")).toBe(
      "America/New_York",
    );
    expect(resolveGardenTimezone(null, "invalid")).toBe("UTC");
  });
  const base = {
    now: new Date("2026-09-08T16:00:00Z"),
    timezone: "America/Indiana/Indianapolis",
    settings: { ...defaultAdventureSettings, reminders_enabled: true },
    notificationEnabled: true,
    buddyEnabled: true,
    focusing: false,
    inGarden: false,
    playedToday: false,
    lastBubbleAt: null,
    hidden: false,
  };
  it("invites in local daytime and honours overnight quiet hours, DST and equal-hour silence", () => {
    expect(gardenInvitationEligible(base)).toBe(true);
    expect(
      gardenInvitationEligible({
        ...base,
        now: new Date("2026-09-08T06:00:00Z"),
      }),
    ).toBe(false);
    expect(
      gardenInvitationEligible({
        ...base,
        now: new Date("2026-12-08T13:00:00Z"),
      }),
    ).toBe(true);
    expect(gardenInvitationEligible({ ...base, timezone: "invalid" })).toBe(
      false,
    );
    expect(
      gardenInvitationEligible({
        ...base,
        settings: { ...base.settings, quiet_end: 22 },
      }),
    ).toBe(false);
  });
  it("suppresses invites during focus/play and after opt-out, recent invitation or another buddy bubble", () => {
    for (const patch of [
      { focusing: true },
      { inGarden: true },
      { playedToday: true },
      { hidden: true },
      { buddyEnabled: false },
      { notificationEnabled: false },
      { lastBubbleAt: base.now.getTime() - 5000 },
      { settings: { ...base.settings, reminders_enabled: false } },
      {
        settings: { ...base.settings, last_invited_at: "2026-09-08T12:00:00Z" },
      },
    ]) {
      expect(gardenInvitationEligible({ ...base, ...patch })).toBe(false);
    }
  });
});
