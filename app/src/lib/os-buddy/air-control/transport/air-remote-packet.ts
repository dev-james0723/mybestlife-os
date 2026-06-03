/**
 * Phone -> desktop sensor packet for Air Touch "Phone Camera Mode".
 *
 * The phone runs MediaPipe locally and sends only small landmark / ray / gesture
 * packets over an unreliable WebRTC data channel — no raw video by default. The
 * desktop drops stale packets and prefers the newest sequence over guaranteed
 * delivery. Encoding/decoding/freshness are pure and unit-tested.
 */

import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlQuality,
} from "../../os-buddy-air-control-types";

export const AIR_REMOTE_PACKET_VERSION = 1 as const;
/** Drop packets older than this (after clock-offset correction). */
export const PACKET_STALE_MS = 150;

export type AirRemotePacket = {
  version: typeof AIR_REMOTE_PACKET_VERSION;
  sessionId: string;
  sourceId: string;
  timestampMs: number;
  sequence: number;
  sensorMode: "phone-rgb" | "phone-ar" | "depth";
  gesture?: { name: OSBuddyAirControlGesture; score: number };
  imageLandmarks?: Array<{ x: number; y: number; z?: number }>;
  worldLandmarks?: Array<{ x: number; y: number; z: number }>;
  ray?: {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
    coordinateFrame: string;
    confidence: number;
  };
  screenHit?: { x: number; y: number; confidence: number };
  calibration?: { quality: OSBuddyAirControlQuality; rmsErrorPx?: number };
};

export function encodeAirRemotePacket(packet: AirRemotePacket): string {
  return JSON.stringify(packet);
}

export function decodeAirRemotePacket(raw: string): AirRemotePacket | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (p.version !== AIR_REMOTE_PACKET_VERSION) return null;
  if (typeof p.sessionId !== "string" || typeof p.sourceId !== "string") return null;
  if (typeof p.timestampMs !== "number" || typeof p.sequence !== "number") return null;
  if (p.sensorMode !== "phone-rgb" && p.sensorMode !== "phone-ar" && p.sensorMode !== "depth") {
    return null;
  }
  return parsed as AirRemotePacket;
}

/**
 * Whether a packet is fresh enough to use. `clockOffsetMs` is the estimated
 * (desktopNow - phoneNow) offset from ping/pong sync; subtract it to compare in
 * the desktop clock domain.
 */
export function isFreshPacket(
  packet: AirRemotePacket,
  now: number,
  clockOffsetMs = 0,
  maxAgeMs = PACKET_STALE_MS,
): boolean {
  const ageMs = now - (packet.timestampMs + clockOffsetMs);
  return ageMs >= 0 ? ageMs <= maxAgeMs : -ageMs <= maxAgeMs; // tolerate small clock skew
}

/** Newer-sequence guard so out-of-order delivery never rewinds the cursor. */
export function isNewerPacket(
  candidate: AirRemotePacket,
  lastAccepted: AirRemotePacket | null,
): boolean {
  if (!lastAccepted) return true;
  if (candidate.sessionId !== lastAccepted.sessionId) return true;
  return candidate.sequence > lastAccepted.sequence;
}
