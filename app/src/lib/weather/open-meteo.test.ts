import { describe, expect, it } from "vitest";

import { categorizeAqi, parseUvIndex } from "@/lib/weather/open-meteo";

describe("parseUvIndex", () => {
  it("returns 0 for zero (nighttime) instead of treating it as missing", () => {
    expect(parseUvIndex(0)).toBe(0);
    expect(parseUvIndex(0.4)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(parseUvIndex(5.6)).toBe(6);
  });

  it("returns null for invalid input", () => {
    expect(parseUvIndex(null)).toBeNull();
    expect(parseUvIndex(undefined)).toBeNull();
    expect(parseUvIndex("nope")).toBeNull();
  });
});

describe("categorizeAqi", () => {
  it("maps EPA breakpoints", () => {
    expect(categorizeAqi(42)).toBe("good");
    expect(categorizeAqi(120)).toBe("sensitive");
  });
});
