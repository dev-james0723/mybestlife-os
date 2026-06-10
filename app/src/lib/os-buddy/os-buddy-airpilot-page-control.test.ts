import { afterEach, describe, expect, it } from "vitest";
import {
  clickAirPilotTarget,
  getAirPilotTargetCenter,
  resolveNearestAirPilotMagnetTarget,
  resolveAirPilotTargetAtPoint,
  setAirPilotHighlightedTarget,
} from "./os-buddy-airpilot-page-control";

class FakeClassList {
  values = new Set<string>();

  add(value: string) {
    this.values.add(value);
  }

  remove(value: string) {
    this.values.delete(value);
  }

  has(value: string) {
    return this.values.has(value);
  }
}

class FakeElement {
  parentElement: FakeElement | null = null;
  classList = new FakeClassList();
  clicked = false;
  focused = false;
  textContent = "";
  tagName = "BUTTON";

  constructor(
    private readonly options: {
      selector?: string;
      closestIgnore?: boolean;
      closestDock?: boolean;
      disabled?: boolean;
      hidden?: boolean;
      rect?: { left: number; top: number; width: number; height: number };
      label?: string;
    } = {},
  ) {
    this.textContent = options.label ?? "";
    this.tagName =
      options.selector === "a[href]"
        ? "A"
        : options.selector === "input"
          ? "INPUT"
          : options.selector === "textarea"
            ? "TEXTAREA"
            : options.selector === "select"
              ? "SELECT"
              : options.selector === "button"
                ? "BUTTON"
                : "DIV";
  }

  matches(selector: string) {
    if (!this.options.selector) return false;
    return selector
      .split(",")
      .map((part) => part.trim())
      .includes(this.options.selector);
  }

  closest(selector: string) {
    const matches = (element: FakeElement) => {
      if (selector.includes("data-airpilot-ignore") && element.options.closestIgnore) {
        return true;
      }
      return selector.includes(".os-buddy-dock") && element.options.closestDock;
    };

    if (matches(this)) return this;
    for (let parent = this.parentElement; parent; parent = parent.parentElement) {
      if (matches(parent)) return parent;
    }
    return null;
  }

  getAttribute(name: string) {
    if (name === "aria-disabled" && this.options.disabled) return "true";
    if (name === "aria-label") return this.options.label ?? null;
    if (name === "title") return null;
    if (name === "tabindex") return null;
    return null;
  }

  getBoundingClientRect() {
    const rect = this.options.rect ?? { left: 0, top: 0, width: 10, height: 10 };
    return {
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
    };
  }

  getClientRects() {
    return this.options.hidden ? [] : [this.getBoundingClientRect()];
  }

  focus() {
    this.focused = true;
  }

  click() {
    this.clicked = true;
  }
}

