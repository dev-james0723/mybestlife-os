import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { resolveGoogleMapTilesKey } from "@/lib/bucket-list/google-map-tiles";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY", "test-tiles-key");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-maps-key");
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-private-places-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Travel map session recovery", () => {
  it("uses the same tiles key for the session and browser, never the private Places key", async () => {
    const payload = { session: "test-session", expiry: "2000000000", tileWidth: 256, tileHeight: 256, imageFormat: "png" };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);
    expect(resolveGoogleMapTilesKey()).toBe("test-tiles-key");
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get("key")).toBe(resolveGoogleMapTilesKey());
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("falls back to the public Maps key when the tiles key is blank", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY", "  ");
    expect(resolveGoogleMapTilesKey()).toBe("test-maps-key");
  });

  it("does not call Google using a private Places key when no public map key exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST()).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["provider denial", () => Promise.resolve(Response.json({ error: "private provider diagnostics" }, { status: 403 }))],
    ["malformed JSON", () => Promise.resolve(new Response("not json"))],
    ["missing session", () => Promise.resolve(Response.json({}))],
    ["empty session", () => Promise.resolve(Response.json({ session: " " }))],
    ["network failure", () => Promise.reject(new Error("private request URL"))],
    ["timeout", () => Promise.reject(new DOMException("timed out", "TimeoutError"))],
  ])("returns a recoverable, sanitized response for %s", async (_name, fetchImpl) => {
    vi.stubGlobal("fetch", vi.fn(fetchImpl));
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Google map detail is temporarily unavailable." });
  });
});
