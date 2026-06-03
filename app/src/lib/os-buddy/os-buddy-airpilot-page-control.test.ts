import { afterEach, describe, expect, it } from "vitest";
import {
  clickAirPilotTarget,
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

  constructor(
    private readonly options: {
      selector?: string;
      closestIgnore?: boolean;
      disabled?: boolean;
      hidden?: boolean;
    } = {},
  ) {}

  matches(selector: string) {
    return Boolean(this.options.selector && selector.includes(this.options.selector));
  }

  closest(selector: string) {
    if (selector.includes("data-airpilot-ignore") && this.options.closestIgnore) {
      return this;
    }
    return null;
  }

  getAttribute(name: string) {
    if (name === "aria-disabled" && this.options.disabled) return "true";
    if (name === "tabindex") return null;
    return null;
  }

  getClientRects() {
    return this.options.hidden ? [] : [{ width: 10, height: 10 }];
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
});
