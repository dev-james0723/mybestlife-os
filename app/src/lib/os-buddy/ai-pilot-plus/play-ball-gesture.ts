import { distance2, pointInHitbox, type Hitbox } from "../air-control/geometry";
import type { AIPilotPlusPoint, AIPilotPlusVector } from "./types";

export type AIPilotPlusPlayBallZone =
  | "brain"
  | "idea"
  | "project"
  | "osBuddy"
  | "shortcut";

export type AIPilotPlusPlayBallSample = AIPilotPlusPoint & {
  at: number;
};

export type AIPilotPlusPlayBallZoneRect = {
  zone: AIPilotPlusPlayBallZone;
  rect: Hitbox;
};

export function isAIPilotPlusPointNearBall(params: {
  point: AIPilotPlusPoint | null;
  ballCenter: AIPilotPlusPoint;
  ballSize: number;
  paddingPx?: number;
}) {
  if (!params.point) return false;
  return (
    distance2(params.point, params.ballCenter) <=
    params.ballSize / 2 + (params.paddingPx ?? 34)
  );
}

export function getAIPilotPlusPlayBallZoneRects(viewport: {
  width: number;
  height: number;
}): AIPilotPlusPlayBallZoneRect[] {
  const zoneWidth = Math.max(96, viewport.width * 0.22);
  const zoneHeight = Math.max(96, viewport.height * 0.22);
  const centerWidth = Math.max(120, viewport.width * 0.24);
  const centerHeight = Math.max(108, viewport.height * 0.2);

  return [
    { zone: "brain", rect: { x: 0, y: 0, width: zoneWidth, height: zoneHeight } },
    {
      zone: "idea",
      rect: { x: viewport.width - zoneWidth, y: 0, width: zoneWidth, height: zoneHeight },
    },
    {
      zone: "project",
      rect: {
        x: viewport.width - zoneWidth,
        y: viewport.height - zoneHeight,
        width: zoneWidth,
        height: zoneHeight,
      },
    },
    {
      zone: "shortcut",
      rect: { x: 0, y: viewport.height - zoneHeight, width: zoneWidth, height: zoneHeight },
    },
    {
      zone: "osBuddy",
      rect: {
        x: viewport.width / 2 - centerWidth / 2,
        y: viewport.height / 2 - centerHeight / 2,
        width: centerWidth,
        height: centerHeight,
      },
    },
  ];
}

export function resolveAIPilotPlusPlayBallZone(params: {
  point: AIPilotPlusPoint;
  viewport: { width: number; height: number };
}): AIPilotPlusPlayBallZone | null {
  const zone = getAIPilotPlusPlayBallZoneRects(params.viewport).find((candidate) =>
    pointInHitbox(params.point, candidate.rect),
  );
  return zone?.zone ?? null;
}

export function getAIPilotPlusPlayBallThrowVelocity(params: {
  previous: AIPilotPlusPlayBallSample;
  current: AIPilotPlusPlayBallSample;
  maxVelocity?: number;
}): AIPilotPlusVector {
  const elapsed = Math.max(16, params.current.at - params.previous.at);
  const maxVelocity = params.maxVelocity ?? 24;
  const vx = ((params.current.x - params.previous.x) / elapsed) * 16;
  const vy = ((params.current.y - params.previous.y) / elapsed) * 16;

  return {
    x: Math.min(maxVelocity, Math.max(-maxVelocity, vx)),
    y: Math.min(maxVelocity, Math.max(-maxVelocity, vy)),
  };
}
