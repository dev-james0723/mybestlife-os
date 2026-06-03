import type { OSBuddyAirControlPoint } from "./os-buddy-air-control-types";

export const AIRPILOT_IGNORE_SELECTOR =
  '[data-airpilot-ignore="true"], .os-buddy-dock';
export const AIRPILOT_TARGET_HIGHLIGHT_CLASS = "os-buddy-airpilot-target-highlight";

const SELECTABLE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "summary",
  '[role="button"]',
  '[role="link"]',
  "[tabindex]",
].join(",");

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
  if (element.closest(AIRPILOT_IGNORE_SELECTOR)) return false;
  if (!element.matches(SELECTABLE_SELECTOR)) return false;
  if (isDisabledElement(element)) return false;
  if (!isVisibleElement(element)) return false;

  const tabindex = element.getAttribute("tabindex");
  if (tabindex != null && Number(tabindex) < 0) return false;

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
    if (element.closest(AIRPILOT_IGNORE_SELECTOR)) continue;
    const target = findAirPilotSelectableTarget(element);
    if (target) return target;
  }
  return null;
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
