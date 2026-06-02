import { describe, expect, it } from "vitest";
import {
  DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE,
  getDaysUntilOSBuddyBirthday,
  getOSBuddyBirthdayStatus,
  validateOSBuddyBirthdayProfile,
} from "./os-buddy-birthday";

describe("OS Buddy Birthday Mode helpers", () => {
  it("detects a birthday today without showing age by default", () => {
    const profile = validateOSBuddyBirthdayProfile({
      enabled: true,
      month: 6,
      day: 2,
      year: 1990,
      showAge: false,
    });

    expect(
      getOSBuddyBirthdayStatus({
        profile,
        now: new Date("2026-06-02T12:00:00"),
      }),
    ).toEqual({ type: "today" });
  });

  it("includes age only when explicitly enabled", () => {
    const profile = validateOSBuddyBirthdayProfile({
      enabled: true,
      month: 6,
      day: 2,
      year: 1990,
      showAge: true,
    });

    expect(
      getOSBuddyBirthdayStatus({
        profile,
        now: new Date("2026-06-02T12:00:00"),
      }),
    ).toEqual({ type: "today", age: 36 });
  });

  it("reports upcoming birthdays inside the seven day window", () => {
    const profile = validateOSBuddyBirthdayProfile({
      enabled: true,
      month: 6,
      day: 7,
    });

    expect(
      getOSBuddyBirthdayStatus({
        profile,
        now: new Date("2026-06-02T12:00:00"),
      }),
    ).toEqual({ type: "upcoming", daysUntil: 5 });
  });

  it("falls back to February 28 for leap day birthdays by default", () => {
    const profile = validateOSBuddyBirthdayProfile({
      enabled: true,
      month: 2,
      day: 29,
    });

    expect(
      getDaysUntilOSBuddyBirthday({
        profile,
        now: new Date("2026-02-27T12:00:00"),
      }),
    ).toBe(1);
  });

  it("resets invalid dates to the default birthday profile", () => {
    expect(
      validateOSBuddyBirthdayProfile({
        enabled: true,
        month: 4,
        day: 31,
      }),
    ).toEqual(DEFAULT_OS_BUDDY_BIRTHDAY_PROFILE);
  });
});
