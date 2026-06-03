import { describe, expect, it } from "vitest";
import {
  AIR_REMOTE_PACKET_VERSION,
  decodeAirRemotePacket,
  encodeAirRemotePacket,
  isFreshPacket,
  isNewerPacket,
  type AirRemotePacket,
} from "./air-remote-packet";

function packet(over: Partial<AirRemotePacket> = {}): AirRemotePacket {
  return {
    version: AIR_REMOTE_PACKET_VERSION,
    sessionId: "s1",
    sourceId: "phone",
    timestampMs: 1000,
    sequence: 1,
    sensorMode: "phone-rgb",
    gesture: { name: "Index_Point", score: 0.9 },
    screenHit: { x: 100, y: 200, confidence: 0.8 },
    ...over,
  };
}

describe("encode/decode", () => {
  it("round-trips a valid packet", () => {
    const p = packet();
    const decoded = decodeAirRemotePacket(encodeAirRemotePacket(p));
    expect(decoded).toEqual(p);
  });

  it("rejects malformed json", () => {
    expect(decodeAirRemotePacket("{not json")).toBeNull();
  });

  it("rejects wrong version / missing fields", () => {
    expect(decodeAirRemotePacket(JSON.stringify({ ...packet(), version: 99 }))).toBeNull();
    expect(decodeAirRemotePacket(JSON.stringify({ ...packet(), sensorMode: "bogus" }))).toBeNull();
    const { sessionId: _omit, ...rest } = packet();
    void _omit;
    expect(decodeAirRemotePacket(JSON.stringify(rest))).toBeNull();
  });
});

describe("isFreshPacket", () => {
  it("accepts recent packets and drops stale ones", () => {
    const p = packet({ timestampMs: 1000 });
    expect(isFreshPacket(p, 1100, 0, 150)).toBe(true); // 100ms old
    expect(isFreshPacket(p, 1300, 0, 150)).toBe(false); // 300ms old
  });

  it("applies the clock offset", () => {
    // phone clock is 500ms behind desktop; offset = +500
    const p = packet({ timestampMs: 1000 }); // phone time
    // desktop now 1600; corrected phone time = 1500 -> age 100ms
    expect(isFreshPacket(p, 1600, 500, 150)).toBe(true);
  });

  it("tolerates small negative skew", () => {
    const p = packet({ timestampMs: 1000 });
    expect(isFreshPacket(p, 980, 0, 150)).toBe(true); // 20ms "future"
  });
});

describe("isNewerPacket", () => {
  it("accepts the first packet and higher sequences", () => {
    const first = packet({ sequence: 5 });
    expect(isNewerPacket(first, null)).toBe(true);
    expect(isNewerPacket(packet({ sequence: 6 }), first)).toBe(true);
    expect(isNewerPacket(packet({ sequence: 4 }), first)).toBe(false);
  });

  it("accepts a new session regardless of sequence", () => {
    const prev = packet({ sessionId: "old", sequence: 99 });
    expect(isNewerPacket(packet({ sessionId: "new", sequence: 1 }), prev)).toBe(true);
  });
});
