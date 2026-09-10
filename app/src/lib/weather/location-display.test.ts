import { describe, expect, it } from "vitest";

import { resolveActualWeatherLocation } from "./location-display";
import type { GeocodeResult } from "./openweather-forecast";

const INDIANAPOLIS_COORDS = { lat: 39.7684, lon: -86.1581 };

describe("resolveActualWeatherLocation", () => {
  it("uses the reverse-geocoded place name for GPS coordinates", () => {
    const geocodeResult: GeocodeResult = {
      status: "ok",
      locations: [
        {
          name: "Indianapolis",
          city: "Indianapolis",
          region: "Indiana",
          country: "US",
          countryCode: "US",
          latitude: INDIANAPOLIS_COORDS.lat,
          longitude: INDIANAPOLIS_COORDS.lon,
          precision: "gps",
          displayLabel: "Indianapolis, Indiana",
        },
      ],
    };

    expect(
      resolveActualWeatherLocation({ geocodeResult, coords: INDIANAPOLIS_COORDS }),
    ).toMatchObject({
      city: "Indianapolis",
      displayLabel: "Indianapolis, Indiana",
      precision: "gps",
    });
  });

  it("falls back to the weather provider's real city name", () => {
    expect(
      resolveActualWeatherLocation({
        geocodeResult: { status: "error", reason: "network" },
        coords: INDIANAPOLIS_COORDS,
        providerCity: "Indianapolis",
        providerCountry: "US",
      }),
    ).toMatchObject({
      city: "Indianapolis",
      displayLabel: "Indianapolis, US",
      precision: "gps",
    });
  });

  it("uses an actual city carried with the coordinates as the final fallback", () => {
    expect(
      resolveActualWeatherLocation({
        geocodeResult: { status: "ok", locations: [] },
        coords: { ...INDIANAPOLIS_COORDS, city: "Indianapolis" },
      }),
    ).toMatchObject({
      city: "Indianapolis",
      displayLabel: "Indianapolis",
    });
  });

  it("never promotes Current location into visible weather state", () => {
    expect(
      resolveActualWeatherLocation({
        geocodeResult: { status: "ok", locations: [] },
        coords: { ...INDIANAPOLIS_COORDS, city: "Current location" },
        providerCity: "Current location",
      }),
    ).toBeNull();
  });
});
