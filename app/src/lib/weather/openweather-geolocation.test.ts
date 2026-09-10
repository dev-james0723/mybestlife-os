import { afterEach, describe, expect, it, vi } from "vitest";

import {
  requestDeviceGeolocation,
  requestDeviceGeolocationResult,
} from "./openweather";

const FRESH_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

function geolocationError(code: number): GeolocationPositionError {
  return {
    code,
    message: `geolocation error ${code}`,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

function stubSecureBrowser(
  implementation: (
    success: PositionCallback,
    error: PositionErrorCallback | null | undefined,
    options: PositionOptions | undefined,
  ) => void,
) {
  const getCurrentPosition = vi.fn(implementation);
  vi.stubGlobal("window", {
    isSecureContext: true,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition },
  });
  return getCurrentPosition;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requestDeviceGeolocationResult", () => {
  it("returns fresh coordinates when the browser resolves geolocation", async () => {
    const getCurrentPosition = stubSecureBrowser((success) => {
      success({
        coords: {
          latitude: 39.7684,
          longitude: -86.1581,
        },
      } as GeolocationPosition);
    });

    await expect(requestDeviceGeolocationResult()).resolves.toEqual({
      status: "ok",
      coords: { lat: 39.7684, lon: -86.1581 },
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      FRESH_POSITION_OPTIONS,
    );
  });

  it.each([
    [1, "permission_denied"],
    [2, "position_unavailable"],
    [3, "timeout"],
    [99, "unknown"],
  ] as const)("maps browser error code %i to %s", async (code, reason) => {
    stubSecureBrowser((_success, error) => {
      error?.(geolocationError(code));
    });

    await expect(requestDeviceGeolocationResult()).resolves.toEqual({
      status: "error",
      reason,
    });
  });

  it("reports unsupported when navigator is unavailable", async () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", undefined);

    await expect(requestDeviceGeolocationResult()).resolves.toEqual({
      status: "error",
      reason: "unsupported",
    });
  });

  it("reports an insecure context without invoking the browser API", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("window", { isSecureContext: false });
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition },
    });

    await expect(requestDeviceGeolocationResult()).resolves.toEqual({
      status: "error",
      reason: "insecure_context",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("times out when the browser never responds and ignores a late success", async () => {
    vi.useFakeTimers();
    let lateSuccess: PositionCallback | undefined;
    stubSecureBrowser((success) => {
      lateSuccess = success;
    });

    const resultPromise = requestDeviceGeolocationResult();
    const onSettled = vi.fn();
    void resultPromise.then(onSettled);

    await vi.advanceTimersByTimeAsync(14_999);
    expect(onSettled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(resultPromise).resolves.toEqual({
      status: "error",
      reason: "timeout",
    });

    lateSuccess?.({
      coords: { latitude: 51.5072, longitude: -0.1276 },
    } as GeolocationPosition);
    await Promise.resolve();

    await expect(resultPromise).resolves.toEqual({
      status: "error",
      reason: "timeout",
    });
    expect(onSettled).toHaveBeenCalledOnce();
  });
});

describe("requestDeviceGeolocation compatibility", () => {
  it("continues returning coordinates for existing callers", async () => {
    stubSecureBrowser((success) => {
      success({
        coords: { latitude: 22.3193, longitude: 114.1694 },
      } as GeolocationPosition);
    });

    await expect(requestDeviceGeolocation()).resolves.toEqual({
      lat: 22.3193,
      lon: 114.1694,
    });
  });

  it("continues returning null when location lookup fails", async () => {
    stubSecureBrowser((_success, error) => {
      error?.(geolocationError(1));
    });

    await expect(requestDeviceGeolocation()).resolves.toBeNull();
  });
});
