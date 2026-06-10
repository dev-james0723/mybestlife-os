export const OS_BUDDY_HAPTIC_EVENT_NAME = "mblos:os-buddy-haptic";

export type OSBuddyHapticIntent = "quick-snap-activate";
export type OSBuddyHapticStyle = "light" | "medium" | "heavy";

export type OSBuddyHapticSignal = {
  intent: OSBuddyHapticIntent;
  style: OSBuddyHapticStyle;
  pattern: VibratePattern;
};

type OSBuddyNativeHaptics = {
  impact?: (signal: OSBuddyHapticSignal) => void;
  trigger?: (signal: OSBuddyHapticSignal) => void;
};

type OSBuddyHapticBridgeWindow = Window & {
  OSBuddyHaptics?: OSBuddyNativeHaptics;
  webkit?: {
    messageHandlers?: {
      osBuddyHaptics?: {
        postMessage?: (signal: OSBuddyHapticSignal) => void;
      };
    };
  };
};

const HAPTIC_SIGNALS: Record<OSBuddyHapticIntent, OSBuddyHapticSignal> = {
  "quick-snap-activate": {
    intent: "quick-snap-activate",
    style: "medium",
    pattern: 18,
  },
};

function dispatchHapticEvent(
  hapticWindow: OSBuddyHapticBridgeWindow,
  signal: OSBuddyHapticSignal,
) {
  if (typeof CustomEvent !== "function") return false;
  if (typeof hapticWindow.dispatchEvent !== "function") return false;

  const event = new CustomEvent<OSBuddyHapticSignal>(OS_BUDDY_HAPTIC_EVENT_NAME, {
    detail: signal,
    cancelable: true,
  });
  hapticWindow.dispatchEvent(event);
  return event.defaultPrevented;
}

function triggerNativeHaptics(
  hapticWindow: OSBuddyHapticBridgeWindow,
  signal: OSBuddyHapticSignal,
) {
  const nativeHaptics = hapticWindow.OSBuddyHaptics;
  if (typeof nativeHaptics?.impact === "function") {
    nativeHaptics.impact(signal);
    return true;
  }
  if (typeof nativeHaptics?.trigger === "function") {
    nativeHaptics.trigger(signal);
    return true;
  }

  const webkitHaptics = hapticWindow.webkit?.messageHandlers?.osBuddyHaptics;
  if (typeof webkitHaptics?.postMessage === "function") {
    webkitHaptics.postMessage(signal);
    return true;
  }

  return false;
}

function triggerBrowserVibration(
  hapticWindow: OSBuddyHapticBridgeWindow,
  signal: OSBuddyHapticSignal,
) {
  const vibrate = hapticWindow.navigator?.vibrate?.bind(hapticWindow.navigator);
  if (typeof vibrate !== "function") return false;

  try {
    return vibrate(signal.pattern);
  } catch {
    return false;
  }
}

export function triggerOSBuddyHapticFeedback(intent: OSBuddyHapticIntent) {
  if (typeof window === "undefined") return false;

  const signal = HAPTIC_SIGNALS[intent];
  const hapticWindow = window as OSBuddyHapticBridgeWindow;

  if (dispatchHapticEvent(hapticWindow, signal)) return true;
  if (triggerNativeHaptics(hapticWindow, signal)) return true;
  return triggerBrowserVibration(hapticWindow, signal);
}
