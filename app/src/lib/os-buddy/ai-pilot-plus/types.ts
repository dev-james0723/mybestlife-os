import type { Hitbox } from "../air-control/geometry";
import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlPoint,
  OSBuddyAirControlSensorMode,
} from "../os-buddy-air-control-types";

export type AIPilotPlusPoint = OSBuddyAirControlPoint;
export type AIPilotPlusVector = OSBuddyAirControlPoint;

export type AIPilotPlusSurface =
  | "global"
  | "brain"
  | "ideas"
  | "projects"
  | "play-ball"
  | "unknown";

export type AIPilotPlusTargetKind =
  | "dom"
  | "brain-node"
  | "idea"
  | "project-card"
  | "play-ball-zone"
  | "custom";

export type AIPilotPlusStopReason = "user-exit" | "closed-fist";

export type AIPilotPlusMode =
  | "inactive"
  | "tracking"
  | "locked"
  | "scrolling"
  | "cooldown";

export type AIPilotPlusRoutableAction =
  | { type: "dom.click" }
  | { type: "brain.open-node"; nodeId: string }
  | { type: "brain.focus-node"; nodeId: string }
  | { type: "idea.capture.open" }
  | { type: "idea.open"; ideaId: string }
  | { type: "project.open"; projectId: string }
  | { type: "project.move-card"; projectId: string; columnId: string }
  | { type: "play-ball.nudge"; velocity: AIPilotPlusVector }
  | { type: "custom"; name: string; payload?: Record<string, unknown> };

export type AIPilotPlusTarget = {
  id: string;
  kind: AIPilotPlusTargetKind;
  center: AIPilotPlusPoint;
  rect: Hitbox;
  label?: string;
  surface?: AIPilotPlusSurface;
  disabled?: boolean;
  action?: AIPilotPlusRoutableAction;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AIPilotPlusFrame = {
  now: number;
  active: boolean;
  handCount: number;
  gesture: OSBuddyAirControlGesture;
  confidence: number;
  sensorMode: OSBuddyAirControlSensorMode;
  cursor: AIPilotPlusPoint | null;
  rawCursor: AIPilotPlusPoint | null;
  palm: AIPilotPlusPoint | null;
  indexPalmVector: AIPilotPlusVector | null;
  primaryHand: OSBuddyAirControlHand | null;
  secondaryHand: OSBuddyAirControlHand | null;
  secondaryPalm: AIPilotPlusPoint | null;
  target: AIPilotPlusTarget | null;
  lockedTarget: AIPilotPlusTarget | null;
};

export type AIPilotPlusIntent =
  | {
      type: "lifecycle.stop";
      reason: AIPilotPlusStopReason;
      gesture: OSBuddyAirControlGesture;
    }
  | {
      type: "tracking.cursor";
      point: AIPilotPlusPoint;
      gesture: OSBuddyAirControlGesture;
    }
  | {
      type: "target.hover";
      target: AIPilotPlusTarget;
      point: AIPilotPlusPoint;
    }
  | {
      type: "target.select";
      target: AIPilotPlusTarget;
      point: AIPilotPlusPoint;
      gesture: OSBuddyAirControlGesture;
      score: number;
    }
  | {
      type: "page.scroll";
      point: AIPilotPlusPoint;
      deltaY: number;
      gesture: OSBuddyAirControlGesture;
    }
  | {
      type: "viewport.zoom";
      center: AIPilotPlusPoint;
      scaleDelta: number;
      gesture: OSBuddyAirControlGesture;
    };

export type AIPilotPlusAction =
  | {
      type: "airpilot.stop";
      reason: AIPilotPlusStopReason;
    }
  | {
      type: "dom.click";
      point: AIPilotPlusPoint;
      target: AIPilotPlusTarget;
    }
  | {
      type: "dom.scroll";
      point: AIPilotPlusPoint;
      deltaY: number;
    }
  | {
      type: "viewport.zoom";
      center: AIPilotPlusPoint;
      scaleDelta: number;
    }
  | {
      type: "brain.open-node";
      nodeId: string;
      point: AIPilotPlusPoint;
    }
  | {
      type: "brain.focus-node";
      nodeId: string;
      point: AIPilotPlusPoint;
    }
  | {
      type: "idea.capture.open";
      point: AIPilotPlusPoint;
    }
  | {
      type: "idea.open";
      ideaId: string;
      point: AIPilotPlusPoint;
    }
  | {
      type: "project.open";
      projectId: string;
      point: AIPilotPlusPoint;
    }
  | {
      type: "project.move-card";
      projectId: string;
      columnId: string;
      point: AIPilotPlusPoint;
    }
  | {
      type: "play-ball.nudge";
      velocity: AIPilotPlusVector;
      point: AIPilotPlusPoint;
    }
  | {
      type: "custom";
      name: string;
      point: AIPilotPlusPoint;
      payload?: Record<string, unknown>;
    };

export type AIPilotPlusConfig = {
  lockedArmMs: number;
  lockedTapTravelPx: number;
  lockedTapFlickPx: number;
  selectCooldownMs: number;
  scrollDeadzonePx: number;
  scrollScale: number;
  scrollMaxDeltaY: number;
  zoomDeadzonePx: number;
  zoomScale: number;
  zoomMaxScaleDelta: number;
};

export const DEFAULT_AI_PILOT_PLUS_CONFIG: AIPilotPlusConfig = {
  lockedArmMs: 100,
  lockedTapTravelPx: 8,
  lockedTapFlickPx: 5,
  selectCooldownMs: 450,
  scrollDeadzonePx: 6,
  scrollScale: 1.1,
  scrollMaxDeltaY: 72,
  zoomDeadzonePx: 10,
  zoomScale: 0.004,
  zoomMaxScaleDelta: 0.24,
};
