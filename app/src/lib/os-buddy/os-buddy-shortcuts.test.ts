import { describe, expect, it } from "vitest";
import {
  DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
  DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS,
  desktopShortcutFromKeyboardEvent,
  formatDesktopShortcut,
  isDesktopShortcutAllowed,
  resolveDesktopShortcutKeydown,
  validateOSBuddyDesktopShortcut,
  validateOSBuddyShortcutSettings,
  type OSBuddyKeyboardEventLike,
} from "./os-buddy-shortcuts";

function keyEvent(
  patch: Partial<OSBuddyKeyboardEventLike>,
): OSBuddyKeyboardEventLike {
  return {
    altKey: false,
    code: "",
    ctrlKey: false,
    isComposing: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...patch,
  };
}

describe("OS Buddy shortcut settings", () => {
  it("returns defaults for empty or invalid input", () => {
    expect(validateOSBuddyShortcutSettings(null)).toEqual(
      DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS,
    );
    expect(validateOSBuddyShortcutSettings(undefined)).toEqual(
      DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS,
    );
    expect(
      validateOSBuddyDesktopShortcut({
        key: "ArrowLeft",
        code: "ArrowLeft",
        label: "ArrowLeft",
        modifiers: { ctrl: false, alt: false, shift: false, meta: false },
        pressCount: 2,
      }),
    ).toEqual(DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT);
  });

  it("keeps valid modified shortcuts and formats labels", () => {
    const shortcut = desktopShortcutFromKeyboardEvent(
      keyEvent({ code: "KeyB", ctrlKey: true, key: "b" }),
      1,
    );

    expect(shortcut).toMatchObject({
      key: "b",
      code: "KeyB",
      label: "B",
      modifiers: { ctrl: true, alt: false, shift: false, meta: false },
      pressCount: 1,
    });
    expect(shortcut ? formatDesktopShortcut(shortcut) : null).toBe("Ctrl+B");
  });

  it("requires bare shortcuts to be double-press shortcuts", () => {
    const singleSpace = desktopShortcutFromKeyboardEvent(
      keyEvent({ code: "Space", key: " " }),
      1,
    );
    const doubleSpace = desktopShortcutFromKeyboardEvent(
      keyEvent({ code: "Space", key: " " }),
      2,
    );

    expect(singleSpace).toBeNull();
    expect(doubleSpace).toEqual(DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT);
    expect(doubleSpace ? formatDesktopShortcut(doubleSpace) : null).toBe("Space x2");
  });

  it("rejects common browser-reserved modifier shortcuts", () => {
    const reserved = desktopShortcutFromKeyboardEvent(
      keyEvent({ code: "KeyR", ctrlKey: true, key: "r" }),
      1,
    );

    expect(reserved).toBeNull();
    expect(
      isDesktopShortcutAllowed({
        key: "r",
        code: "KeyR",
        label: "R",
        modifiers: { ctrl: true, alt: false, shift: false, meta: false },
        pressCount: 1,
      }),
    ).toBe(false);
  });

  it("resolves double-press shortcuts only inside the timing window", () => {
    const event = keyEvent({ code: "Space", key: " " });
    const first = resolveDesktopShortcutKeydown({
      event,
      shortcut: DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
      previousPress: null,
      now: 1_000,
      windowMs: 500,
    });

    expect(first.action).toBe("pending");
    expect(first.nextPress).toMatchObject({ code: "Space", key: " " });

    const second = resolveDesktopShortcutKeydown({
      event,
      shortcut: DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
      previousPress: first.nextPress,
      now: 1_300,
      windowMs: 500,
    });

    expect(second.action).toBe("trigger");
    expect(second.nextPress).toBeNull();

    const late = resolveDesktopShortcutKeydown({
      event,
      shortcut: DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
      previousPress: first.nextPress,
      now: 1_800,
      windowMs: 500,
    });

    expect(late.action).toBe("pending");
    expect(late.nextPress).toMatchObject({ code: "Space", key: " " });
  });

  it("preserves the two-finger gesture toggle", () => {
    expect(
      validateOSBuddyShortcutSettings({
        twoFingerDoubleTapEnabled: false,
      }).twoFingerDoubleTapEnabled,
    ).toBe(false);
  });
});
