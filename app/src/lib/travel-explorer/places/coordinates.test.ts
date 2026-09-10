import { describe, expect, it } from "vitest";
import { readPlaceCoordinates } from "./coordinates";
describe("Places coordinate validation", () => {
  it.each(["", "lat=0", "lat=&lng=", "lat=91&lng=0", "lat=0&lng=181", "lat=NaN&lng=1"])("rejects missing or invalid coordinates: %s", (query) => {
    expect(readPlaceCoordinates(new URLSearchParams(query))).toBeUndefined();
  });
  it("keeps explicitly supplied zero coordinates", () => {
    expect(readPlaceCoordinates(new URLSearchParams("lat=0&lng=0"))).toEqual({ lat: 0, lng: 0 });
  });
});
