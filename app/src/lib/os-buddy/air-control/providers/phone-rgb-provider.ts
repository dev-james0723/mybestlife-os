/**
 * Phone-RGB SensorProvider (Layer 1).
 *
 * Consumes {@link AirRemotePacket}s arriving from a paired phone (which runs
 * MediaPipe locally and sends only small landmark/gesture packets — no raw video
 * by default). Stale and out-of-order packets are dropped. The provider is
 * transport-agnostic: it takes a `subscribe` function, so it works with WebRTC,
 * the in-memory bus, or any future transport.
 */

import {
  decodeAirRemotePacket,
  isFreshPacket,
  isNewerPacket,
  type AirRemotePacket,
} from "../transport/air-remote-packet";
import type { AirControlSample, SensorProvider, SourceHealth } from "../types";
import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
} from "../../os-buddy-air-control-types";

export type PhoneRgbProviderOptions = {
  sourceId?: string;
  /** Subscribe to raw packet strings; returns an unsubscribe function. */
  subscribe: (onPacket: (raw: string) => void) => () => void;
  /** Estimated desktop-phone clock offset (ms) from sync. */
  getClockOffsetMs?: () => number;
};

function packetToHand(packet: AirRemotePacket): OSBuddyAirControlHand | null {
  if (!packet.imageLandmarks || packet.imageLandmarks.length === 0) return null;
  const gesture = packet.gesture?.name ?? null;
  return {
    landmarks: packet.imageLandmarks.map((l) => ({ x: l.x, y: l.y, z: l.z })),
    handedness: "Unknown",
    confidence: packet.gesture?.score ?? 0.6,
    gestureName: (gesture as OSBuddyAirControlGesture | null) ?? null,
    gestureScore: packet.gesture?.score ?? 0,
  };
}

export function createPhoneRgbProvider(options: PhoneRgbProviderOptions): SensorProvider {
  const sourceId = options.sourceId ?? "phone-rgb";
  const listeners = new Set<(sample: AirControlSample) => void>();
  let unsubscribe: (() => void) | null = null;
  let lastAccepted: AirRemotePacket | null = null;
  let lastSampleAt = 0;
  let lastConfidence = 0;

  const handlePacket = (raw: string) => {
    const packet = decodeAirRemotePacket(raw);
    if (!packet) return;
    const offset = options.getClockOffsetMs?.() ?? 0;
    if (!isFreshPacket(packet, performance.now(), offset)) return;
    if (!isNewerPacket(packet, lastAccepted)) return;
    lastAccepted = packet;

    const primaryHand = packetToHand(packet);
    lastSampleAt = performance.now();
    lastConfidence = primaryHand?.confidence ?? 0;
    const sample: AirControlSample = {
      timestamp: lastSampleAt,
      sourceId,
      sensorMode: packet.sensorMode === "depth" ? "depth" : "phone-rgb",
      handCount: primaryHand ? 1 : 0,
      primaryHand,
      confidence: lastConfidence,
    };
    listeners.forEach((l) => l(sample));
  };

  return {
    sourceId,
    sensorMode: "phone-rgb",
    async start() {
      unsubscribe = options.subscribe(handlePacket);
    },
    stop() {
      unsubscribe?.();
      unsubscribe = null;
      lastAccepted = null;
    },
    onSample(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHealth(): SourceHealth {
      return {
        sourceId,
        sensorMode: "phone-rgb",
        lastSampleAt,
        confidence: lastConfidence,
        quality: "uncalibrated",
      };
    },
  };
}
