/**
 * Public surface of the Air Touch / Air Grab system.
 *
 * Layered architecture:
 *   L1 providers (camera / phone / stereo / depth) -> AirControlSample
 *   L2 resolveAirTouch (+ ray-pipeline when calibrated) -> AirTouchReading
 *   L3 stepAirGrab -> OSBuddyAirControlCommand[]
 *   L4 OSBuddyDock actuator
 */

export * from "./types";
export * from "./geometry";
export * from "./filters";
export * from "./gestures";
export * from "./air-touch-resolver";
export * from "./air-grab-machine";
export * from "./ray-pipeline";
export * from "./calibration";
export * from "./sensor-fusion";
export * from "./triangulation";
export * from "./capabilities";

export { createRgbWebcamProvider } from "./providers/rgb-webcam-provider";
export { createPhoneRgbProvider } from "./providers/phone-rgb-provider";
export { createStereoProvider } from "./providers/stereo-provider";
export { createDepthProvider } from "./providers/depth-provider";

export { encodeAirRemotePacket, decodeAirRemotePacket, isFreshPacket, isNewerPacket } from "./transport/air-remote-packet";
export type { AirRemotePacket } from "./transport/air-remote-packet";
export { createMemorySignaling, createSupabaseRealtimeSignaling } from "./transport/signaling-adapter";
export type { SignalingAdapter, SignalingMessage } from "./transport/signaling-adapter";
export { createAirRtcConnection, isWebRtcSupported } from "./transport/webrtc-data-channel";
export type { AirRtcConnection } from "./transport/webrtc-data-channel";
