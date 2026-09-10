import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RAINVIEWER_ATTRIBUTION,
  RAINVIEWER_BASEMAP_URL,
  fetchRadarFrames,
  radarTileUrl,
} from "./rainviewer";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RainViewer map URLs", () => {
  it("uses the official keyless RainViewer basemap instead of CARTO", () => {
    expect(RAINVIEWER_BASEMAP_URL).toBe(
      "https://maps.rainviewer.com/styles/m2_dark/256/{z}/{x}/{y}.png",
    );
    expect(RAINVIEWER_BASEMAP_URL).not.toMatch(/carto/i);
    expect(RAINVIEWER_ATTRIBUTION).toContain("RainViewer");
  });

  it("uses the supported Universal Blue scheme for radar overlays", () => {
    expect(
      radarTileUrl("https://tilecache.rainviewer.com", {
        time: 1_788_842_400,
        path: "/v2/radar/1788842400",
        nowcast: false,
      }),
    ).toBe(
      "https://tilecache.rainviewer.com/v2/radar/1788842400/256/{z}/{x}/{y}/2/1_1.png",
    );
  });

  it("loads past frames when the current API omits nowcast data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          host: "https://tilecache.rainviewer.com",
          radar: {
            past: [
              { time: 1_788_841_800, path: "/v2/radar/1788841800" },
              { time: 1_788_842_400, path: "/v2/radar/1788842400" },
            ],
          },
        }),
      }),
    );

    await expect(fetchRadarFrames()).resolves.toEqual({
      host: "https://tilecache.rainviewer.com",
      frames: [
        {
          time: 1_788_841_800,
          path: "/v2/radar/1788841800",
          nowcast: false,
        },
        {
          time: 1_788_842_400,
          path: "/v2/radar/1788842400",
          nowcast: false,
        },
      ],
      nowIndex: 1,
    });
  });
});
