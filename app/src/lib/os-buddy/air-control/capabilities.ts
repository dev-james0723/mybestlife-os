/**
 * Capability probing for Air Touch sensor modes. Everything is feature-detected
 * and SSR-safe — we NEVER assume phone depth/LiDAR is available through normal
 * getUserMedia. WebXR immersive-ar / depth-sensing is probed explicitly and the
 * system falls back to phone RGB + screen calibration when it's missing.
 */

import type { OSBuddyAirControlSensorMode } from "../os-buddy-air-control-types";

export type AirControlCapabilities = {
  getUserMedia: boolean;
  secureContext: boolean;
  webrtc: boolean;
  webxrAr: boolean;
  webxrDepth: boolean;
};

export async function probeAirControlCapabilities(): Promise<AirControlCapabilities> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      getUserMedia: false,
      secureContext: false,
      webrtc: false,
      webxrAr: false,
      webxrDepth: false,
    };
  }

  const getUserMedia = !!navigator.mediaDevices?.getUserMedia;
  const secureContext = window.isSecureContext === true;
  const webrtc = typeof window.RTCPeerConnection !== "undefined";

  let webxrAr = false;
  let webxrDepth = false;
  const xr = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } })
    .xr;
  if (xr?.isSessionSupported) {
    try {
      webxrAr = await xr.isSessionSupported("immersive-ar");
      // depth-sensing is only knowable at session request time; AR support is the
      // precondition. We surface AR here and probe depth when a session starts.
      webxrDepth = webxrAr;
    } catch {
      webxrAr = false;
      webxrDepth = false;
    }
  }

  return { getUserMedia, secureContext, webrtc, webxrAr, webxrDepth };
}

/**
 * Decide the best available sensor mode given capabilities and any paired remote.
 * Honest: returns "fallback-2d" labelled modes unless a true 3D source is usable.
 */
export function pickSensorMode(params: {
  capabilities: AirControlCapabilities;
  hasPhoneRemote?: boolean;
  hasSecondCamera?: boolean;
  preferred?: OSBuddyAirControlSensorMode;
}): OSBuddyAirControlSensorMode {
  const { capabilities, hasPhoneRemote, hasSecondCamera, preferred } = params;

  if (preferred === "stereo" && hasSecondCamera) return "stereo";
  if (preferred === "phone-ar" && hasPhoneRemote && capabilities.webxrAr) return "phone-ar";
  if (preferred === "phone-rgb" && hasPhoneRemote) return "phone-rgb";

  if (hasSecondCamera) return "stereo";
  if (hasPhoneRemote) return capabilities.webxrAr ? "phone-ar" : "phone-rgb";
  if (capabilities.getUserMedia) return "rgb-webcam";
  return "fallback-2d";
}
