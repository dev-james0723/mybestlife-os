import { describe, expect, it } from "vitest";
import {
  createAirGrabState,
  DEFAULT_AIR_GRAB_CONFIG,
  stepAirGrab,
  type AirGrabState,
} from "./air-grab-machine";
import type { Hitbox } from "./geometry";
import type { AirTouchReading } from "./types";
import type { OSBuddyAirControlCommand, OSBuddyAirControlGesture } from "../os-buddy-air-control-types";

const hitbox: Hitbox = { x: 100, y: 100, width: 60, height: 80 };
const dockPoint = { x: 100, y: 100 };

function reading(over: Partial<AirTouchReading>): AirTouchReading {
  return {
    timestamp: 0,
    fingertip: { x: 0, y: 0 },
    isIndexExtended: true,
    gesture: "Index_Point",
    confidence: 0.9,
    mode: "2d",
    sensorMode: "rgb-webcam",
    ...over,
  };
}

function commandTypes(commands: OSBuddyAirControlCommand[]): string[] {
  return commands.map((c) => c.type);
}

/** Drive the machine with no smoothing surprises by using grabAlpha=1/hoverAlpha=1. */
const SHARP = { ...DEFAULT_AIR_GRAB_CONFIG, hoverAlpha: 1, grabAlpha: 1 };

describe("stepAirGrab — cursor & hover", () => {
  it("emits a cursor every usable frame and hovers inside the hitbox", () => {
    let s = createAirGrabState();
    // outside the hitbox -> tracking, cursor only
    let res = stepAirGrab(s, {
      reading: reading({ fingertip: { x: 500, y: 500 } }),
      hitbox,
      dockPoint,
      now: 0,
      config: SHARP,
    });
    expect(commandTypes(res.commands)).toEqual(["cursor"]);
    expect(res.next.state).toBe("tracking");

    // move inside -> hover
    s = res.next;
    res = stepAirGrab(s, {
      reading: reading({ fingertip: { x: 130, y: 140 } }),
      hitbox,
      dockPoint,
      now: 16,
      config: SHARP,
    });
    expect(commandTypes(res.commands)).toContain("hover");
    expect(res.next.state).toBe("hovering");
  });

  it("does not hover when the fingertip is just outside the padded hitbox", () => {
    const s = createAirGrabState();
    // hitbox right edge = 160; padding 36 -> 196. x=210 is outside.
    const res = stepAirGrab(s, {
      reading: reading({ fingertip: { x: 210, y: 140 } }),
      hitbox,
      dockPoint,
      now: 0,
      config: SHARP,
    });
    expect(res.next.state).toBe("tracking");
    expect(commandTypes(res.commands)).toEqual(["cursor"]);
  });
});

describe("stepAirGrab — dwell to grab", () => {
  const inside = { x: 130, y: 140 };

  it("grabs only after continuous dwell >= dwellMs", () => {
    let s = createAirGrabState();
    let res = stepAirGrab(s, { reading: reading({ fingertip: inside }), hitbox, dockPoint, now: 0, config: SHARP });
    s = res.next; // hovering, hoverSince=0
    expect(s.state).toBe("hovering");

    // 100ms later -> still hovering, no grab
    res = stepAirGrab(s, { reading: reading({ fingertip: inside }), hitbox, dockPoint, now: 100, config: SHARP });
    expect(res.next.state).toBe("hovering");
    expect(commandTypes(res.commands)).not.toContain("grab");

    // 200ms after hover start -> grab
    res = stepAirGrab(res.next, {
      reading: reading({ fingertip: inside }),
      hitbox,
      dockPoint,
      now: 200,
      config: SHARP,
    });
    expect(res.next.state).toBe("grabbed");
    const grab = res.commands.find((c) => c.type === "grab");
    expect(grab).toBeTruthy();
  });

  it("cancels the dwell if the cursor leaves before dwellMs", () => {
    let s = createAirGrabState();
    let res = stepAirGrab(s, { reading: reading({ fingertip: inside }), hitbox, dockPoint, now: 0, config: SHARP });
    s = res.next;
    // leave at 100ms
    res = stepAirGrab(s, { reading: reading({ fingertip: { x: 500, y: 500 } }), hitbox, dockPoint, now: 100, config: SHARP });
    expect(res.next.state).toBe("tracking");
    // re-enter at 150ms then reach 250ms total: dwell restarts at 150
    res = stepAirGrab(res.next, { reading: reading({ fingertip: inside }), hitbox, dockPoint, now: 150, config: SHARP });
    expect(res.next.state).toBe("hovering");
    res = stepAirGrab(res.next, { reading: reading({ fingertip: inside }), hitbox, dockPoint, now: 250, config: SHARP });
    // only 100ms since re-entry -> still hovering
    expect(res.next.state).toBe("hovering");
  });
});

