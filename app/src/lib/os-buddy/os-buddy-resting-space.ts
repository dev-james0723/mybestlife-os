export const OS_BUDDY_RESTING_SPACE_DROPZONE_ID = "os-buddy-resting-space-dropzone";

export type OSBuddyRestingState = "resting" | "sleeping" | "headache";

export function isPointInsideOSBuddyRestingSpace(point: { x: number; y: number }): boolean {
  if (typeof document === "undefined") return false;
  const target = document.getElementById(OS_BUDDY_RESTING_SPACE_DROPZONE_ID);
  if (!target) return false;
  const rect = target.getBoundingClientRect();
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}
