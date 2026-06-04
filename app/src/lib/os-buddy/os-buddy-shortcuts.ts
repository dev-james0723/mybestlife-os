export type OSBuddyShortcutModifiers = {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

export type OSBuddyDesktopShortcut = {
  key: string;
  code: string;
  label: string;
  modifiers: OSBuddyShortcutModifiers;
  pressCount: 1 | 2;
};

export type OSBuddyShortcutSettings = {
  desktopToggle: OSBuddyDesktopShortcut;
  twoFingerDoubleTapEnabled: boolean;
};

export type OSBuddyKeyboardEventLike = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "isComposing" | "key" | "metaKey" | "shiftKey"
>;

export type OSBuddyDesktopShortcutPress = {
  at: number;
  key: string;
  code: string;
  modifiers: OSBuddyShortcutModifiers;
};

export const DESKTOP_SHORTCUT_DOUBLE_PRESS_WINDOW_MS = 500;
export const TWO_FINGER_DOUBLE_TAP_WINDOW_MS = 350;
export const TWO_FINGER_TAP_MAX_DURATION_MS = 260;
export const TWO_FINGER_TAP_MAX_MOVE_PX = 32;
export const TWO_FINGER_DOUBLE_TAP_MAX_DISTANCE_PX = 72;

export const DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT: OSBuddyDesktopShortcut = {
  key: " ",
  code: "Space",
  label: "Space",
  modifiers: {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  },
  pressCount: 2,
};

export const DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS: OSBuddyShortcutSettings = {
  desktopToggle: DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT,
  twoFingerDoubleTapEnabled: true,
};

const UNSAFE_BARE_CODES = new Set([
  "Escape",
  "Tab",
  "Enter",
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

const BROWSER_RESERVED_MODIFIER_CODES = new Set([
  "KeyD",
  "KeyF",
  "KeyL",
  "KeyN",
  "KeyP",
  "KeyQ",
  "KeyR",
  "KeyS",
  "KeyT",
  "KeyW",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
]);

const BLOCKING_LAYER_SELECTOR = [
  '[data-os-buddy-shortcut-recorder="active"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  "[data-radix-popper-content-wrapper]",
  "[cmdk-root]",
].join(",");

const INTERACTIVE_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="switch"]',
  "[data-os-buddy-shortcut-ignore]",
].join(",");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasAnyModifier(modifiers: OSBuddyShortcutModifiers): boolean {
  return modifiers.ctrl || modifiers.alt || modifiers.shift || modifiers.meta;
}

function sameModifiers(a: OSBuddyShortcutModifiers, b: OSBuddyShortcutModifiers): boolean {
  return a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta;
}

function eventModifiers(event: OSBuddyKeyboardEventLike): OSBuddyShortcutModifiers {
  return {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
}

function validateModifiers(value: unknown): OSBuddyShortcutModifiers {
  if (!isRecord(value)) return { ...DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT.modifiers };
  return {
    ctrl: typeof value.ctrl === "boolean" ? value.ctrl : false,
    alt: typeof value.alt === "boolean" ? value.alt : false,
    shift: typeof value.shift === "boolean" ? value.shift : false,
    meta: typeof value.meta === "boolean" ? value.meta : false,
  };
}

function normalizeKey(key: unknown, code: string): string {
  if (code === "Space") return " ";
  if (typeof key !== "string" || !key) return code;
  if (key === "Spacebar") return " ";
  if (key.length === 1 && /[A-Z]/.test(key)) return key.toLowerCase();
  return key;
}

function normalizeCode(code: unknown, key: string): string {
  if (typeof code === "string" && code.trim()) return code.trim();
  if (key === " ") return "Space";
  return key;
}

function labelForKey(key: string, code: string): string {
  if (code === "Space" || key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return key || code;
}

function isBadEventKey(key: string): boolean {
  return key === "Dead" || key === "Process" || key === "Unidentified";
}

export function isDesktopShortcutAllowed(shortcut: OSBuddyDesktopShortcut): boolean {
  if (!shortcut.key || !shortcut.code || !shortcut.label) return false;
  if (isBadEventKey(shortcut.key)) return false;

  const hasModifier = hasAnyModifier(shortcut.modifiers);
  if (!hasModifier && shortcut.pressCount !== 2) return false;
  if (!hasModifier && UNSAFE_BARE_CODES.has(shortcut.code)) return false;

  const usesBrowserModifier = shortcut.modifiers.ctrl || shortcut.modifiers.meta;
  if (usesBrowserModifier && BROWSER_RESERVED_MODIFIER_CODES.has(shortcut.code)) {
    return false;
  }

  return true;
}

export function validateOSBuddyDesktopShortcut(
  value: Partial<OSBuddyDesktopShortcut> | null | undefined,
): OSBuddyDesktopShortcut {
  if (!isRecord(value)) return { ...DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT };

  const code = normalizeCode(value.code, typeof value.key === "string" ? value.key : "");
  const key = normalizeKey(value.key, code);
  const modifiers = validateModifiers(value.modifiers);
  const pressCount = value.pressCount === 1 ? 1 : 2;
  const shortcut: OSBuddyDesktopShortcut = {
    key,
    code,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : labelForKey(key, code),
    modifiers,
    pressCount,
  };

  return isDesktopShortcutAllowed(shortcut)
    ? shortcut
    : { ...DEFAULT_OS_BUDDY_DESKTOP_SHORTCUT };
}

export function validateOSBuddyShortcutSettings(
  value: Partial<OSBuddyShortcutSettings> | null | undefined,
): OSBuddyShortcutSettings {
  if (!isRecord(value)) return { ...DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS };
  return {
    desktopToggle: validateOSBuddyDesktopShortcut(
      value.desktopToggle as Partial<OSBuddyDesktopShortcut> | null | undefined,
    ),
    twoFingerDoubleTapEnabled:
      typeof value.twoFingerDoubleTapEnabled === "boolean"
        ? value.twoFingerDoubleTapEnabled
        : DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS.twoFingerDoubleTapEnabled,
  };
}

export function desktopShortcutFromKeyboardEvent(
  event: OSBuddyKeyboardEventLike,
  pressCount: 1 | 2,
): OSBuddyDesktopShortcut | null {
  if (event.isComposing) return null;
  const code = normalizeCode(event.code, event.key);
  const key = normalizeKey(event.key, code);
  const shortcut: OSBuddyDesktopShortcut = {
    key,
    code,
    label: labelForKey(key, code),
    modifiers: eventModifiers(event),
    pressCount,
  };

  return isDesktopShortcutAllowed(shortcut) ? shortcut : null;
}

export function formatDesktopShortcut(shortcut: OSBuddyDesktopShortcut): string {
  const parts: string[] = [];
  if (shortcut.modifiers.ctrl) parts.push("Ctrl");
  if (shortcut.modifiers.alt) parts.push("Alt");
  if (shortcut.modifiers.shift) parts.push("Shift");
  if (shortcut.modifiers.meta) parts.push("Meta");
  parts.push(shortcut.label);
  return `${parts.join("+")}${shortcut.pressCount === 2 ? " x2" : ""}`;
}

export function matchesDesktopShortcutEvent(
  event: OSBuddyKeyboardEventLike,
  shortcut: OSBuddyDesktopShortcut,
): boolean {
  if (event.isComposing) return false;
  const normalized = validateOSBuddyDesktopShortcut(shortcut);
  if (!sameModifiers(eventModifiers(event), normalized.modifiers)) return false;

  const eventCode = normalizeCode(event.code, event.key);
  if (eventCode && normalized.code) return eventCode === normalized.code;

  return normalizeKey(event.key, eventCode) === normalized.key;
}

export function resolveDesktopShortcutKeydown(params: {
  event: OSBuddyKeyboardEventLike;
  shortcut: OSBuddyDesktopShortcut;
  previousPress: OSBuddyDesktopShortcutPress | null;
  now: number;
  windowMs?: number;
}): {
  action: "ignore" | "pending" | "trigger";
  nextPress: OSBuddyDesktopShortcutPress | null;
} {
  const shortcut = validateOSBuddyDesktopShortcut(params.shortcut);
  if (!matchesDesktopShortcutEvent(params.event, shortcut)) {
    return { action: "ignore", nextPress: null };
  }

  const currentPress: OSBuddyDesktopShortcutPress = {
    at: params.now,
    key: normalizeKey(params.event.key, normalizeCode(params.event.code, params.event.key)),
    code: normalizeCode(params.event.code, params.event.key),
    modifiers: eventModifiers(params.event),
  };

  if (shortcut.pressCount === 1) {
    return { action: "trigger", nextPress: null };
  }

  const windowMs = params.windowMs ?? DESKTOP_SHORTCUT_DOUBLE_PRESS_WINDOW_MS;
  const previous = params.previousPress;
  const isSecondPress =
    previous != null &&
    params.now - previous.at <= windowMs &&
    previous.code === currentPress.code &&
    previous.key === currentPress.key &&
    sameModifiers(previous.modifiers, currentPress.modifiers);

  return isSecondPress
    ? { action: "trigger", nextPress: null }
    : { action: "pending", nextPress: currentPress };
}

function elementFromTarget(target: EventTarget | null): Element | null {
  if (typeof Element === "undefined") return null;
  if (target instanceof Element) return target;
  if (typeof Node !== "undefined" && target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

export function isOSBuddyShortcutTargetBlocked(target: EventTarget | null): boolean {
  const element = elementFromTarget(target);
  if (!element) return false;
  return Boolean(element.closest(INTERACTIVE_TARGET_SELECTOR));
}

export function hasActiveOSBuddyShortcutBlocker(doc: Document | undefined): boolean {
  if (!doc) return false;
  return Boolean(doc.querySelector(BLOCKING_LAYER_SELECTOR));
}