describe("stepAirGrab — grab offset & drag", () => {
  it("records grabOffset and drags by offset (no recenter)", () => {
    let s = createAirGrabState();
    // grab at fingertip (130,140) over dock (100,100): offset (30,40)
    s = stepAirGrab(s, { reading: reading({ fingertip: { x: 130, y: 140 } }), hitbox, dockPoint, now: 0, config: SHARP }).next;
    const res = stepAirGrab(s, { reading: reading({ fingertip: { x: 130, y: 140 } }), hitbox, dockPoint, now: 200, config: SHARP });
    expect(res.next.grabOffset).toEqual({ x: 30, y: 40 });

    // now move the cursor; drag.point is the cursor (caller computes dock=point-offset)
    const dragRes = stepAirGrab(res.next, {
      reading: reading({ fingertip: { x: 300, y: 300 } }),
      hitbox,
      dockPoint,
      now: 240,
      config: SHARP,
    });
    expect(dragRes.next.state).toBe("dragging");
    const drag = dragRes.commands.find((c) => c.type === "drag");
    expect(drag).toBeTruthy();
    if (drag && drag.type === "drag") {
      expect(drag.point).toEqual({ x: 300, y: 300 });
    }
  });
});

function grabbedState(): AirGrabState {
  // hover -> grab quickly
  let s = createAirGrabState();
  s = stepAirGrab(s, { reading: reading({ fingertip: { x: 130, y: 140 } }), hitbox, dockPoint, now: 0, config: SHARP }).next;
  s = stepAirGrab(s, { reading: reading({ fingertip: { x: 130, y: 140 } }), hitbox, dockPoint, now: 200, config: SHARP }).next;
  return s;
}

describe("stepAirGrab — release semantics", () => {
  it("releases ONLY on open palm", () => {
    const s = grabbedState();
    const res = stepAirGrab(s, {
      reading: reading({ gesture: "Open_Palm", isIndexExtended: false, fingertip: null }),
      hitbox,
      dockPoint,
      now: 260,
      config: SHARP,
    });
    expect(res.next.state).toBe("tracking");
    expect(res.next.grabOffset).toBeNull();
    expect(commandTypes(res.commands)).toContain("release");
  });

  it("does not release on other gestures while grabbed", () => {
    const s = grabbedState();
    const gestures: OSBuddyAirControlGesture[] = ["Closed_Fist", "Victory", "Thumb_Up", "Pinch"];
    for (const gesture of gestures) {
      const res = stepAirGrab(s, {
        reading: reading({ gesture, fingertip: { x: 130, y: 140 } }),
        hitbox,
        dockPoint,
        now: 260,
        config: SHARP,
      });
      expect(commandTypes(res.commands)).not.toContain("release");
    }
  });
});

describe("stepAirGrab — hand loss freezes (never drops)", () => {
  it("pauses on hand loss but keeps the grab, then resumes", () => {
    const s = grabbedState();
    // hand lost
    const lost = stepAirGrab(s, {
      reading: reading({ fingertip: null, isIndexExtended: false, gesture: "None", confidence: 0 }),
      hitbox,
      dockPoint,
      now: 260,
      config: SHARP,
    });
    expect(lost.next.state).toBe("grabbed"); // frozen, still held
    expect(lost.next.grabOffset).not.toBeNull();
    expect(commandTypes(lost.commands)).toContain("pause");
    expect(commandTypes(lost.commands)).not.toContain("release");

    // pause is emitted once, not every frame
    const stillLost = stepAirGrab(lost.next, {
      reading: reading({ fingertip: null, isIndexExtended: false, gesture: "None", confidence: 0 }),
      hitbox,
      dockPoint,
      now: 320,
      config: SHARP,
    });
    expect(commandTypes(stillLost.commands)).not.toContain("pause");

    // hand returns -> resume
    const resumed = stepAirGrab(stillLost.next, {
      reading: reading({ fingertip: { x: 140, y: 150 } }),
      hitbox,
      dockPoint,
      now: 360,
      config: SHARP,
    });
    expect(commandTypes(resumed.commands)).toContain("resume");
    expect(resumed.next.lostSince).toBeNull();
  });

  it("pauses (not releases) on sustained low confidence", () => {
    const s = grabbedState();
    const res = stepAirGrab(s, {
      reading: reading({ fingertip: { x: 140, y: 150 }, confidence: 0.1 }),
      hitbox,
      dockPoint,
      now: 260,
      config: SHARP,
    });
    expect(res.next.state).toBe("grabbed");
    const pause = res.commands.find((c) => c.type === "pause");
    expect(pause && pause.type === "pause" ? pause.reason : null).toBe("low-confidence");
  });
});

describe("stepAirGrab — smoothing tiers", () => {
  it("uses the responsive grab alpha once grabbed", () => {
    // With default alphas: hover=0.18, grab=0.35. Grab, then a big jump should
    // move ~35% of the way (grab tier), proving the tier switch.
    const s = grabbedState();
    const res = stepAirGrab(s, {
      reading: reading({ fingertip: { x: 1130, y: 140 } }),
      hitbox,
      dockPoint,
      now: 240,
      config: DEFAULT_AIR_GRAB_CONFIG,
    });
    // previous smoothed x = 130; target 1130; grab alpha 0.35 -> ~480
    expect(res.next.smoothed!.x).toBeGreaterThan(400);
    expect(res.next.smoothed!.x).toBeLessThan(560);
  });
});
