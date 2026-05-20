import { describe, expect, it } from "vitest";
import { safeGoogleCalendarOAuthReturnPath } from "@/lib/google/oauth-return-path";

describe("safeGoogleCalendarOAuthReturnPath", () => {
  it("accepts locale settings root", () => {
    expect(safeGoogleCalendarOAuthReturnPath("/zh-hk/settings")).toBe("/zh-hk/settings");
    expect(safeGoogleCalendarOAuthReturnPath("/en/settings/")).toBe("/en/settings");
  });

  it("accepts nested settings routes", () => {
    expect(safeGoogleCalendarOAuthReturnPath("/zh-hk/settings/ai-preferences")).toBe(
      "/zh-hk/settings/ai-preferences",
    );
  });

  it("accepts daily planner return", () => {
    expect(safeGoogleCalendarOAuthReturnPath("/ja/daily-planner")).toBe("/ja/daily-planner");
  });

  it("rejects open redirects and non-app paths", () => {
    expect(safeGoogleCalendarOAuthReturnPath("//evil.com")).toBeNull();
    expect(safeGoogleCalendarOAuthReturnPath("/en/../admin")).toBeNull();
    expect(safeGoogleCalendarOAuthReturnPath("https://evil.test/en/settings")).toBeNull();
    expect(safeGoogleCalendarOAuthReturnPath("/en/dashboard")).toBeNull();
  });
});
