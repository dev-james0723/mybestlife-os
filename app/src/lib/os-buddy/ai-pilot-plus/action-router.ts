import { pointInHitbox } from "../air-control/geometry";
import type {
  AIPilotPlusAction,
  AIPilotPlusIntent,
  AIPilotPlusPoint,
  AIPilotPlusRoutableAction,
  AIPilotPlusSurface,
  AIPilotPlusTarget,
} from "./types";

export type AIPilotPlusActionZone = {
  id: string;
  surface: AIPilotPlusSurface;
  rect: AIPilotPlusTarget["rect"];
  action: AIPilotPlusRoutableAction;
  disabled?: boolean;
  priority?: number;
};

export type RouteAIPilotPlusIntentContext = {
  surface: AIPilotPlusSurface;
  zones?: AIPilotPlusActionZone[];
  zonePaddingPx?: number;
};

function materializeRoutableAction(params: {
  action: AIPilotPlusRoutableAction;
  point: AIPilotPlusPoint;
  target?: AIPilotPlusTarget | null;
}): AIPilotPlusAction {
  const { action, point, target } = params;

  switch (action.type) {
    case "dom.click":
      return {
        type: "dom.click",
        point,
        target:
          target ??
          {
            id: "virtual-dom-target",
            kind: "dom",
            center: point,
            rect: { x: point.x, y: point.y, width: 1, height: 1 },
          },
      };
    case "brain.open-node":
      return { ...action, point };
    case "brain.focus-node":
      return { ...action, point };
    case "idea.capture.open":
      return { ...action, point };
    case "idea.open":
      return { ...action, point };
    case "project.open":
      return { ...action, point };
    case "project.move-card":
      return { ...action, point };
    case "play-ball.nudge":
      return { ...action, point };
    case "custom":
      return { ...action, point };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function resolveAIPilotPlusActionZone(params: {
  point: AIPilotPlusPoint;
  surface: AIPilotPlusSurface;
  zones: AIPilotPlusActionZone[];
  paddingPx?: number;
}): AIPilotPlusActionZone | null {
  const candidates = params.zones
    .filter((zone) => !zone.disabled)
    .filter((zone) => zone.surface === params.surface || zone.surface === "global")
    .filter((zone) => pointInHitbox(params.point, zone.rect, params.paddingPx ?? 0))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return candidates[0] ?? null;
}

export function routeAIPilotPlusIntent(
  intent: AIPilotPlusIntent,
  context: RouteAIPilotPlusIntentContext,
): AIPilotPlusAction[] {
  switch (intent.type) {
    case "lifecycle.stop":
      return [{ type: "airpilot.stop", reason: intent.reason }];
    case "target.select": {
      const zone = resolveAIPilotPlusActionZone({
        point: intent.point,
        surface: context.surface,
        zones: context.zones ?? [],
        paddingPx: context.zonePaddingPx,
      });
      const action = zone?.action ?? intent.target.action ?? { type: "dom.click" };
      return [
        materializeRoutableAction({
          action,
          point: intent.point,
          target: intent.target,
        }),
      ];
    }
    case "page.scroll":
      return [
        {
          type: "dom.scroll",
          point: intent.point,
          deltaY: intent.deltaY,
        },
      ];
    case "viewport.zoom":
      return [
        {
          type: "viewport.zoom",
          center: intent.center,
          scaleDelta: intent.scaleDelta,
        },
      ];
    case "tracking.cursor":
    case "target.hover":
      return [];
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}
