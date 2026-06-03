import {
  normalizeAIPilotPlusPageContext,
  type AIPilotPlusPageContext,
} from "./interfaces";

export function resolveAIPilotPlusPageContextFromPathname(
  pathname: string | null | undefined,
): AIPilotPlusPageContext {
  if (!pathname) return "unknown";

  const segments = pathname.split("/").filter(Boolean);
  const routeSegments = segments[0]?.length === 2 || segments[0] === "zh-TW"
    ? segments.slice(1)
    : segments;
  const primary = routeSegments[0] ?? "";

  if (primary === "brain") return "brain";
  if (primary === "ideas" || primary === "idea-capture" || primary === "quick-save") {
    return "ideaCapture";
  }
  if (primary === "projects") return "project";
  if (primary === "os-buddy" && routeSegments[1] === "play-ball") return "playBall";

  return normalizeAIPilotPlusPageContext(primary);
}
