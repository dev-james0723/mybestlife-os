import type { AirPilotMagnetTarget } from "./os-buddy-airpilot-magnet";
import type { OSBuddyAirControlPoint } from "./os-buddy-air-control-types";

export const AIRPILOT_IGNORE_SELECTOR =
  '[data-airpilot-ignore="true"], .os-buddy-dock';
export const AIRPILOT_TARGET_HIGHLIGHT_CLASS = "os-buddy-airpilot-target-highlight";
const OS_BUDDY_ACTION_SELECTOR = "[data-airpilot-os-buddy-action]";

const EXPLICIT_AIRPILOT_TARGET_SELECTOR = [
  "[data-airpilot-target]",
  "[data-airpilot-clickable]",
  "[data-airpilot-selectable]",
  OS_BUDDY_ACTION_SELECTOR,
].join(",");

const CLICKABLE_SELECTOR = [
  "button",
  "a[href]",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  EXPLICIT_AIRPILOT_TARGET_SELECTOR,
  ".cursor-pointer",
].join(",");

const FORM_FIELD_SELECTOR = "input, textarea, select";

const targetKeys = new WeakMap<HTMLElement, string>();
let nextTargetKey = 1;

function isHTMLElement(value: Element | null): value is HTMLElement {
  return value instanceof HTMLElement;
}

function isDisabledElement(element: HTMLElement) {
  if (element.getAttribute("aria-disabled") === "true") return true;
  if ("disabled" in element && Boolean((element as { disabled?: boolean }).disabled)) {
    return true;
  }
  return false;
}

function isVisibleElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none" ||
    Number(style.opacity) === 0
  ) {
    return false;
  }

  const rects = element.getClientRects();
  return rects.length > 0;
}

export function isAirPilotSelectableElement(element: HTMLElement) {
  const isOSBuddyAction = element.matches(OS_BUDDY_ACTION_SELECTOR);
  if (element.closest(AIRPILOT_IGNORE_SELECTOR) && !isOSBuddyAction) return false;
  if (!element.matches(CLICKABLE_SELECTOR)) return false;
  if (
    element.matches(FORM_FIELD_SELECTOR) &&
    !element.matches(EXPLICIT_AIRPILOT_TARGET_SELECTOR)
  ) {
    return false;
  }
  if (isDisabledElement(element)) return false;
  if (!isVisibleElement(element)) return false;

  return true;
}

export function findAirPilotSelectableTarget(element: Element | null) {
  let current: Element | null = element;
  while (current) {
    if (isHTMLElement(current) && isAirPilotSelectableElement(current)) return current;
    current = current.parentElement;
  }
  return null;
}

export function resolveAirPilotTargetAtPoint(point: OSBuddyAirControlPoint) {
  if (typeof document === "undefined") return null;
  const elements = document.elementsFromPoint(point.x, point.y);
  for (const element of elements) {
    const target = findAirPilotSelectableTarget(element);
    if (target) return target;
    if (element.closest(AIRPILOT_IGNORE_SELECTOR)) continue;
  }
  return null;
}

function getAirPilotTargetKey(element: HTMLElement) {
  const existing = targetKeys.get(element);
  if (existing) return existing;
  const next = `airpilot-target-${nextTargetKey}`;
  nextTargetKey += 1;
  targetKeys.set(element, next);
  return next;
}

function getVisibleRects(element: HTMLElement) {
  return Array.from(element.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
}

function distancePointToRect(point: OSBuddyAirControlPoint, rect: DOMRect) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

function getRectCenter(rect: DOMRect): OSBuddyAirControlPoint {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getAirPilotTargetLabel(element: HTMLElement) {
  const label =
    element.getAttribute("aria-label") ??
    element.getAttribute("title") ??
    element.textContent ??
    element.tagName.toLowerCase();

  return label.replace(/\s+/g, " ").trim().slice(0, 64) || element.tagName.toLowerCase();
}

export function getAirPilotTargetCenter(
  target: HTMLElement | null,
): OSBuddyAirControlPoint | null {
  if (!target || !isAirPilotSelectableElement(target)) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return getRectCenter(rect);
}

function toMagnetTarget(
  element: HTMLElement,
  rect: DOMRect,
): AirPilotMagnetTarget & { element: HTMLElement } {
  return {
    key: getAirPilotTargetKey(element),
    label: getAirPilotTargetLabel(element),
    center: getRectCenter(rect),
    rect: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    },
    element,
  };
}

export function resolveNearestAirPilotMagnetTarget(
  point: OSBuddyAirControlPoint,
  radius: number,
): (AirPilotMagnetTarget & { element: HTMLElement }) | null {
  if (typeof document === "undefined") return null;

  let best:
    | {
        distance: number;
        centerDistance: number;
        target: AirPilotMagnetTarget & { element: HTMLElement };
      }
    | null = null;

  const elements = Array.from(document.querySelectorAll(CLICKABLE_SELECTOR));
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if (!isAirPilotSelectableElement(element)) continue;

    for (const rect of getVisibleRects(element)) {
      const edgeDistance = distancePointToRect(point, rect);
      if (edgeDistance > radius) continue;

      const center = getRectCenter(rect);
      const centerDistance = Math.hypot(point.x - center.x, point.y - center.y);
      if (
        !best ||
        edgeDistance < best.distance ||
        (edgeDistance === best.distance && centerDistance < best.centerDistance)
      ) {
        best = {
          distance: edgeDistance,
          centerDistance,
          target: toMagnetTarget(element, rect),
        };
      }
    }
  }

  return best?.target ?? null;
}

export function clickAirPilotTarget(target: HTMLElement | null) {
  if (!target) return false;
  if (!isAirPilotSelectableElement(target)) return false;

  if (typeof target.focus === "function") {
    target.focus({ preventScroll: true });
  }
  target.click();
  return true;
}

export function setAirPilotHighlightedTarget(params: {
  previous: HTMLElement | null;
  next: HTMLElement | null;
}) {
  if (params.previous && params.previous !== params.next) {
    params.previous.classList.remove(AIRPILOT_TARGET_HIGHLIGHT_CLASS);
  }

  if (params.next) {
    params.next.classList.add(AIRPILOT_TARGET_HIGHLIGHT_CLASS);
  }

  return params.next;
}

function canScrollElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") {
    return false;
  }
  return element.scrollHeight > element.clientHeight + 1;
}

export function resolveAirPilotScrollTarget(point: OSBuddyAirControlPoint) {
  if (typeof document === "undefined") return null;

  const elements = document.elementsFromPoint(point.x, point.y);
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.closest(AIRPILOT_IGNORE_SELECTOR)) continue;

    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      if (canScrollElement(current)) return current;
      current = current.parentElement;
    }
  }

  return document.scrollingElement ?? document.documentElement;
}

export function scrollAirPilotTargetAtPoint(params: {
  point: OSBuddyAirControlPoint;
  deltaY: number;
}) {
  const target = resolveAirPilotScrollTarget(params.point);
  if (!target) return false;
  target.scrollBy({ top: params.deltaY, behavior: "auto" });
  return true;
}
