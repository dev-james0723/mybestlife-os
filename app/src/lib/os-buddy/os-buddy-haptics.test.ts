import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OS_BUDDY_HAPTIC_EVENT_NAME,
  triggerOSBuddyHapticFeedback,
  type OSBuddyHapticSignal,
} from "./os-buddy-haptics";

const originalWindow = Reflect.get(globalThis, "window");

function installWindow(value: unknown) {
  Object.defineProperty(globalThis, "window", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }

  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    configurable: true,
  });
});

describe("OS Buddy haptics", () => {
  it("returns false outside the browser", () => {
    Reflect.deleteProperty(globalThis, "window");

    expect(triggerOSBuddyHapticFeedback("quick-snap-activate")).toBe(false);
  });

  it("lets a cancellable custom event handle the haptic signal", () => {
    const vibrate = vi.fn(() => true);
    const impact = vi.fn();
    const dispatchEvent = vi.fn((event: Event) => {
      expect((event as CustomEvent<OSBuddyHapticSignal>).detail).toMatchObject({
        intent: "quick-snap-activate",
        style: "medium",
        pattern: 18,
      });
      expect(event.type).toBe(OS_BUDDY_HAPTIC_EVENT_NAME);
      event.preventDefault();
      return false;
    });

    installWindow({
      dispatchEvent,
      navigator: { vibrate },
      OSBuddyHaptics: { impact },
    });

    expect(triggerOSBuddyHapticFeedback("quick-snap-activate")).toBe(true);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(impact).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("uses a native bridge before browser vibration", () => {
    const vibrate = vi.fn(() => true);
    const impact = vi.fn();

    installWindow({
      dispatchEvent: vi.fn(() => true),
      navigator: { vibrate },
      OSBuddyHaptics: { impact },
    });

    expect(triggerOSBuddyHapticFeedback("quick-snap-activate")).toBe(true);
    expect(impact).toHaveBeenCalledWith({
      intent: "quick-snap-activate",
      style: "medium",
      pattern: 18,
    });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("falls back to the browser Vibration API", () => {
    const vibrate = vi.fn(() => true);

    installWindow({
      dispatchEvent: vi.fn(() => true),
      navigator: { vibrate },
    });

    expect(triggerOSBuddyHapticFeedback("quick-snap-activate")).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(18);
  });
});
