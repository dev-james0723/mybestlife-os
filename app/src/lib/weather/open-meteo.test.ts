import { afterEach, describe, expect, it, vi } from "vitest";

import {
  categorizeAqi,
  fetchUvAndAirQuality,
  parseUvIndex,
} from "@/lib/weather/open-meteo";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  vi.restoreAllMocks();
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

function installBrowserWindow(origin = "http://127.0.0.1:3000") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { origin } },
  });
}

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

describe("fetchUvAndAirQuality", () => {
  it("does not fall back to third-party Open-Meteo fetches in the browser", async () => {
    installBrowserWindow();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
    } as Response);

    await expect(fetchUvAndAirQuality(34.0544, -118.244)).resolves.toEqual({
      uvIndex: null,
      airQualityIndex: null,
      aqiCategory: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/weather/supplements",
    );
  });

  it("returns empty supplements without network work when browser proxying is disabled", async () => {
    installBrowserWindow();
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      fetchUvAndAirQuality(34.0544, -118.244, { useProxy: false }),
    ).resolves.toEqual({
      uvIndex: null,
      airQualityIndex: null,
      aqiCategory: null,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