function installDom(elements: FakeElement[]) {
  Object.defineProperty(globalThis, "HTMLElement", {
    value: FakeElement,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: {
      getComputedStyle: (element: FakeElement) => ({
        display: element.getClientRects().length ? "block" : "none",
        visibility: "visible",
        pointerEvents: "auto",
        opacity: "1",
        overflowY: "visible",
      }),
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: {
      elementsFromPoint: () => elements,
      querySelectorAll: () => elements,
    },
    configurable: true,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "HTMLElement");
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

describe("AirPilot page control", () => {
  it("resolves the first selectable non-overlay element at the cursor point", () => {
    const overlay = new FakeElement({ selector: "button", closestIgnore: true });
    const disabled = new FakeElement({ selector: "button", disabled: true });
    const button = new FakeElement({ selector: "button" });
    installDom([overlay, disabled, button]);

    expect(resolveAirPilotTargetAtPoint({ x: 10, y: 20 })).toBe(button);
  });

  it("clicks and focuses selectable targets only", () => {
    const button = new FakeElement({ selector: "button" });
    installDom([button]);

    expect(clickAirPilotTarget(button as unknown as HTMLElement)).toBe(true);
    expect(button.focused).toBe(true);
    expect(button.clicked).toBe(true);

    const hidden = new FakeElement({ selector: "button", hidden: true });
    expect(clickAirPilotTarget(hidden as unknown as HTMLElement)).toBe(false);
  });

  it("moves the target highlight between elements", () => {
    const previous = new FakeElement({ selector: "button" });
    const next = new FakeElement({ selector: "button" });
    installDom([previous, next]);

    previous.classList.add("os-buddy-airpilot-target-highlight");
    const current = setAirPilotHighlightedTarget({
      previous: previous as unknown as HTMLElement,
      next: next as unknown as HTMLElement,
    });

    expect(current).toBe(next);
    expect(previous.classList.has("os-buddy-airpilot-target-highlight")).toBe(false);
    expect(next.classList.has("os-buddy-airpilot-target-highlight")).toBe(true);
  });

  it("resolves the nearest clickable magnet target inside the radius", () => {
    const far = new FakeElement({
      selector: "button",
      rect: { left: 200, top: 100, width: 40, height: 40 },
      label: "Far",
    });
    const near = new FakeElement({
      selector: "button",
      rect: { left: 90, top: 90, width: 40, height: 40 },
      label: "Near",
    });
    installDom([far, near]);

    const target = resolveNearestAirPilotMagnetTarget({ x: 82, y: 110 }, 48);

    expect(target?.element).toBe(near);
    expect(target?.center).toEqual({ x: 110, y: 110 });
    expect(target?.label).toBe("Near");
  });

  it("resolves ARIA menu items as selectable targets", () => {
    const menuItem = new FakeElement({
      selector: '[role="menuitem"]',
      rect: { left: 20, top: 20, width: 100, height: 36 },
      label: "Open menu item",
    });
    installDom([menuItem]);

    const target = resolveNearestAirPilotMagnetTarget({ x: 40, y: 30 }, 48);

    expect(target?.element).toBe(menuItem);
    expect(clickAirPilotTarget(menuItem as unknown as HTMLElement)).toBe(true);
    expect(menuItem.clicked).toBe(true);
  });

  it("climbs to custom cursor-pointer controls from child content", () => {
    const card = new FakeElement({
      selector: ".cursor-pointer",
      rect: { left: 30, top: 40, width: 160, height: 80 },
      label: "Clickable card",
    });
    const child = new FakeElement({
      rect: { left: 42, top: 52, width: 40, height: 20 },
      label: "Card title",
    });
    child.parentElement = card;
    installDom([child, card]);

    expect(resolveAirPilotTargetAtPoint({ x: 50, y: 60 })).toBe(card);

    const target = resolveNearestAirPilotMagnetTarget({ x: 25, y: 70 }, 48);
    expect(target?.element).toBe(card);
    expect(clickAirPilotTarget(card as unknown as HTMLElement)).toBe(true);
    expect(card.clicked).toBe(true);
  });

  it("prefers explicit OS Buddy actions over clickable content underneath the dock", () => {
    const osBuddyButton = new FakeElement({
      selector: "[data-airpilot-os-buddy-action]",
      closestDock: true,
      rect: { left: 20, top: 40, width: 80, height: 80 },
      label: "OS Buddy Quick Snap",
    });
    const sprite = new FakeElement({
      rect: { left: 30, top: 50, width: 60, height: 60 },
      label: "Sprite",
    });
    const cardUnderBuddy = new FakeElement({
      selector: ".cursor-pointer",
      rect: { left: 0, top: 0, width: 200, height: 180 },
      label: "Card underneath",
    });
    sprite.parentElement = osBuddyButton;
    installDom([sprite, osBuddyButton, cardUnderBuddy]);

    expect(resolveAirPilotTargetAtPoint({ x: 50, y: 70 })).toBe(osBuddyButton);
    expect(clickAirPilotTarget(osBuddyButton as unknown as HTMLElement)).toBe(true);
    expect(osBuddyButton.clicked).toBe(true);
    expect(cardUnderBuddy.clicked).toBe(false);
  });

  it("lets the Quick Snap capture layer block page targets underneath", () => {
    const captureLayer = new FakeElement({
      selector: "[data-airpilot-os-buddy-action]",
      closestDock: true,
      rect: { left: 0, top: 0, width: 400, height: 400 },
      label: "Quick Snap paste capture",
    });
    const cardUnderLayer = new FakeElement({
      selector: ".cursor-pointer",
      rect: { left: 40, top: 40, width: 200, height: 120 },
      label: "Card underneath",
    });
    installDom([captureLayer, cardUnderLayer]);

    expect(resolveAirPilotTargetAtPoint({ x: 100, y: 100 })).toBe(captureLayer);
    expect(clickAirPilotTarget(captureLayer as unknown as HTMLElement)).toBe(true);
    expect(captureLayer.clicked).toBe(true);
    expect(cardUnderLayer.clicked).toBe(false);
  });

  it("excludes hidden, disabled, ignored, and form-only elements from magnet targets", () => {
    const hidden = new FakeElement({ selector: "button", hidden: true });
    const disabled = new FakeElement({ selector: "button", disabled: true });
    const ignored = new FakeElement({ selector: "button", closestIgnore: true });
    const input = new FakeElement({ selector: "input" });
    const textarea = new FakeElement({ selector: "textarea" });
    const select = new FakeElement({ selector: "select" });
    const tabindexOnly = new FakeElement({ selector: "[tabindex]" });
    installDom([hidden, disabled, ignored, input, textarea, select, tabindexOnly]);

    expect(resolveNearestAirPilotMagnetTarget({ x: 4, y: 4 }, 48)).toBeNull();
  });

  it("returns the center for clickable targets only", () => {
    const button = new FakeElement({
      selector: "button",
      rect: { left: 10, top: 20, width: 80, height: 30 },
    });
    const input = new FakeElement({
      selector: "input",
      rect: { left: 10, top: 20, width: 80, height: 30 },
    });
    installDom([button, input]);

    expect(getAirPilotTargetCenter(button as unknown as HTMLElement)).toEqual({
      x: 50,
      y: 35,
    });
    expect(getAirPilotTargetCenter(input as unknown as HTMLElement)).toBeNull();
  });
});
