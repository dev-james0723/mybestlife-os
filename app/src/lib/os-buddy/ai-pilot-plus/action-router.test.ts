import { describe, expect, it } from "vitest";
import {
  resolveAIPilotPlusActionZone,
  routeAIPilotPlusIntent,
  type AIPilotPlusActionZone,
} from "./action-router";
import type { AIPilotPlusIntent, AIPilotPlusTarget } from "./types";

const target: AIPilotPlusTarget = {
  id: "button-a",
  kind: "dom",
  center: { x: 120, y: 140 },
  rect: { x: 90, y: 120, width: 60, height: 40 },
};

function selectIntent(overrides: Partial<AIPilotPlusIntent> = {}): AIPilotPlusIntent {
  return {
    type: "target.select",
    target,
    point: target.center,
    gesture: "Index_Point",
    score: 1.2,
    ...overrides,
  } as AIPilotPlusIntent;
}

describe("AI Pilot Plus action router", () => {
  it("routes target select to a DOM click by default", () => {
    const actions = routeAIPilotPlusIntent(selectIntent(), {
      surface: "global",
    });

    expect(actions).toEqual([
      {
        type: "dom.click",
        point: target.center,
        target,
      },
    ]);
  });

  it("uses the highest-priority matching action zone", () => {
    const zones: AIPilotPlusActionZone[] = [
      {
        id: "low",
        surface: "brain",
        rect: { x: 90, y: 120, width: 80, height: 80 },
        action: { type: "brain.focus-node", nodeId: "node-1" },
        priority: 1,
      },
      {
        id: "high",
        surface: "brain",
        rect: { x: 90, y: 120, width: 80, height: 80 },
        action: { type: "brain.open-node", nodeId: "node-1" },
        priority: 10,
      },
    ];

    expect(
      resolveAIPilotPlusActionZone({
        point: target.center,
        surface: "brain",
        zones,
      })?.id,
    ).toBe("high");
    expect(
      routeAIPilotPlusIntent(selectIntent(), {
        surface: "brain",
        zones,
      }),
    ).toEqual([
      {
        type: "brain.open-node",
        nodeId: "node-1",
        point: target.center,
      },
    ]);
  });

  it("ignores disabled zones and falls back to the target action", () => {
    const projectTarget: AIPilotPlusTarget = {
      ...target,
      action: { type: "project.open", projectId: "project-1" },
    };
    const actions = routeAIPilotPlusIntent(
      selectIntent({ target: projectTarget }),
      {
        surface: "projects",
        zones: [
          {
            id: "disabled",
            surface: "projects",
            rect: { x: 90, y: 120, width: 80, height: 80 },
            action: { type: "project.open", projectId: "wrong-project" },
            disabled: true,
          },
        ],
      },
    );

    expect(actions).toEqual([
      {
        type: "project.open",
        projectId: "project-1",
        point: target.center,
      },
    ]);
  });

  it("routes lifecycle, scroll, and zoom intents", () => {
    expect(
      routeAIPilotPlusIntent(
        { type: "lifecycle.stop", reason: "closed-fist", gesture: "Closed_Fist" },
        { surface: "global" },
      ),
    ).toEqual([{ type: "airpilot.stop", reason: "closed-fist" }]);

    expect(
      routeAIPilotPlusIntent(
        {
          type: "page.scroll",
          point: { x: 100, y: 200 },
          deltaY: 24,
          gesture: "Open_Palm",
        },
        { surface: "global" },
      ),
    ).toEqual([{ type: "dom.scroll", point: { x: 100, y: 200 }, deltaY: 24 }]);

    expect(
      routeAIPilotPlusIntent(
        {
          type: "viewport.zoom",
          center: { x: 150, y: 120 },
          scaleDelta: 0.2,
          gesture: "Open_Palm",
        },
        { surface: "brain" },
      ),
    ).toEqual([{ type: "viewport.zoom", center: { x: 150, y: 120 }, scaleDelta: 0.2 }]);
  });
});
